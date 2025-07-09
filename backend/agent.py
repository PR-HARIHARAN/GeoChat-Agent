# pip install -U langchain-groq
# pip install langgraph python-dotenv

import logging
import os
import re
from typing import Dict, List, Literal, Optional, Tuple, TypedDict, Any

import ee
import geemap
import geemap.colormaps as cm
from dotenv import load_dotenv
from geopy.geocoders import Nominatim
from langchain_core.messages import HumanMessage, SystemMessage
from langchain.prompts import ChatPromptTemplate
from langchain_groq import ChatGroq
from langgraph.graph import StateGraph, END
from pydantic import SecretStr

# Load environment variables from .env file
load_dotenv()

# Set up logger
logger = logging.getLogger(__name__)

# Get Groq API key from environment variable
groq_api_key = os.getenv("GROQ_API_KEY")
if not groq_api_key:
    raise ValueError("GROQ_API_KEY environment variable is not set")

# Initialize Groq LLM
groq_llm = ChatGroq(
    api_key=SecretStr(groq_api_key),
    model="llama3-70b-8192"
)

# Agent returns
class AgentState(TypedDict):
    input: str
    intent: Optional[Literal["normal", "query"]]
    location: Optional[str]
    analysis: Optional[str]
    lat: Optional[float]
    lon: Optional[float]
    final_result: Optional[str]
    map_object: Optional[map]

# Prompt to classify the query
intent_prompt = ChatPromptTemplate.from_template(
    """
    Classify this input:
    If the user is chatting normally, output 'normal'.
    If they want a geospatial query (maps, location, analysis), output 'query'.

    Input: {input}
    """
)
#intent_chain = LLMChain(prompt=intent_prompt, llm=groq_llm)
intent_chain = intent_prompt | groq_llm

def intent_node(state: AgentState) -> AgentState:
    result = intent_chain.invoke({"input": state["input"]})
    print("[LLM intent Agent reply]", result)
    # result is a dict with 'text' key if using LLMChain, but with RunnableSequence, it's just the output
    text = result.get('text') if isinstance(result, dict) and 'text' in result else str(result)
    text = text.strip() if text else ''
    # Only allow 'normal' or 'query' for intent
    intent = text if text in ('normal', 'query') else None
    return {**state, "intent": intent}

# Chat Prompt
geo_prompt = ChatPromptTemplate.from_template(
    """
    Extract:
    - Location: the place/city/region
    - Analysis: flood vulnerability, site suitability, etc.

    If location is missing, reply with 'ASK_LOCATION'.
    If analysis is missing, reply with 'ASK_ANALYSIS'.
    If both present, reply with 'OK'.

    User: {input}
    """
)
#geo_chain = LLMChain(prompt=geo_prompt, llm=groq_llm)
geo_chain = geo_prompt | groq_llm

def geo_query_node(state: AgentState) -> AgentState:
    result = geo_chain.invoke({"input": state["input"]})
    answer = result.content if hasattr(result, 'content') else str(result)
    answer = answer.strip() if answer else ''

    print("[LLM geo_query reply]", answer)

    if "ASK_LOCATION" in answer:
        print("🤖: Please provide the location you're interested in.")
        return {**state}  # Stay in same node until user replies

    if "ASK_ANALYSIS" in answer:
        print("🤖: May I assist with flood vulnerability, site suitability, or something else?")
        return {**state}

    # Improved location and analysis extraction
    location = None
    analysis = None
    
    # Split the response into lines and process each line
    for line in answer.split('\n'):
        line = line.strip()
        if line.lower().startswith('location:'):
            location = line.split(':', 1)[1].strip()
        elif line.lower().startswith('analysis:'):
            analysis = line.split(':', 1)[1].strip()
        # Also handle case where the response is just the location
        elif not location and line and not any(x in line.lower() for x in ['analysis:', 'reply:']):
            location = line

    print(f"[DEBUG] Extracted location: '{location}', analysis: '{analysis}'")

    return {
        **state,
        "location": location,
        "analysis": analysis
    }


def location_helper_node(state: AgentState) -> AgentState:
    if not state.get("location"):
        print("⚠️ No location provided for geocoding")
        return state
        
    try:
        geolocator = Nominatim(user_agent="disaster_eye_agent")
        location = geolocator.geocode(state["location"] + ", India")  # Adding country for better accuracy
        
        if location:
            lat, lon = location.latitude, location.longitude
            print(f"📍 Located: {state['location']} → ({lat}, {lon})")
            return {**state, "lat": lat, "lon": lon}
        else:
            print(f"⚠️ Could not find coordinates for location: {state['location']}")
            return state
            
    except Exception as e:
        print(f"⚠️ Error during geocoding: {str(e)}")
        return state

# Flood Vulnerability
def flood_vulnerability(lat: float, lon: float, location_name: str = None) -> Tuple[str, Any]:
    """
    Generate a flood vulnerability map using JRC Global Flood Hazard data.
    Returns a tuple of (analysis_text, map_object)
    """
    try:
        logger.info(f"Starting flood vulnerability analysis for {lat}, {lon}")
        
        # Initialize the map centered on the location
        m = geemap.Map(center=[lat, lon], zoom=12)
        
        # Add base map
        m.add_basemap("SATELLITE")
        
        # Create a point from the input coordinates
        point = ee.Geometry.Point([lon, lat])
        
        # Create a buffer around the point (10km radius for analysis)
        buffer_size = 10000  # 10km in meters
        buffered_area = point.buffer(buffer_size)
        
        try:
            # Load JRC Global Flood Hazard dataset
            dataset = ee.ImageCollection('JRC/CEMS_GLOFAS/FloodHazard/v1')
            
            # Get the flood depth layer (0-1m)
            flood_depth = dataset.select('depth').mosaic()
            
            # Clip to the area of interest
            clipped_flood = flood_depth.clip(buffered_area)
            
            # Add the flood hazard layer with a blue color scale
            m.addLayer(clipped_flood, {
                'min': 0,
                'max': 1,
                'palette': ['#ffffff', '#0000ff'],  # White to blue
                'opacity': 0.7
            }, 'Flood Hazard (0-1m depth)')
            
            # Add terrain data for context
            elevation = ee.Image('USGS/SRTMGL1_003').select('elevation')
            m.addLayer(elevation.clip(buffered_area), {
                'min': 0,
                'max': 100,
                'palette': ['blue', 'green', 'brown', 'white'],
                'opacity': 0.6
            }, 'Elevation (m)')
            
            # Add a point for the selected location
            m.addLayer(point, {'color': 'red'}, 'Selected Location')
            
            # Generate analysis report
            stats = clipped_flood.reduceRegion(
                reducer=ee.Reducer.mean(),
                geometry=buffered_area,
                scale=90  # ~90m resolution
            ).getInfo()
            
            # Get flood depth value (0-1)
            flood_value = stats.get('depth', 0)
            
            # Determine risk level based on flood depth
            if flood_value > 0.5:
                risk_level = "High"
                recommendation = "This area has high flood risk. Avoid construction and consider flood mitigation measures."
            elif flood_value > 0.2:
                risk_level = "Moderate"
                recommendation = "This area has moderate flood risk. Consider flood-resistant construction."
            else:
                risk_level = "Low"
                recommendation = "This area has low flood risk, but stay informed about local conditions."
            
            analysis_text = f"""
            ## Flood Hazard Assessment for {location_name or 'Selected Location'}
            **Coordinates:** {lat:.4f}, {lon:.4f}
            **Flood Risk Level:** {risk_level}
            **Flood Depth Index (0-1):** {flood_value:.2f}
            
            ### Key Findings:
            - Blue areas indicate potential flood hazard zones (0-1m depth)
            - Darker blue shows higher flood risk areas
            - Elevation data provides additional context
            
            ### Recommendations:
            {recommendation}
            - Monitor local flood warnings and advisories
            - Consult local authorities for detailed flood risk information
            - Consider flood insurance if available in your area
            """
            
            # Fit the map to the buffered area
            m.centerObject(buffered_area, 12)
            
            return analysis_text, m
            
        except Exception as e:
            logger.error(f"Error in flood analysis: {str(e)}")
            # Fallback to basic map if analysis fails
            m.addLayer(point, {'color': 'red'}, 'Selected Location')
            return f"Basic map for ({lat}, {lon}). Error in flood analysis: {str(e)}", m
            
    except Exception as e:
        error_msg = f"Error in flood_vulnerability: {str(e)}"
        logger.error(error_msg)
        return error_msg, None


def flood_vulnerability_node(state: AgentState) -> AgentState:
    if not state.get("lat") or not state.get("lon"):
        error_msg = "Missing coordinates for flood analysis"
        logger.error(error_msg)
        return {
            **state,
            "final_result": error_msg,
            "map_data": {
                "center": {"lat": 11.0168, "lng": 76.9558},  # Default coordinates
                "zoom": 12,
                "error": error_msg
            }
        }
        
    lat, lon = state["lat"], state["lon"]
    location_name = state.get("location", "Selected Location")
    
    logger.info(f"Analyzing flood vulnerability for {location_name} ({lat:.4f}, {lon:.4f})")
    
    try:
        analysis_text, map_obj = flood_vulnerability(lat, lon, location_name)
        logger.info("Flood vulnerability analysis completed successfully")
        
        # Get the map ID and token for the flood risk layer
        try:
            # Get the map ID and token for the flood risk layer
            flood_risk_map = map_obj.layers[2]  # Assuming flood risk is the third layer
            flood_risk_url = flood_risk_map.url
            
            # Get the water occurrence layer
            water_occurrence_map = map_obj.layers[3]  # Assuming water occurrence is the fourth layer
            water_occurrence_url = water_occurrence_map.url
            
            # Get the elevation layer
            elevation_map = map_obj.layers[4]  # Assuming elevation is the fifth layer
            elevation_url = elevation_map.url
            
            # Prepare map data for the frontend with actual tile URLs
            map_data = {
                "center": {"lat": lat, "lng": lon},
                "zoom": 12,
                "analysis": "flood_vulnerability",
                "layers": [
                    {
                        "name": "Satellite",
                        "url": "https://mt1.google.com/vt/lyrs=s&x={x}&y={y}&z={z}",
                        "attribution": "Google Satellite",
                        "visible": True,
                        "type": "raster"
                    },
                    {
                        "name": "Flood Risk",
                        "url": flood_risk_url,
                        "attribution": "Google Earth Engine",
                        "visible": True,
                        "type": "raster",
                        "minZoom": 0,
                        "maxZoom": 18
                    },
                    {
                        "name": "Water Occurrence",
                        "url": water_occurrence_url,
                        "attribution": "JRC Global Surface Water",
                        "visible": True,
                        "type": "raster",
                        "minZoom": 0,
                        "maxZoom": 18,
                        "opacity": 0.5
                    },
                    {
                        "name": "Elevation",
                        "url": elevation_url,
                        "attribution": "SRTM Elevation",
                        "visible": True,
                        "type": "raster",
                        "minZoom": 0,
                        "maxZoom": 18,
                        "opacity": 0.6
                    }
                ],
                "markers": [
                    {
                        "position": {"lat": lat, "lng": lon},
                        "popup": location_name,
                        "color": "red"
                    }
                ]
            }
        except Exception as e:
            logger.error(f"Error preparing map data: {str(e)}")
            # Fallback to basic map data if there's an error
            map_data = {
                "center": {"lat": lat, "lng": lon},
                "zoom": 12,
                "error": "Could not load map layers. Please try again.",
                "markers": [{"position": {"lat": lat, "lng": lon}, "popup": location_name}]
            }
        
        return {
            **state,
            "final_result": analysis_text,
            "map_object": map_obj,
            "map_data": map_data
        }
        
    except Exception as e:
        error_msg = f"Error in flood vulnerability analysis: {str(e)}"
        logger.error(error_msg, exc_info=True)
        return {
            **state,
            "final_result": error_msg,
            "map_object": None,
            "map_data": {
                "center": {"lat": lat, "lng": lon},
                "zoom": 12,
                "error": error_msg,
                "markers": [{"position": {"lat": lat, "lng": lon}, "popup": location_name}]
            }
        }


workflow = StateGraph(AgentState)

workflow.add_node("intent", intent_node)
workflow.add_node("geo_query", geo_query_node)
workflow.add_node("location_helper", location_helper_node)
workflow.add_node("flood_vulnerability", flood_vulnerability_node)


workflow.add_conditional_edges(
    "intent",
    lambda state: "END" if state["intent"] == "normal" else "geo_query"
)


workflow.add_edge("geo_query", "location_helper")
workflow.add_edge("location_helper", "flood_vulnerability")
workflow.add_edge("flood_vulnerability", END)

workflow.set_entry_point("intent")
graph = workflow.compile()

if __name__ == "__main__":
    try:
        user_input = input("Enter your query: ")
        result = graph.invoke({"input": user_input})
        print("✅ Final Result:", result["final_result"])
        print("🧪 Keys in result:", result.keys())
        print(result)
        if "map_object" in result and result["map_object"] is not None:
            try:
                from IPython.display import display
                display(result["map_object"])
            except ImportError:
                print("Map object available but IPython display not available")
    except Exception as e:
        print(f"Error: {e}")