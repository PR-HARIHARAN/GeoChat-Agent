from pydantic import BaseModel, Field
from typing import Optional, Dict, List
from datetime import datetime

class Coordinates(BaseModel):
    lat: float = Field(..., description="Latitude")
    lng: float = Field(..., description="Longitude")

class QueryRequest(BaseModel):
    query: str = Field(..., description="Natural language query")
    coordinates: Optional[Coordinates] = None
    analysis_type: Optional[str] = "comprehensive"

class LocationAnalysisRequest(BaseModel):
    coordinates: Coordinates
    radius: Optional[float] = 5000
    include_ai: Optional[bool] = True

class FloodAnalysis(BaseModel):
    flood_percentage: float
    average_elevation: float
    risk_level: str
    coordinates: Coordinates
    analysis_radius: float

class BuildingAnalysis(BaseModel):
    total_buildings: int
    damaged_buildings: int
    built_up_percentage: float
    damage_percentage: float
    coordinates: Coordinates

class SocialVulnerability(BaseModel):
    score: float
    category: str
    factors: Dict[str, float]
    description: str

class AIAnalysis(BaseModel):
    intent: str
    ai_response: str
    confidence: float
    suggested_actions: List[str]

class AnalysisResponse(BaseModel):
    coordinates: Coordinates
    timestamp: str
    status: str
    flood_analysis: Optional[FloodAnalysis] = None
    building_analysis: Optional[BuildingAnalysis] = None
    social_vulnerability: Optional[SocialVulnerability] = None
    ai_analysis: Optional[AIAnalysis] = None
    report: Optional[str] = None
    error: Optional[str] = None

class MapLayer(BaseModel):
    mapid: str
    token: str
    tile_url: str
    name: Optional[str] = None
    description: Optional[str] = None
    source: Optional[str] = None

class MapLayersResponse(BaseModel):
    layers: Dict[str, MapLayer]
    center: Dict[str, float]
    timestamp: str
    error: Optional[str] = None

class RegionBounds(BaseModel):
    north: float
    south: float
    east: float
    west: float

class RegionalAnalysisRequest(BaseModel):
    bounds: RegionBounds
    analysis_type: Optional[str] = "comprehensive"
