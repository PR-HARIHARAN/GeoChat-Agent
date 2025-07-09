from typing import Dict, List, Optional
from groq import Groq
from config import config
import logging

logger = logging.getLogger(__name__)

class AIService:
    def __init__(self):
        self.client = None
        if config.GROQ_API_KEY:
            try:
                self.client = Groq(api_key=config.GROQ_API_KEY)
                self.available = True
                logger.info("Groq client initialized successfully")
            except Exception as e:
                self.available = False
                logger.error(f"Failed to initialize Groq client: {str(e)}")
        else:
            self.available = False
            logger.warning("⚠️  Groq API key not provided. AI features will be limited.")
    
    def process_natural_query(self, query: str, location_data: Dict = None) -> Dict:
        """Process natural language query about disaster analysis"""
        
        # Extract intent from query
        intent = self._extract_intent(query)
        
        # If AI is available, use GPT for enhanced processing
        if self.available:
            try:
                response = self._get_ai_response(query, location_data)
                return {
                    'intent': intent,
                    'ai_response': response,
                    'confidence': 0.9,
                    'suggested_actions': self._get_suggested_actions(intent)
                }
            except Exception as e:
                print(f"AI processing failed: {e}")
                # Fallback to rule-based processing
                return self._fallback_processing(query, intent)
        else:
            return self._fallback_processing(query, intent)
    
    def _extract_intent(self, query: str) -> str:
        """Extract intent from query using keyword matching"""
        query_lower = query.lower()
        
        if any(word in query_lower for word in ['flood', 'flooding', 'water', 'inundation']):
            return 'flood_analysis'
        elif any(word in query_lower for word in ['building', 'damage', 'infrastructure', 'structure']):
            return 'building_damage'
        elif any(word in query_lower for word in ['vulnerability', 'social', 'population', 'community']):
            return 'social_vulnerability'
        elif any(word in query_lower for word in ['risk', 'assessment', 'evaluation']):
            return 'risk_assessment'
        else:
            return 'general_analysis'
    
    def _get_ai_response(self, query: str, context: Dict = None) -> str:
        """Get AI response using Groq API"""
        if not self.available or not self.client:
            return "AI service is not available."
            
        try:
            messages = [
                {"role": "system", "content": "You are a helpful assistant that provides geospatial analysis and disaster management insights. Be concise and focus on the key information."},
                {"role": "user", "content": f"Query: {query}\n\nContext: {str(context) if context else 'No additional context'}"}
            ]
            
            response = self.client.chat.completions.create(
                model=config.GROQ_MODEL,
                messages=messages,
                temperature=0.7,
                max_tokens=1000,
                top_p=1.0,
                frequency_penalty=0.0,
                presence_penalty=0.0,
                stop=None
            )
            
            return response.choices[0].message.content.strip()
            
        except Exception as e:
            logger.error(f"Error getting AI response: {e}")
            return "I'm sorry, I encountered an error processing your request. Please try again later."
    
    def _fallback_processing(self, query: str, intent: str) -> Dict:
        """Fallback processing when AI is not available"""
        
        responses = {
            'flood_analysis': "Analyzing flood vulnerability using satellite data and elevation models. This includes water detection from SAR imagery and topographic analysis.",
            'building_damage': "Assessing building damage potential using optical satellite imagery and building footprint detection algorithms.",
            'social_vulnerability': "Evaluating social vulnerability using demographic data and infrastructure proximity analysis.",
            'risk_assessment': "Conducting comprehensive risk assessment combining flood probability, building exposure, and population vulnerability.",
            'general_analysis': "Performing general disaster risk analysis using available geospatial datasets and Earth observation data."
        }
        
        return {
            'intent': intent,
            'ai_response': responses.get(intent, responses['general_analysis']),
            'confidence': 0.7,
            'suggested_actions': self._get_suggested_actions(intent)
        }
    
    def _get_suggested_actions(self, intent: str) -> List[str]:
        """Get suggested actions based on intent"""
        
        actions = {
            'flood_analysis': [
                "View flood risk zones on map",
                "Check historical flood data",
                "Analyze drainage patterns",
                "Assess elevation vulnerability"
            ],
            'building_damage': [
                "Identify vulnerable structures",
                "Calculate exposure metrics",
                "Map critical infrastructure",
                "Estimate repair costs"
            ],
            'social_vulnerability': [
                "Map population density",
                "Identify vulnerable communities",
                "Assess evacuation routes",
                "Locate emergency facilities"
            ],
            'risk_assessment': [
                "Generate risk report",
                "Create vulnerability map",
                "Plan mitigation strategies",
                "Design early warning system"
            ]
        }
        
        return actions.get(intent, [
            "Analyze available data",
            "Generate basic report",
            "View satellite imagery",
            "Export analysis results"
        ])
    
    def generate_analysis_report(self, analysis_data: Dict) -> str:
        """Generate a comprehensive analysis report"""
        
        if not analysis_data:
            return "No analysis data available."
        
        report_sections = []
        
        # Flood Analysis Section
        if 'flood_analysis' in analysis_data:
            flood_data = analysis_data['flood_analysis']
            report_sections.append(f"""
**Flood Risk Assessment:**
- Current flood coverage: {flood_data.get('flood_percentage', 0):.1f}%
- Average elevation: {flood_data.get('average_elevation', 0):.1f}m
- Risk level: {flood_data.get('risk_level', 'Unknown')}
""")
        
        # Building Analysis Section
        if 'building_analysis' in analysis_data:
            building_data = analysis_data['building_analysis']
            report_sections.append(f"""
**Building Damage Assessment:**
- Estimated buildings: {building_data.get('total_buildings', 0)}
- Potentially damaged: {building_data.get('damaged_buildings', 0)}
- Damage rate: {building_data.get('damage_percentage', 0):.1f}%
""")
        
        # Location Information
        if 'coordinates' in analysis_data:
            coords = analysis_data['coordinates']
            report_sections.append(f"""
**Analysis Location:**
- Coordinates: {coords.get('lat', 0):.4f}, {coords.get('lng', 0):.4f}
- Analysis performed: {analysis_data.get('timestamp', 'Recently')}
""")
        
        if report_sections:
            return "\n".join(report_sections)
        else:
            return "Analysis report is being generated. Please check back shortly."

# Global instance
ai_service = AIService()
