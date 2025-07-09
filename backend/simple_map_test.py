#!/usr/bin/env python3
"""
Simple Earth Engine Map Test
Creates a basic map tile server endpoint for testing
"""

import ee
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import uvicorn

# Simple standalone test server
app = FastAPI(title="EE Map Test")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["GET", "POST"],
    allow_headers=["*"],
)

# Initialize Earth Engine
try:
    # Use the project ID from config
    from config import config
    ee.Initialize(project=config.EE_PROJECT_ID)
    print("✅ Earth Engine initialized")
except Exception as e:
    print(f"❌ Earth Engine initialization failed: {e}")

@app.get("/")
async def root():
    return {
        "message": "Earth Engine Map Test Server", 
        "status": "running",
        "endpoints": {
            "root": "/",
            "simple_map": "/simple-map",
            "test_tile": "/test-tile/{z}/{x}/{y}",
            "health": "/health"
        }
    }

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "earth_engine": "initialized" if 'ee' in globals() else "not available"
    }

@app.get("/simple-map")
async def get_simple_map():
    """Get a simple working Earth Engine map"""
    try:
        # Create a simple elevation map
        elevation = ee.Image('USGS/SRTMGL1_003')
        
        # Get map visualization with simple parameters
        vis_params = {
            'min': 0,
            'max': 1000,
            'palette': ['blue', 'green', 'yellow', 'red']
        }
        
        map_id = elevation.getMapId(vis_params)
        
        return {
            "status": "success",
            "map_id": map_id['mapid'],
            "token": map_id['token'],
            "tile_url": map_id['tile_fetcher'].url_format,
            "center": {"lat": 11.0168, "lng": 76.9558},
            "zoom": 10,
            "description": "Global elevation data (SRTM)"
        }
        
    except Exception as e:
        return {"status": "error", "message": str(e)}

@app.get("/test-tile/{z}/{x}/{y}")
async def get_test_tile(z: int, x: int, y: int):
    """Test endpoint to verify tile coordinates are working"""
    return {
        "z": z, 
        "x": x, 
        "y": y,
        "message": f"Tile request for zoom {z}, x {x}, y {y}"
    }

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)
