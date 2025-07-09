#!/usr/bin/env python3
"""
Earth Engine Test Script for Disaster Eye Application
Tests Earth Engine functionality and generates map data for frontend
"""

import ee
import json
import sys
import os
from datetime import datetime, timedelta

# Add parent directory to path to import our modules
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from config import config
from services.earth_engine_service import EarthEngineService
from services.geospatial_service import geospatial_service

def test_earth_engine_connection():
    """Test if Earth Engine is properly initialized"""
    print("🔍 Testing Earth Engine Connection...")
    
    try:
        # Test basic EE functionality
        image = ee.Image('USGS/SRTMGL1_003')
        scale = image.projection().nominalScale()
        print(f"✅ Earth Engine connected successfully!")
        print(f"📊 Test image scale: {scale.getInfo()} meters")
        return True
    except Exception as e:
        print(f"❌ Earth Engine connection failed: {e}")
        return False

def generate_flood_risk_map(lat=11.0168, lng=76.9558, zoom=10):
    """Generate flood risk map data for Coimbatore region"""
    print(f"\n🗺️ Generating flood risk map for coordinates: {lat}, {lng}")
    
    try:
        # Define area of interest (Coimbatore region)
        point = ee.Geometry.Point([lng, lat])
        region = point.buffer(10000)  # 10km buffer
        
        # Get elevation data (SRTM Digital Elevation Model)
        elevation = ee.Image('USGS/SRTMGL1_003').clip(region)
        
        # Get land cover data
        landcover = ee.Image('MODIS/006/MCD12Q1/2020_01_01').select('LC_Type1').clip(region)
        
        # Calculate slope from elevation
        slope = ee.Terrain.slope(elevation)
        
        # Create flood risk assessment
        # Lower elevation + lower slope = higher flood risk
        flood_risk = elevation.lt(100).add(slope.lt(5)).rename('flood_risk')
        
        # Get recent precipitation data (GPM)
        end_date = datetime.now()
        start_date = end_date - timedelta(days=30)
        
        precipitation = (ee.ImageCollection('NASA/GPM_L3/IMERG_V06')
                        .filterDate(start_date.strftime('%Y-%m-%d'), end_date.strftime('%Y-%m-%d'))
                        .filterBounds(region)
                        .select('precipitationCal')
                        .mean()
                        .clip(region))
        
        # Sample the data at the center point
        sample_data = (elevation.addBands(slope)
                      .addBands(flood_risk)
                      .addBands(precipitation)
                      .sample(point, 30)
                      .first())
        
        sample_info = sample_data.getInfo()
        
        # Generate map tile URLs for visualization
        map_data = {
            'center': {'lat': lat, 'lng': lng},
            'zoom': zoom,
            'elevation_url': elevation.getMapId({'min': 0, 'max': 1000, 'palette': ['blue', 'green', 'yellow', 'red']})['tile_fetcher'].url_format,
            'flood_risk_url': flood_risk.getMapId({'min': 0, 'max': 2, 'palette': ['green', 'yellow', 'red']})['tile_fetcher'].url_format,
            'precipitation_url': precipitation.getMapId({'min': 0, 'max': 10, 'palette': ['white', 'blue', 'darkblue']})['tile_fetcher'].url_format,
            'sample_data': sample_info['properties'] if sample_info else {}
        }
        
        print("✅ Map data generated successfully!")
        return map_data
        
    except Exception as e:
        print(f"❌ Map generation failed: {e}")
        return None

def test_backend_service():
    """Test our backend geospatial service"""
    print("\n🔧 Testing Backend Geospatial Service...")
    
    try:
        # Test location analysis
        result = geospatial_service.process_location_query(
            lat=11.0168,
            lng=76.9558,
            query="Analyze flood vulnerability for this location"
        )
        
        print("✅ Backend service working!")
        print(f"📊 Analysis result keys: {list(result.keys())}")
        return result
        
    except Exception as e:
        print(f"❌ Backend service test failed: {e}")
        return None

def generate_sample_layers():
    """Generate sample Earth Engine layers for frontend"""
    print("\n🎨 Generating Sample Layers...")
    
    try:
        # Coimbatore region
        region = ee.Geometry.Rectangle([76.8, 10.9, 77.1, 11.2])
        
        # Layer 1: Population Density
        population = ee.Image('WorldPop/GP/100m/pop/IND_2020').clip(region)
        
        # Layer 2: Night Lights (infrastructure proxy)
        nightlights = (ee.ImageCollection('NOAA/VIIRS/DNB/MONTHLY_V1/VCMSLCFG')
                      .filterDate('2023-01-01', '2023-12-31')
                      .mean()
                      .select('avg_rad')
                      .clip(region))
        
        # Layer 3: Urban areas
        urban = (ee.ImageCollection('MODIS/006/MCD12Q1')
                .filterDate('2020-01-01', '2020-12-31')
                .first()
                .select('LC_Type1')
                .eq(13)  # Urban class
                .clip(region))
        
        layers = {
            'population': {
                'name': 'Population Density',
                'url': population.getMapId({'min': 0, 'max': 1000, 'palette': ['white', 'yellow', 'orange', 'red']})['tile_fetcher'].url_format,
                'description': 'Population density per 100m grid'
            },
            'infrastructure': {
                'name': 'Night Lights (Infrastructure)',
                'url': nightlights.getMapId({'min': 0, 'max': 5, 'palette': ['black', 'blue', 'purple', 'yellow', 'white']})['tile_fetcher'].url_format,
                'description': 'Night-time lights indicating infrastructure'
            },
            'urban': {
                'name': 'Urban Areas',
                'url': urban.getMapId({'min': 0, 'max': 1, 'palette': ['000000', 'FF0000']})['tile_fetcher'].url_format,
                'description': 'Urban and built-up areas'
            }
        }
        
        print("✅ Sample layers generated!")
        return layers
        
    except Exception as e:
        print(f"❌ Layer generation failed: {e}")
        return None

def save_test_results(map_data, backend_result, layers):
    """Save test results to JSON file for frontend consumption"""
    
    test_results = {
        'timestamp': datetime.now().isoformat(),
        'earth_engine_status': 'connected',
        'map_data': map_data,
        'backend_analysis': backend_result,
        'sample_layers': layers,
        'test_location': {
            'name': 'Coimbatore, Tamil Nadu',
            'coordinates': {'lat': 11.0168, 'lng': 76.9558},
            'description': 'ISRO headquarters region'
        }
    }
    
    output_file = 'earth_engine_test_results.json'
    with open(output_file, 'w') as f:
        json.dump(test_results, f, indent=2)
    
    print(f"\n💾 Test results saved to: {output_file}")
    return output_file

def main():
    """Main test function"""
    print("🛰️ Earth Engine Test Suite for Disaster Eye")
    print("=" * 50)
    
    # Test 1: Basic connection
    if not test_earth_engine_connection():
        print("❌ Cannot proceed without Earth Engine connection")
        return
    
    # Test 2: Generate map data
    map_data = generate_flood_risk_map()
    
    # Test 3: Test backend service
    backend_result = test_backend_service()
    
    # Test 4: Generate sample layers
    layers = generate_sample_layers()
    
    # Test 5: Save results
    if map_data and backend_result and layers:
        output_file = save_test_results(map_data, backend_result, layers)
        
        print("\n🎉 All tests completed successfully!")
        print(f"📁 Results saved to: {output_file}")
        print("\n🌐 Next steps:")
        print("1. The frontend can now consume the generated map data")
        print("2. Use the tile URLs for overlay layers")
        print("3. Backend API is ready for real-time queries")
        
        # Print sample tile URL for testing
        if 'elevation_url' in map_data:
            print(f"\n🗺️ Sample elevation tile URL:")
            print(f"   {map_data['elevation_url']}")
            
    else:
        print("\n⚠️ Some tests failed. Check the logs above.")

if __name__ == "__main__":
    main()
