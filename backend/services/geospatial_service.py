import logging
from datetime import datetime
from typing import Dict, List, Optional, Any
from services.earth_engine_service import earth_engine_service
from services.ai_service import ai_service

logger = logging.getLogger(__name__)

class GeospatialService:
    def __init__(self):
        self.ee_service = earth_engine_service
        self.ai_service = ai_service
    
    def process_location_query(self, lat: float, lng: float, query: Optional[str] = None) -> Dict[str, Any]:
        """Process a comprehensive location-based query"""
        logger.info(f"Processing location query for coordinates: {lat}, {lng}")
        
        try:
            # Start with basic location info
            result: Dict[str, Any] = {
                'coordinates': {'lat': lat, 'lng': lng},
                'timestamp': datetime.now().isoformat(),
                'status': 'processing',
                'analyses': {}
            }
            
            # Get flood analysis
            try:
                logger.info("Fetching flood analysis...")
                flood_data = self.ee_service.get_flood_analysis(lat, lng)
                result['analyses']['flood'] = flood_data
                logger.info("Flood analysis completed")
            except Exception as e:
                error_msg = f"Flood analysis failed: {str(e)}"
                logger.error(error_msg, exc_info=True)
                result['analyses']['flood'] = {
                    'status': 'error',
                    'message': error_msg,
                    'error_details': str(e)
                }
            
            # Get building analysis
            try:
                logger.info("Fetching building analysis...")
                building_data = self.ee_service.get_building_analysis(lat, lng)
                result['analyses']['buildings'] = building_data
                logger.info("Building analysis completed")
            except Exception as e:
                error_msg = f"Building analysis failed: {str(e)}"
                logger.error(error_msg, exc_info=True)
                result['analyses']['buildings'] = {
                    'status': 'error',
                    'message': error_msg,
                    'error_details': str(e)
                }
            
            # Calculate Social Vulnerability Index (simplified)
            try:
                logger.info("Calculating social vulnerability...")
                result['analyses']['social_vulnerability'] = self._calculate_svi(lat, lng, result)
                logger.info("Social vulnerability analysis completed")
            except Exception as e:
                error_msg = f"Social vulnerability analysis failed: {str(e)}"
                logger.error(error_msg, exc_info=True)
                result['analyses']['social_vulnerability'] = {
                    'status': 'error',
                    'message': error_msg,
                    'error_details': str(e)
                }
            
            # Process natural language query if provided
            if query:
                logger.info(f"Processing natural language query: {query}")
                try:
                    ai_analysis = self.ai_service.process_natural_query(query, result)
                    result['ai_analysis'] = ai_analysis
                    
                    # Generate a detailed report if AI is available
                    if self.ai_service.available:
                        result['report'] = self.ai_service.generate_analysis_report(result)
                    
                    logger.info("AI analysis completed")
                except Exception as e:
                    error_msg = f"AI analysis failed: {str(e)}"
                    logger.error(error_msg, exc_info=True)
                    result['ai_analysis'] = {
                        'status': 'error',
                        'message': error_msg,
                        'error_details': str(e)
                    }
            
            result['status'] = 'completed'
            logger.info("Location query processing completed successfully")
            return result
            
        except Exception as e:
            error_msg = f"Error processing location query: {str(e)}"
            logger.error(error_msg, exc_info=True)
            return {
                'coordinates': {'lat': lat, 'lng': lng},
                'timestamp': datetime.now().isoformat(),
                'status': 'error',
                'error': error_msg,
                'error_details': str(e)
            }
    
    def get_map_layers(self, lat: float, lng: float, zoom: int = 10) -> Dict:
        """Get all available map layers for visualization"""
        
        try:
            layers = self.ee_service.get_satellite_layers(lat, lng, zoom)
            
            # Add layer metadata
            layer_info = {
                'satellite': {
                    'name': 'Satellite Imagery',
                    'description': 'True color Sentinel-2 satellite imagery',
                    'source': 'Copernicus Sentinel-2'
                },
                'vegetation': {
                    'name': 'Vegetation Index',
                    'description': 'NDVI showing vegetation health',
                    'source': 'Calculated from Sentinel-2'
                },
                'elevation': {
                    'name': 'Elevation',
                    'description': 'Digital elevation model',
                    'source': 'SRTM Global 1 arc-second'
                }
            }
            
            # Combine layer URLs with metadata
            result = {}
            for layer_id, layer_data in layers.items():
                result[layer_id] = {
                    **layer_data,
                    **layer_info.get(layer_id, {})
                }
            
            return {
                'layers': result,
                'center': {'lat': lat, 'lng': lng, 'zoom': zoom},
                'timestamp': datetime.now().isoformat()
            }
            
        except Exception as e:
            return {
                'error': str(e),
                'timestamp': datetime.now().isoformat()
            }
    
    def _calculate_svi(self, lat: float, lng: float, analysis_data: Dict) -> Dict:
        """Calculate Social Vulnerability Index (simplified version)"""
        
        # This is a simplified SVI calculation
        # In a real implementation, you would use census data, demographics, etc.
        
        svi_factors = {
            'flood_risk': 0,
            'building_density': 0,
            'elevation_risk': 0,
            'infrastructure_access': 0
        }
        
        # Factor 1: Flood risk contribution
        if 'flood_analysis' in analysis_data and 'risk_level' in analysis_data['flood_analysis']:
            risk_level = analysis_data['flood_analysis']['risk_level']
            svi_factors['flood_risk'] = {
                'High': 0.8,
                'Medium': 0.5,
                'Low': 0.2
            }.get(risk_level, 0.3)
        
        # Factor 2: Building density (higher density = higher vulnerability)
        if 'building_analysis' in analysis_data and 'built_up_percentage' in analysis_data['building_analysis']:
            built_up = analysis_data['building_analysis']['built_up_percentage']
            svi_factors['building_density'] = min(built_up / 100, 1.0) * 0.6
        
        # Factor 3: Elevation risk (lower elevation = higher vulnerability)
        if 'flood_analysis' in analysis_data and 'average_elevation' in analysis_data['flood_analysis']:
            elevation = analysis_data['flood_analysis']['average_elevation']
            if elevation < 10:
                svi_factors['elevation_risk'] = 0.9
            elif elevation < 50:
                svi_factors['elevation_risk'] = 0.6
            elif elevation < 100:
                svi_factors['elevation_risk'] = 0.3
            else:
                svi_factors['elevation_risk'] = 0.1
        
        # Factor 4: Infrastructure access (simplified - based on building density)
        svi_factors['infrastructure_access'] = max(0.3, 1.0 - svi_factors['building_density'])
        
        # Calculate overall SVI (0-1 scale)
        weights = {'flood_risk': 0.3, 'building_density': 0.2, 'elevation_risk': 0.3, 'infrastructure_access': 0.2}
        
        svi_score = sum(svi_factors[factor] * weights[factor] for factor in weights)
        
        # Categorize SVI
        if svi_score > 0.75:
            svi_category = "Very High"
        elif svi_score > 0.5:
            svi_category = "High" 
        elif svi_score > 0.25:
            svi_category = "Moderate"
        else:
            svi_category = "Low"
        
        return {
            'score': round(svi_score, 3),
            'category': svi_category,
            'factors': svi_factors,
            'description': f"Social vulnerability is {svi_category.lower()} based on flood risk, building density, and elevation factors."
        }
    
    def get_regional_analysis(self, bounds: Dict, analysis_type: str = "comprehensive") -> Dict:
        """Get analysis for a rectangular region"""
        
        try:
            # Extract bounds
            north = bounds.get('north')
            south = bounds.get('south') 
            east = bounds.get('east')
            west = bounds.get('west')
            
            if not all([north, south, east, west]):
                raise ValueError("Invalid bounds provided")
            
            # Calculate center point
            center_lat = (north + south) / 2
            center_lng = (east + west) / 2
            
            # For now, use center point analysis
            # In a full implementation, you would process the entire region
            return self.process_location_query(
                center_lat, 
                center_lng, 
                f"Analyze {analysis_type} disaster risk for the selected region"
            )
            
        except Exception as e:
            return {
                'error': str(e),
                'timestamp': datetime.now().isoformat()
            }

# Global instance
geospatial_service = GeospatialService()
