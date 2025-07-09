import ee
import json
import logging
from typing import Dict, List, Optional, Tuple
from config import config

# Configure logging for Earth Engine service
logger = logging.getLogger(__name__)

class EarthEngineService:
    def __init__(self):
        self.initialized = False
        self._initialize_ee()
    
    def _initialize_ee(self):
        """Initialize Google Earth Engine with proper authentication"""
        logger.info("Initializing Google Earth Engine...")
        try:
            if config.EE_SERVICE_ACCOUNT and config.EE_PRIVATE_KEY_PATH:
                # Check if private key path exists and is a valid JSON file
                import os
                if os.path.exists(config.EE_PRIVATE_KEY_PATH):
                    # Use service account authentication
                    credentials = ee.ServiceAccountCredentials(
                        config.EE_SERVICE_ACCOUNT, 
                        config.EE_PRIVATE_KEY_PATH
                    )
                    ee.Initialize(credentials)
                    logger.info("Google Earth Engine initialized with service account")
                    self.initialized = True
                else:
                    logger.error(f"Service account key file not found: {config.EE_PRIVATE_KEY_PATH}")
                    logger.info("Falling back to user authentication...")
                    # Try user authentication as fallback
                    ee.Initialize()
                    logger.info("Google Earth Engine initialized with user authentication")
            else:
                # Use user authentication (requires prior ee.Authenticate())
                logger.info("Using user authentication for Earth Engine...")
                ee.Initialize(project=config.EE_PROJECT_ID)
                logger.info("Google Earth Engine initialized with user authentication")
                self.initialized = True
            
            # Don't set initialized to True here, let individual cases set it
            
        except Exception as e:
            logger.error(f"Error initializing Google Earth Engine: {e}")
            logger.info("Please ensure you have:")
            logger.info("   1. Run 'earthengine authenticate' in your terminal")
            logger.info("   2. Set up your service account JSON key file (optional)")
            logger.info("   3. Configured your .env file properly")
            self.initialized = False
    
    def get_map_id(self, image: ee.Image, vis_params: Dict) -> Dict:
        """Get map ID for Earth Engine image"""
        if not self.initialized:
            logger.error("Earth Engine not initialized for get_map_id")
            raise Exception("Earth Engine not initialized")
        
        try:
            logger.info(f"Getting map ID for image with visualization parameters: {vis_params}")
            map_id = image.getMapId(vis_params)
            logger.info(f"Map ID generated successfully: mapid={map_id['mapid'][:10]}...")
            return {
                'mapid': map_id['mapid'],
                'token': map_id['token'],
                'tile_url': f"https://earthengine.googleapis.com/v1alpha/projects/earthengine-legacy/maps/{map_id['mapid']}/tiles/{{z}}/{{x}}/{{y}}?token={map_id['token']}"
            }
        except Exception as e:
            logger.error(f"Error getting map ID: {e}")
            raise Exception(f"Error getting map ID: {e}")
    
    def get_flood_analysis(self, lat: float, lng: float, radius: float = 5000) -> Dict:
        """Analyze flood vulnerability for a specific location"""
        if not self.initialized:
            logger.error("Earth Engine not initialized for flood analysis")
            raise Exception("Earth Engine not initialized")
        
        logger.info(f"Starting flood analysis: lat={lat}, lng={lng}, radius={radius}")
        
        try:
            # Create point of interest
            point = ee.Geometry.Point([lng, lat])
            region = point.buffer(radius)
            
            logger.info("Fetching Sentinel-1 SAR data for flood detection...")
            # Get Sentinel-1 SAR data for flood detection
            sentinel1 = ee.ImageCollection('COPERNICUS/S1_GRD') \
                .filterBounds(region) \
                .filterDate('2023-01-01', '2024-12-31') \
                .filter(ee.Filter.eq('instrumentMode', 'IW')) \
                .select(['VV', 'VH'])
            
            sentinel1_count = sentinel1.size().getInfo()
            logger.info(f"Found {sentinel1_count} Sentinel-1 images")
            
            # Calculate flood probability using SAR backscatter
            if sentinel1_count > 0:
                logger.info("Processing recent Sentinel-1 image for flood detection...")
                recent_image = sentinel1.sort('system:time_start', False).first()
                vv = recent_image.select('VV')
                
                # Simple flood detection using backscatter threshold
                flood_threshold = -15  # dB threshold for water detection
                flood_mask = vv.lt(flood_threshold)
                
                logger.info("Calculating flood area statistics...")
                # Calculate flood area percentage
                flood_stats = flood_mask.reduceRegion(
                    reducer=ee.Reducer.mean(),
                    geometry=region,
                    scale=10,
                    maxPixels=1e9
                )
                
                flood_percentage = flood_stats.getInfo().get('VV', 0) * 100
                logger.info(f"Calculated flood percentage: {flood_percentage:.2f}%")
            else:
                flood_percentage = 0
                logger.warning("No Sentinel-1 images found for flood analysis")
            
            logger.info("Fetching elevation data...")
            # Get elevation data for flood risk
            elevation = ee.Image('USGS/SRTMGL1_003')
            elev_stats = elevation.reduceRegion(
                reducer=ee.Reducer.mean(),
                geometry=region,
                scale=30,
                maxPixels=1e9
            )
            
            avg_elevation = elev_stats.getInfo().get('elevation', 0)
            logger.info(f"Average elevation: {avg_elevation:.2f} meters")
            
            # Calculate risk level
            if flood_percentage > 30 or avg_elevation < 10:
                risk_level = "High"
            elif flood_percentage > 10 or avg_elevation < 50:
                risk_level = "Medium"
            else:
                risk_level = "Low"
            
            logger.info(f"Risk level calculated: {risk_level}")
            
            result = {
                'flood_percentage': round(flood_percentage, 2),
                'average_elevation': round(avg_elevation, 2),
                'risk_level': risk_level,
                'coordinates': {'lat': lat, 'lng': lng},
                'analysis_radius': radius
            }
            
            logger.info(f"Flood analysis completed successfully")
            return result
            
        except Exception as e:
            logger.error(f"Error in flood analysis: {e}")
            raise Exception(f"Error in flood analysis: {e}")
    
    def get_building_analysis(self, lat: float, lng: float, radius: float = 2000) -> Dict:
        """Analyze building density and potential damage"""
        if not self.initialized:
            logger.error("Earth Engine not initialized for building analysis")
            raise Exception("Earth Engine not initialized")
        
        logger.info(f"Starting building analysis: lat={lat}, lng={lng}, radius={radius}")
        
        try:
            point = ee.Geometry.Point([lng, lat])
            region = point.buffer(radius)
            
            logger.info("Fetching Sentinel-2 data for building detection...")
            # Use Sentinel-2 for building detection (simplified)
            sentinel2 = ee.ImageCollection('COPERNICUS/S2_SR') \
                .filterBounds(region) \
                .filterDate('2023-01-01', '2024-12-31') \
                .filter(ee.Filter.lt('CLOUDY_PIXEL_PERCENTAGE', 20))
            
            sentinel2_count = sentinel2.size().getInfo()
            logger.info(f"Found {sentinel2_count} Sentinel-2 images")
            
            if sentinel2_count > 0:
                logger.info("Processing Sentinel-2 composite for building detection...")
                # Get median composite
                composite = sentinel2.median()
                
                # Calculate NDBI (Normalized Difference Built-up Index)
                nir = composite.select('B8')
                swir = composite.select('B11')
                ndbi = swir.subtract(nir).divide(swir.add(nir))
                
                # Built-up area threshold
                built_up = ndbi.gt(0.1)
                
                logger.info("Calculating built-up area statistics...")
                # Calculate built-up percentage
                built_up_stats = built_up.reduceRegion(
                    reducer=ee.Reducer.mean(),
                    geometry=region,
                    scale=10,
                    maxPixels=1e9
                )
                
                built_up_percentage = built_up_stats.getInfo().get('B11', 0) * 100
                logger.info(f"Built-up area percentage: {built_up_percentage:.2f}%")
                
                # Estimate building count (rough approximation)
                estimated_buildings = int(built_up_percentage * radius / 100)
                logger.info(f"Estimated total buildings: {estimated_buildings}")
                
                # Simulate damage assessment based on flood risk
                logger.info("Assessing potential damage based on flood risk...")
                flood_data = self.get_flood_analysis(lat, lng, radius)
                damage_factor = {
                    "High": 0.35,
                    "Medium": 0.15,
                    "Low": 0.05
                }.get(flood_data['risk_level'], 0.05)
                
                damaged_buildings = int(estimated_buildings * damage_factor)
                logger.info(f"Estimated damaged buildings: {damaged_buildings} (factor: {damage_factor})")
                
            else:
                built_up_percentage = 0
                estimated_buildings = 0
                damaged_buildings = 0
                logger.warning("No Sentinel-2 images found for building analysis")
            
            result = {
                'total_buildings': estimated_buildings,
                'damaged_buildings': damaged_buildings,
                'built_up_percentage': round(built_up_percentage, 2),
                'damage_percentage': round((damaged_buildings / max(estimated_buildings, 1)) * 100, 2),
                'coordinates': {'lat': lat, 'lng': lng}
            }
            
            logger.info(f"Building analysis completed successfully")
            return result
            
        except Exception as e:
            logger.error(f"Error in building analysis: {e}")
            raise Exception(f"Error in building analysis: {e}")
    
    def get_satellite_layers(self, lat: float, lng: float, zoom: int = 10) -> Dict:
        """Get different satellite layers for visualization"""
        if not self.initialized:
            logger.error("Earth Engine not initialized for satellite layers")
            raise Exception("Earth Engine not initialized")
        
        logger.info(f"Getting satellite layers: lat={lat}, lng={lng}, zoom={zoom}")
        
        try:
            point = ee.Geometry.Point([lng, lat])
            region = point.buffer(10000)  # 10km buffer
            
            layers = {}
            
            logger.info("Generating Sentinel-2 True Color layer...")
            # Sentinel-2 True Color
            sentinel2 = ee.ImageCollection('COPERNICUS/S2_SR') \
                .filterBounds(region) \
                .filterDate('2023-01-01', '2024-12-31') \
                .filter(ee.Filter.lt('CLOUDY_PIXEL_PERCENTAGE', 20)) \
                .median()
            
            vis_params_rgb = {
                'bands': ['B4', 'B3', 'B2'],
                'min': 0,
                'max': 3000,
                'gamma': 1.4
            }
            
            layers['satellite'] = self.get_map_id(sentinel2, vis_params_rgb)
            logger.info("Sentinel-2 True Color layer generated")
            
            logger.info("Generating NDVI vegetation layer...")
            # NDVI for vegetation
            ndvi = sentinel2.normalizedDifference(['B8', 'B4'])
            vis_params_ndvi = {
                'min': -1,
                'max': 1,
                'palette': ['blue', 'white', 'green']
            }
            
            layers['vegetation'] = self.get_map_id(ndvi, vis_params_ndvi)
            logger.info("NDVI vegetation layer generated")
            
            logger.info("Generating elevation layer...")
            # Elevation
            elevation = ee.Image('USGS/SRTMGL1_003')
            vis_params_elevation = {
                'min': 0,
                'max': 1000,
                'palette': ['blue', 'green', 'yellow', 'red']
            }
            
            layers['elevation'] = self.get_map_id(elevation, vis_params_elevation)
            logger.info("Elevation layer generated")
            
            logger.info(f"All satellite layers generated successfully: {list(layers.keys())}")
            return layers
            
        except Exception as e:
            logger.error(f"Error getting satellite layers: {e}")
            raise Exception(f"Error getting satellite layers: {e}")

# Global instance
earth_engine_service = EarthEngineService()
