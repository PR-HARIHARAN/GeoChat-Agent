# pip install -U langchain-groq
# pip install langgraph python-dotenv

import os
from typing import TypedDict, Literal, Optional
from langchain.chains import LLMChain
from langchain.prompts import ChatPromptTemplate
from langchain_groq import ChatGroq
from langgraph.graph import StateGraph, END
import re
from geopy.geocoders import Nominatim
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

# Get Groq API key from environment variable
groq_api_key = os.getenv("GROQ_API_KEY")
if not groq_api_key:
    raise ValueError("GROQ_API_KEY environment variable is not set")

# Initialize Groq LLM
groq_llm = ChatGroq(
    api_key=groq_api_key,
    model_name="llama3-70b-8192"
)

# Agent returns
from logging import Manager
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
intent_chain = LLMChain(prompt=intent_prompt, llm=groq_llm)


def intent_node(state: AgentState) -> AgentState:
    result = intent_chain.invoke({"input": state["input"]})
    print("[LLM intent Agent reply]", result)
    return {**state, "intent": result['text'].strip().lower()}

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
geo_chain = LLMChain(prompt=geo_prompt, llm=groq_llm)



def geo_query_node(state: AgentState) -> AgentState:
    result = geo_chain.invoke({"input": state["input"]})
    answer = result['text'].strip()

    print("[LLM geo_query reply]", answer)

    if "ASK_LOCATION" in answer:
        print("🤖: Please provide the location you're interested in.")
        return {**state}  # Stay in same node until user replies

    if "ASK_ANALYSIS" in answer:
        print("🤖: May I assist with flood vulnerability, site suitability, or something else?")
        return {**state}

    # Extract location and analysis from LLM output
    location_match = re.search(r"Location:\s*(.+)", answer)
    analysis_match = re.search(r"Analysis:\s*(.+)", answer)

    location = location_match.group(1).strip() if location_match else None
    analysis = analysis_match.group(1).strip() if analysis_match else None

    return {
        **state,
        "location": location,
        "analysis": analysis
    }


def location_helper_node(state: AgentState) -> AgentState:
    geolocator = Nominatim(user_agent="geo_agent")
    location = geolocator.geocode(state["location"])
    if location:
        lat, lon = location.latitude, location.longitude
        print(f"📍 Located: {state['location']} → ({lat}, {lon})")
        return {**state, "lat": lat, "lon": lon}
    else:
        print("⚠️ Could not find location.")
        return {**state}

# Flood Vulnerability
def flood_vulnerability(lat, lon):
    import ee
    import geemap

    ee.Authenticate()

    # Initialize Earth Engine only if not already initialized
    try:
        ee.Initialize(project='ee-flood-prone-areas')
    except Exception as e:
        print(f"Earth Engine already initialized or error initializing: {e}")

    # https://en.wikipedia.org/wiki/Universal_Transverse_Mercator_coordinate_system
    longitude_img = ee.Image.pixelLonLat().select('longitude')
    utm_zones = longitude_img.add(180).divide(6).int()
    m = geemap.Map()

    # Load an image.
    dataset = ee.ImageCollection('JRC/CEMS_GLOFAS/FloodHazard/v1')
    depth = dataset.select('depth')
    depthVis = {
      'min': 0,
      'max': 1,
      'palette': ['ffffff','0000ff'],
    }

    # Create a point from the input coordinates
    point = ee.Geometry.Point(lon, lat)

    # Create a buffer around the point (e.g., 10000 meters or 10 km)
    buffer_size = 100000  # in meters
    buffered_area = point.buffer(buffer_size)

    # Clip the depth layer to the buffered area
    clipped_depth = depth.mean().clip(buffered_area)

    m.setCenter(lon, lat, 7);

    # Add the clipped layer to the map
    m.addLayer(clipped_depth, depthVis, f'Flood Hazard in {buffer_size/1000} km Buffer')

    # Center the map on the buffered area
    m.centerObject(buffered_area, 10)

    # Your actual mapping logic (chandru)
    return f"Flood vulnerability map for coordinates: ({lat}, {lon})" , m



def flood_vulnerability_node(state: AgentState) -> AgentState:
    lat, lon = state["lat"], state["lon"]
    result, map_obj = flood_vulnerability(lat, lon)
    print("✅ Returning map from flood_vulnerability_node")
    return {**state, "final_result": result, "map_object": map_obj}



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
result = graph.invoke({f"input": input()})
print("✅ Final Result:", result["final_result"])
print("🧪 Keys in result:", result.keys())
print(result)
display(result["map_object"])