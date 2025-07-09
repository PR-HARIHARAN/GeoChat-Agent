// API service for connecting to the Earth Engine backend

const API_BASE_URL = 'http://localhost:8000';

export interface Coordinates {
  lat: number;
  lng: number;
}

export interface QueryRequest {
  query: string;
  coordinates?: Coordinates;
}

export interface LocationAnalysisRequest {
  coordinates: Coordinates;
  include_ai?: boolean;
}

export interface AnalysisResponse {
  timestamp: string;
  status: string;
  ai_analysis?: string;
  coordinates: Coordinates;
  earth_engine_data?: {
    flood_risk: string;
    elevation: number;
    land_cover: string;
    building_density: number;
    svi_score: number;
  };
  vulnerability_assessment?: {
    overall_risk: string;
    flood_vulnerability: string;
    infrastructure_risk: string;
    population_density: string;
  };
  statistics?: {
    total_buildings?: number;
    damaged_buildings?: number;
    affected_population?: number;
    economic_impact?: number;
  };
}

export interface MapLayersResponse {
  timestamp: string;
  status: string;
  coordinates: Coordinates;
  zoom_level: number;
  layers: {
    flood_zones?: string;
    buildings?: string;
    svi?: string;
    infrastructure?: string;
  };
}

class ApiService {
  private async makeRequest<T>(endpoint: string, options?: RequestInit): Promise<T> {
    const url = `${API_BASE_URL}${endpoint}`;
    
    try {
      const response = await fetch(url, {
        headers: {
          'Content-Type': 'application/json',
          ...options?.headers,
        },
        ...options,
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error(`API request failed for ${endpoint}:`, error);
      throw error;
    }
  }

  async healthCheck() {
    return this.makeRequest<{
      api_status: string;
      earth_engine_initialized: boolean;
      ai_service_available: boolean;
      timestamp: string;
    }>('/health');
  }

  async processNaturalQuery(request: QueryRequest): Promise<AnalysisResponse> {
    return this.makeRequest<AnalysisResponse>('/api/earth-engine/query', {
      method: 'POST',
      body: JSON.stringify(request),
    });
  }

  async analyzeLocation(request: LocationAnalysisRequest): Promise<AnalysisResponse> {
    return this.makeRequest<AnalysisResponse>('/api/earth-engine/analyze-location', {
      method: 'POST',
      body: JSON.stringify(request),
    });
  }

  async getMapLayers(lat: number = 11.0168, lng: number = 76.9558, zoom: number = 10): Promise<MapLayersResponse> {
    return this.makeRequest<MapLayersResponse>(`/api/earth-engine/map-layers?lat=${lat}&lng=${lng}&zoom=${zoom}`);
  }

  async getRegionalAnalysis(region: string): Promise<AnalysisResponse> {
    return this.makeRequest<AnalysisResponse>('/api/earth-engine/regional-analysis', {
      method: 'POST',
      body: JSON.stringify({ region }),
    });
  }
}

export const apiService = new ApiService();
