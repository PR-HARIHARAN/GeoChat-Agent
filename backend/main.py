from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, Response
import uvicorn
from datetime import datetime, timedelta
import json
import os
import logging
import importlib
import ee
import geemap
from typing import Optional, Dict, Any

def initialize_earth_engine() -> None:
    """Initialize Earth Engine with service account credentials if available."""
    try:
        if config.GOOGLE_APPLICATION_CREDENTIALS and os.path.exists(config.GOOGLE_APPLICATION_CREDENTIALS):
            credentials = ee.ServiceAccountCredentials(
                email=config.EE_SERVICE_ACCOUNT,
                key_file=config.GOOGLE_APPLICATION_CREDENTIALS
            )
            ee.Initialize(credentials)
            logger.info("Earth Engine initialized with service account")
        else:
            # Fall back to default initialization if service account not configured
            ee.Initialize()
            logger.info("Earth Engine initialized with default credentials")
    except Exception as e:
        logger.error(f"Failed to initialize Earth Engine: {str(e)}")
        try:
            # Try to authenticate interactively as fallback
            ee.Authenticate()
            ee.Initialize()
            logger.info("Earth Engine initialized with interactive authentication")
        except Exception as auth_error:
            logger.error(f"Failed to authenticate Earth Engine: {auth_error}")
            raise HTTPException(
                status_code=500,
                detail=f"Failed to initialize Earth Engine: {str(auth_error)}"
            )

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler(),
        logging.FileHandler('earth_engine_realtime.log')
    ]
)
logger = logging.getLogger(__name__)

from config import config
from models.data_models import (
    QueryRequest, LocationAnalysisRequest, AnalysisResponse, 
    MapLayersResponse, RegionalAnalysisRequest, Coordinates
)
from services.geospatial_service import geospatial_service

# Initialize FastAPI app
app = FastAPI(
    title="Disaster Eye Earth Engine API",
    description="Geospatial disaster analysis using Google Earth Engine and AI",
    version="1.0.0"
)

# Initialize app state for storing maps
class AppState:
    def __init__(self):
        self.current_maps = {}
        self.request_count = 0
        self.last_request_time = None

app.state = AppState()

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=config.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["*"],
)

@app.get("/")
async def root():
    """API health check"""
    logger.info("🌐 Health check request received")
    return {
        "message": "Disaster Eye Earth Engine API",
        "status": "active",
        "timestamp": datetime.now().isoformat(),
        "earth_engine_status": geospatial_service.ee_service.initialized
    }

@app.get("/health")
async def health_check():
    """Detailed health check"""
    logger.info(" Detailed health check request received")
    return {
        "api_status": "healthy",
        "earth_engine_initialized": geospatial_service.ee_service.initialized,
        "ai_service_available": geospatial_service.ai_service.available,
        "timestamp": datetime.now().isoformat()
    }

@app.post("/api/earth-engine/query", response_model=AnalysisResponse)
async def process_natural_query(request: QueryRequest):
    """Process natural language query with optional location"""
    
    logger.info(f"Natural query request: {request.query}")
    if request.coordinates:
        logger.info(f"Location provided: lat={request.coordinates.lat}, lng={request.coordinates.lng}")
    
    try:
        if request.coordinates:
            # Process location-based query
            result = geospatial_service.process_location_query(
                lat=request.coordinates.lat,
                lng=request.coordinates.lng,
                query=request.query
            )
        else:
            # Process general query without specific location
            ai_analysis = geospatial_service.ai_service.process_natural_query(request.query)
            result = {
                'timestamp': datetime.now().isoformat(),
                'status': 'completed',
                'ai_analysis': ai_analysis,
                'coordinates': {'lat': config.DEFAULT_LAT, 'lng': config.DEFAULT_LNG}
            }
        
        logger.info(f"Query processed successfully")
        return AnalysisResponse(**result)
        
    except Exception as e:
        logger.error(f"Query processing failed: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Query processing failed: {str(e)}")

@app.post("/api/earth-engine/analyze-location")
async def analyze_location(request: LocationAnalysisRequest):
    """Analyze specific location for disaster vulnerability"""
    
    logger.info(f" Location analysis request: lat={request.coordinates.lat}, lng={request.coordinates.lng}")
    
    try:
        result = geospatial_service.process_location_query(
            lat=request.coordinates.lat,
            lng=request.coordinates.lng,
            query="Comprehensive disaster vulnerability analysis" if request.include_ai else None
        )
        
        logger.info(f" Location analysis completed successfully")
        return AnalysisResponse(**result)
        
    except Exception as e:
        logger.error(f"Location analysis failed: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Location analysis failed: {str(e)}")

@app.get("/api/earth-engine/map-layers")
async def get_map_layers(lat: float = config.DEFAULT_LAT, lng: float = config.DEFAULT_LNG, zoom: int = 10):
    """Get Earth Engine map layers for visualization"""
    
    logger.info(f" Map layers request: lat={lat}, lng={lng}, zoom={zoom}")
    
    try:
        result = geospatial_service.get_map_layers(lat, lng, zoom)
        logger.info(f"Map layers retrieved successfully")
        return MapLayersResponse(**result)
        
    except Exception as e:
        logger.error(f" Failed to get map layers: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to get map layers: {str(e)}")

@app.post("/api/earth-engine/regional-analysis")
async def analyze_region(request: RegionalAnalysisRequest):
    """Analyze a rectangular region for disaster risk"""
    
    logger.info(f" Regional analysis request: bounds={request.bounds.dict()}, type={request.analysis_type}")
    
    try:
        result = geospatial_service.get_regional_analysis(
            bounds=request.bounds.dict(),
            analysis_type=request.analysis_type
        )
        
        logger.info(f" Regional analysis completed successfully")
        return AnalysisResponse(**result)
        
    except Exception as e:
        logger.error(f" Regional analysis failed: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Regional analysis failed: {str(e)}")

@app.get("/api/earth-engine/flood-analysis")
async def get_flood_analysis(lat: float, lng: float, radius: float = 5000):
    """Get flood analysis for specific coordinates"""
    
    logger.info(f" Flood analysis request: lat={lat}, lng={lng}, radius={radius}")
    
    try:
        if not geospatial_service.ee_service.initialized:
            logger.error(" Earth Engine not initialized for flood analysis")
            raise HTTPException(status_code=503, detail="Earth Engine not initialized")
        
        result = geospatial_service.ee_service.get_flood_analysis(lat, lng, radius)
        logger.info(f" Flood analysis completed: risk_level={result.get('risk_level', 'Unknown')}")
        return result
        
    except Exception as e:
        logger.error(f" Flood analysis failed: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Flood analysis failed: {str(e)}")

@app.get("/api/earth-engine/building-analysis")
async def get_building_analysis(lat: float, lng: float, radius: float = 2000):
    """Get building analysis for specific coordinates"""
    
    logger.info(f" Building analysis request: lat={lat}, lng={lng}, radius={radius}")
    
    try:
        if not geospatial_service.ee_service.initialized:
            logger.error(" Earth Engine not initialized for building analysis")
            raise HTTPException(status_code=503, detail="Earth Engine not initialized")
        
        result = geospatial_service.ee_service.get_building_analysis(lat, lng, radius)
        logger.info(f" Building analysis completed: total_buildings={result.get('total_buildings', 0)}")
        return result
        
    except Exception as e:
        logger.error(f" Building analysis failed: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Building analysis failed: {str(e)}")

@app.get("/api/earth-engine/live-layers")
async def get_live_layers(lat: float, lng: float, zoom: int = 12):
    """Get Earth Engine live layers for frontend visualization"""
    try:
        # Initialize Earth Engine
        initialize_earth_engine()

        # Create a map centered on the provided coordinates
        m = geemap.Map(center=[lat, lng], zoom=zoom)
        
        # Add base map
        m.add_basemap("SATELLITE")
        
        # Create a point from the input coordinates
        point = ee.Geometry.Point([lng, lat])
        
        # Create a buffer around the point (10km radius)
        buffered_area = point.buffer(10000)  # 10km in meters
        
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
            'palette': ['#ffffff', '#0000ff'],
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
        
        # Get the map ID and token for each layer
        layers = []
        for i, layer in enumerate(m.layers):
            if hasattr(layer, 'url'):
                layers.append({
                    'id': f'layer-{i}',
                    'name': layer.name,
                    'url': layer.url,
                    'type': 'raster',
                    'visible': True,
                    'opacity': 0.7 if 'Flood' in layer.name else 0.6
                })
        
        # Prepare the response
        response = {
            'center': {'lat': lat, 'lng': lng},
            'zoom': zoom,
            'layers': layers,
            'markers': [{
                'position': {'lat': lat, 'lng': lng},
                'popup': 'Selected Location',
                'color': 'red'
            }]
        }
        
        return response
        
    except Exception as e:
        logger.error(f"Error in get_live_layers: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/earth-engine/test-map")
async def get_test_map():
    """Get Earth Engine test map data for frontend visualization"""
    try:
        # Initialize Earth Engine
        initialize_earth_engine()

        # Create a map centered on default location (India)
        center_lat, center_lng = 20.5937, 78.9629
        m = geemap.Map(center=[center_lat, center_lng], zoom=5)
        
        # Add base map
        m.add_basemap("SATELLITE")
        
        # Add a sample Earth Engine layer (Global Surface Water)
        dataset = ee.ImageCollection('JRC/GSW1_4/GlobalSurfaceWater')
        occurrence = dataset.select('occurrence').mosaic()
        
        # Add the water occurrence layer
        m.addLayer(occurrence, {
            'min': 0,
            'max': 100,
            'palette': ['#ffffff', '#0000ff'],
            'opacity': 0.7
        }, 'Water Occurrence')
        
        # Add a point for the default location
        point = ee.Geometry.Point([center_lng, center_lat])
        m.addLayer(point, {'color': 'red'}, 'Default Location')
        
        # Get the map ID and token for each layer
        layers = []
        for i, layer in enumerate(m.layers):
            if hasattr(layer, 'url'):
                layers.append({
                    'id': f'layer-{i}',
                    'name': layer.name,
                    'url': layer.url,
                    'type': 'raster',
                    'visible': True,
                    'opacity': 0.7
                })
        
        # Prepare the response
        response = {
            'status': 'success',
            'center': {'lat': center_lat, 'lng': center_lng},
            'zoom': 5,
            'layers': layers,
            'markers': [{
                'position': {'lat': center_lat, 'lng': center_lng},
                'popup': 'Default Location',
                'color': 'red'
            }],
            'timestamp': datetime.now().isoformat()
        }
        
        return response
            
    except Exception as e:
        error_msg = f"Error in get_test_map: {str(e)}"
        logger.error(error_msg)
        return {
            'status': 'error',
            'message': error_msg,
            'timestamp': datetime.now().isoformat()
        }

@app.exception_handler(500)
async def internal_error_handler(request: Request, exc: Exception):
    """Handle 500 errors"""
    logger.error(f"Unexpected error: {str(exc)}", exc_info=True)
    return JSONResponse(
        status_code=500,
        content={
            "status": "error",
            "message": "An unexpected error occurred while processing your request.",
            "details": str(exc) if config.DEBUG else "Internal server error"
        }
    )
@app.post("/api/agent")
async def agent_endpoint(request: Request):
    """Handle agent queries from the frontend"""
    try:
        data = await request.json()
        user_input = data.get("input", "")
        location = data.get("location") or {}
        
        logger.info(f"Agent request received - Input: {user_input}, Location: {location}")
        
        # Initialize the agent state with default values
        state = {
            "input": user_input,
            "intent": None,
            "location": location.get("name") if isinstance(location, dict) else str(location),
            "analysis": None,
            "lat": location.get("lat") if isinstance(location, dict) else None,
            "lon": location.get("lng") if isinstance(location, dict) else None,
            "final_result": None,
            "map_object": None,
            "map_data": None
        }
        
        try:
            # Process the input through the agent workflow
            from agent import graph
            result = graph.invoke(state)
            logger.info(f"Agent processing completed - Result: {result}")
            
            # Prepare the response with default values
            response_data = {
                "status": "success",
                "text": result.get("final_result", "Analysis completed"),
                "analysis": result.get("analysis"),
                "location": {
                    "name": result.get("location", "Unknown Location"),
                    "lat": result.get("lat"),
                    "lng": result.get("lon")
                },
                "map_data": result.get("map_data", {
                    "center": {"lat": result.get("lat", 11.0168), "lng": result.get("lon", 76.9558)},
                    "zoom": 12,
                    "layers": [],
                    "markers": []
                })
            }
            
            # Process map object if available
            if "map_object" in result and result["map_object"] is not None:
                try:
                    # If the map object has a _to_dict method (geemap case)
                    if hasattr(result["map_object"], '_to_dict'):
                        map_info = result["map_object"]._to_dict()
                        if isinstance(map_info, dict) and 'mapid' in map_info and 'token' in map_info:
                            if "layers" not in response_data["map_data"]:
                                response_data["map_data"]["layers"] = []
                            
                            # Add the Earth Engine layer
                            response_data["map_data"]["layers"].append({
                                "type": "ee_tile_layer",
                                "name": "Flood Analysis",
                                "visible": True,
                                "url": f"https://earthengine.googleapis.com/v1alpha/{map_info['mapid']}/tiles/{{z}}/{{x}}/{{y}}",
                                "attribution": "Google Earth Engine",
                                "token": map_info['token']
                            })
                    
                except Exception as e:
                    logger.warning(f"Could not process map object: {str(e)}")
            
            # Ensure we have a center point
            if "center" not in response_data["map_data"] and all(k in result for k in ["lat", "lon"]):
                response_data["map_data"]["center"] = {
                    "lat": result["lat"],
                    "lng": result["lon"]
                }
            
            # Log the response being sent to the frontend
            logger.info(f"Sending response to frontend: {response_data}")
            
            return JSONResponse(content=response_data)
            
        except Exception as agent_error:
            logger.error(f"Agent processing error: {str(agent_error)}", exc_info=True)
            # Return a helpful error response with default coordinates
            return JSONResponse(
                status_code=500,
                content={
                    "status": "error",
                    "message": "Error processing your request. Please try again.",
                    "map_data": {
                        "center": {
                            "lat": location.get("lat", config.DEFAULT_LAT),
                            "lng": location.get("lng", config.DEFAULT_LNG)
                        },
                        "zoom": 10
                    }
                }
            )
            
    except Exception as e:
        logger.error(f"Agent error: {str(e)}", exc_info=True)
        return JSONResponse(
            status_code=500,
            content={
                "status": "error", 
                "message": f"Agent processing failed: {str(e)}",
                "text": "I'm sorry, I encountered an error processing your request. Please try again."
            }
        )

@app.get("/api/earth-engine/tiles/{layer_name}/{z}/{x}/{y}")
async def get_tile_proxy(layer_name: str, z: int, x: int, y: int):
    """Proxy endpoint to serve Earth Engine tiles with proper parameters"""
    
    logger.info(f" TILE REQUEST: {layer_name}/{z}/{x}/{y}")
    
    try:
        # Check if we have stored map data
        if not hasattr(app.state, 'current_maps') or layer_name not in app.state.current_maps:
            # If no maps are stored, generate them first with default coordinates
            logger.info(f"🔄 No maps found, generating maps for tile request: {layer_name}")
            await get_live_layers(lat=11.0168, lng=76.9558)  # Use default coordinates
            
            # Check again
            if layer_name not in app.state.current_maps:
                logger.error(f" Layer '{layer_name}' not found in current_maps: {list(app.state.current_maps.keys())}")
                raise HTTPException(status_code=404, detail=f"Layer '{layer_name}' not found even after generation")
        
        map_data = app.state.current_maps[layer_name]
        logger.info(f" Map data for {layer_name}: mapid={map_data['mapid'][:10]}...")
        
        # Use the tile_fetcher object directly (newer EE API approach)
        tile_fetcher = map_data.get('tile_fetcher')
        if tile_fetcher:
            # Use the tile_fetcher to get the actual tile URL
            try:
                tile_url = tile_fetcher.getTileUrl(z, x, y)
                logger.info(f" Using tile_fetcher URL: {tile_url}")
            except Exception as e:
                logger.error(f" Error getting tile URL from tile_fetcher: {e}")
                # Fallback to manual URL construction
                tile_url = f"https://earthengine.googleapis.com/v1alpha/{map_data['mapid']}/tiles/{z}/{x}/{y}?token={map_data.get('token', '')}"
        else:
            # Fallback to manual URL construction
            tile_url = f"https://earthengine.googleapis.com/v1alpha/{map_data['mapid']}/tiles/{z}/{x}/{y}?token={map_data.get('token', '')}"
        
        logger.info(f" Proxying tile request: {tile_url}")
        
        # Fetch the tile from Google Earth Engine
        import httpx
        async with httpx.AsyncClient(timeout=30.0) as client:
            try:
                response = await client.get(tile_url)
            
                if response.status_code == 200:
                    logger.info(f" Tile served successfully: {len(response.content)} bytes")
                    return Response(
                        content=response.content,
                        media_type="image/png",
                        headers={
                            "Cache-Control": "public, max-age=86400",  # Cache for 24 hours
                            "Access-Control-Allow-Origin": "*"
                        }
                    )
                else:
                    logger.error(f" Earth Engine responded with status {response.status_code}")
                    raise HTTPException(status_code=response.status_code, detail="Failed to fetch tile from Earth Engine")
            except httpx.ReadError as e:
                logger.error(f" ReadError fetching tile: {e} for URL: {tile_url}")
                raise HTTPException(status_code=502, detail="Error reading tile from Earth Engine")
                
    except Exception as e:
        import traceback
        logger.error(f" Tile proxy error: {str(e)}")
        logger.error(f" Full traceback: {traceback.format_exc()}")
        raise HTTPException(status_code=500, detail=f"Tile proxy error: {str(e)}")

@app.exception_handler(404)
async def not_found_handler(request, exc):
    """Custom 404 handler"""
    logger.warning(f" 404 Error: {request.url}")
    return JSONResponse(
        status_code=404,
        content={
            "error": "Endpoint not found",
            "message": "The requested API endpoint does not exist",
            "timestamp": datetime.now().isoformat()
        }
    )

@app.exception_handler(500)
async def internal_error_handler(request, exc):
    """Custom 500 handler"""
    logger.error(f"500 Error: {str(exc)}")
    return JSONResponse(
        status_code=500,
        content={
            "error": "Internal server error",
            "message": "An unexpected error occurred",
            "timestamp": datetime.now().isoformat()
        }
    )

if __name__ == "__main__":
    print(f" Starting Disaster Eye Earth Engine API...")
    print(f" Default location: {config.DEFAULT_LAT}, {config.DEFAULT_LNG}")
    print(f"Frontend URL: {config.FRONTEND_URL}")
    
    uvicorn.run(
        "main:app",
        host=config.HOST,
        port=config.PORT,
        reload=True,
        log_level="info"
    )
