import React, { useState, useEffect, useRef, useCallback } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import 'leaflet-draw/dist/leaflet.draw.css';
import 'leaflet-draw';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  Loader2, 
  Layers, 
  Satellite, 
  Map, 
  MousePointer, 
  Square, 
  Download, 
  Share,
  Plus,
  X,
  AlertCircle,
  CheckCircle,
  Clock
} from 'lucide-react';

// Fix for default markers
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

interface EarthEngineLayer {
  id: string;
  name: string;
  description: string;
  map_id?: string;
  token?: string;
  tile_url?: string;
  is_mock?: boolean;
  loading?: boolean;
  error?: string;
}

interface DrawnGeometry {
  id: string;
  type: 'rectangle' | 'polygon';
  geometry: any; // GeoJSON geometry
  bounds: L.LatLngBounds;
  layer: L.Rectangle | L.Polygon;
}

interface AdvancedEarthEngineMapProps {
  onGeometryChange?: (geometry: DrawnGeometry | null) => void;
  onLayerToggle?: (layerId: string, active: boolean) => void;
}

const AdvancedEarthEngineMap: React.FC<AdvancedEarthEngineMapProps> = ({
  onGeometryChange,
  onLayerToggle
}) => {
  // Refs
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const drawControlRef = useRef<any>(null);
  
  // State
  const [tool, setTool] = useState<'select' | 'draw'>('select');
  const [drawnGeometry, setDrawnGeometry] = useState<DrawnGeometry | null>(null);
  const [availableLayers, setAvailableLayers] = useState<EarthEngineLayer[]>([]);
  const [activeLayers, setActiveLayers] = useState<string[]>([]);
  const [layerInstances, setLayerInstances] = useState<{ [key: string]: L.TileLayer }>({});
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [backendStatus, setBackendStatus] = useState<'checking' | 'available' | 'unavailable'>('checking');

  // Initialize map
  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current) return;

    const map = L.map(mapRef.current, {
      minZoom: 3,
      maxZoom: 18,
      worldCopyJump: true,
      maxBounds: [
        [-90, -180],
        [90, 180]
      ],
      maxBoundsViscosity: 1.0
    }).setView([11.0168, 76.9558], 11);

    // Add satellite base layer
    const satelliteLayer = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
      attribution: 'Tiles © Esri',
      maxZoom: 18,
      minZoom: 3,
    }).addTo(map);

    // Add OpenStreetMap layer
    const streetLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors',
      maxZoom: 19,
      minZoom: 3,
    });

    // Layer control
    const baseMaps = {
      "Satellite": satelliteLayer,
      "Street Map": streetLayer
    };

    L.control.layers(baseMaps, {}, { position: 'topright' }).addTo(map);

    mapInstanceRef.current = map;

    // Check backend status
    checkBackendStatus();

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  // Handle tool changes
  useEffect(() => {
    if (!mapInstanceRef.current) return;

    // Remove previous draw control
    if (drawControlRef.current) {
      mapInstanceRef.current.removeControl(drawControlRef.current);
      drawControlRef.current = null;
    }

    // Clear drawn geometry when switching tools
    if (tool !== 'draw') {
      clearDrawnGeometry();
    }

    // Set cursor
    if (mapRef.current) {
      mapRef.current.style.cursor = tool === 'draw' ? 'crosshair' : '';
    }

    // Add draw control for draw mode
    if (tool === 'draw') {
      const drawControl = new (window as any).L.Control.Draw({
        draw: {
          polygon: {
            allowIntersection: false,
            drawError: {
              color: '#e1e100',
              message: '<strong>Error:</strong> Shape edges cannot cross!'
            },
            shapeOptions: {
              color: '#3388ff',
              fillColor: '#3388ff',
              fillOpacity: 0.2
            }
          },
          rectangle: {
            shapeOptions: {
              color: '#3388ff',
              fillColor: '#3388ff',
              fillOpacity: 0.2
            }
          },
          polyline: false,
          circle: false,
          marker: false,
          circlemarker: false
        },
        edit: {
          featureGroup: new L.FeatureGroup(),
          remove: true
        }
      });

      mapInstanceRef.current.addControl(drawControl);
      drawControlRef.current = drawControl;

      // Handle draw events
      mapInstanceRef.current.on('draw:created', handleDrawCreated);
      mapInstanceRef.current.on('draw:edited', handleDrawEdited);
      mapInstanceRef.current.on('draw:deleted', handleDrawDeleted);
    }

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.off('draw:created', handleDrawCreated);
        mapInstanceRef.current.off('draw:edited', handleDrawEdited);
        mapInstanceRef.current.off('draw:deleted', handleDrawDeleted);
      }
    };
  }, [tool]);

  // Check backend status
  const checkBackendStatus = async () => {
    try {
      const response = await fetch('http://localhost:8000/api/earth-engine/live-layers?lat=11.0168&lng=76.9558');
      if (response.ok) {
        setBackendStatus('available');
      } else {
        setBackendStatus('unavailable');
      }
    } catch (error) {
      setBackendStatus('unavailable');
    }
  };

  // Handle draw events
  const handleDrawCreated = useCallback((e: any) => {
    const { layer, layerType } = e;
    const geometry = layer.toGeoJSON().geometry;
    const bounds = layer.getBounds();
    
    const drawnGeo: DrawnGeometry = {
      id: `geometry-${Date.now()}`,
      type: layerType === 'rectangle' ? 'rectangle' : 'polygon',
      geometry,
      bounds,
      layer
    };

    setDrawnGeometry(drawnGeo);
    onGeometryChange?.(drawnGeo);
    
    // Fetch Earth Engine layers for this region
    fetchEarthEngineLayers(geometry, bounds);
  }, [onGeometryChange]);

  const handleDrawEdited = useCallback((e: any) => {
    const layers = e.layers;
    layers.eachLayer((layer: any) => {
      const geometry = layer.toGeoJSON().geometry;
      const bounds = layer.getBounds();
      
      const drawnGeo: DrawnGeometry = {
        id: `geometry-${Date.now()}`,
        type: layer instanceof L.Rectangle ? 'rectangle' : 'polygon',
        geometry,
        bounds,
        layer
      };

      setDrawnGeometry(drawnGeo);
      onGeometryChange?.(drawnGeo);
      
      // Re-fetch Earth Engine layers for updated region
      fetchEarthEngineLayers(geometry, bounds);
    });
  }, [onGeometryChange]);

  const handleDrawDeleted = useCallback(() => {
    clearDrawnGeometry();
  }, []);

  // Clear drawn geometry and layers
  const clearDrawnGeometry = () => {
    if (drawnGeometry) {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.removeLayer(drawnGeometry.layer);
      }
      setDrawnGeometry(null);
      onGeometryChange?.(null);
    }
    
    // Clear all Earth Engine layers
    clearEarthEngineLayers();
  };

  // Clear Earth Engine layers
  const clearEarthEngineLayers = () => {
    if (mapInstanceRef.current) {
      Object.values(layerInstances).forEach(layer => {
        mapInstanceRef.current?.removeLayer(layer);
      });
    }
    setLayerInstances({});
    setActiveLayers([]);
    setAvailableLayers([]);
  };

  // Fetch Earth Engine layers for a region
  const fetchEarthEngineLayers = async (geometry: any, bounds: L.LatLngBounds) => {
    setIsLoading(true);
    setError(null);
    
    try {
      // Convert geometry to GeoJSON string
      const geoJsonString = encodeURIComponent(JSON.stringify(geometry));
      
      const response = await fetch(`http://localhost:8000/api/earth-engine/live-layers?geometry=${geoJsonString}`);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      
      if (data.status === 'success' && data.layers) {
        const layers: EarthEngineLayer[] = Object.entries(data.layers).map(([id, layer]: [string, any]) => ({
          id,
          name: layer.name || id,
          description: layer.description || '',
          map_id: layer.map_id,
          token: layer.token,
          tile_url: layer.tile_url,
          is_mock: layer.is_mock || false
        }));
        
        setAvailableLayers(layers);
        console.log('✅ Earth Engine layers loaded:', layers.map(l => l.name));
      } else {
        throw new Error(data.message || 'Failed to load layers');
      }
    } catch (error) {
      console.error('❌ Failed to fetch Earth Engine layers:', error);
      setError(error instanceof Error ? error.message : 'Failed to load layers');
      
      // Create mock layers as fallback
      const mockLayers: EarthEngineLayer[] = [
        {
          id: 'elevation',
          name: 'Elevation Data',
          description: 'SRTM Digital Elevation Model (Mock)',
          tile_url: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
          is_mock: true
        },
        {
          id: 'ndvi',
          name: 'NDVI',
          description: 'Normalized Difference Vegetation Index (Mock)',
          tile_url: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
          is_mock: true
        },
        {
          id: 'flood-risk',
          name: 'Flood Risk',
          description: 'Flood Risk Assessment (Mock)',
          tile_url: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
          is_mock: true
        }
      ];
      
      setAvailableLayers(mockLayers);
    } finally {
      setIsLoading(false);
    }
  };

  // Toggle layer visibility
  const toggleLayer = (layerId: string) => {
    if (!mapInstanceRef.current || !drawnGeometry) return;

    const layer = availableLayers.find(l => l.id === layerId);
    if (!layer) return;

    const isActive = activeLayers.includes(layerId);

    if (isActive) {
      // Remove layer
      if (layerInstances[layerId]) {
        mapInstanceRef.current.removeLayer(layerInstances[layerId]);
        const newLayerInstances = { ...layerInstances };
        delete newLayerInstances[layerId];
        setLayerInstances(newLayerInstances);
      }
      setActiveLayers(prev => prev.filter(id => id !== layerId));
      onLayerToggle?.(layerId, false);
    } else {
      // Add layer
      let tileUrl = layer.tile_url || '';
      
      if (layer.map_id && layer.token) {
        tileUrl = `https://earthengine.googleapis.com/v1alpha/projects/earthengine-legacy/maps/${layer.map_id}/tiles/{z}/{x}/{y}?token=${layer.token}`;
      }
      
      const tileLayer = L.tileLayer(tileUrl, {
        opacity: layer.is_mock ? 0.3 : 0.8,
        attribution: layer.is_mock ? 'OpenStreetMap (Mock)' : 'Google Earth Engine',
        maxZoom: 18,
        minZoom: 3,
        errorTileUrl: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg=='
      });

      // Add error and success handlers
      tileLayer.on('tileerror', () => {
        console.warn(`Tile loading error for layer ${layerId}`);
      });

      tileLayer.on('tileload', () => {
        console.log(`Tile loaded successfully for layer ${layerId}`);
      });

      tileLayer.addTo(mapInstanceRef.current);
      
      setLayerInstances(prev => ({ ...prev, [layerId]: tileLayer }));
      setActiveLayers(prev => [...prev, layerId]);
      onLayerToggle?.(layerId, true);
    }
  };

  // Get status color
  const getStatusColor = () => {
    switch (backendStatus) {
      case 'available': return 'bg-green-500';
      case 'unavailable': return 'bg-red-500';
      default: return 'bg-yellow-500';
    }
  };

  // Get status text
  const getStatusText = () => {
    switch (backendStatus) {
      case 'available': return 'Earth Engine Connected';
      case 'unavailable': return 'Backend Offline';
      default: return 'Checking Connection...';
    }
  };

  // Get status icon
  const getStatusIcon = () => {
    switch (backendStatus) {
      case 'available': return <CheckCircle className="w-4 h-4" />;
      case 'unavailable': return <AlertCircle className="w-4 h-4" />;
      default: return <Clock className="w-4 h-4" />;
    }
  };

  return (
    <div className="relative w-full h-full">
      {/* Map Container */}
      <div 
        ref={mapRef} 
        className="w-full h-full rounded-lg"
        style={{ minHeight: '600px' }}
      />

      {/* Loading Overlay */}
      {isLoading && (
        <div className="absolute inset-0 bg-black/50 flex items-center justify-center rounded-lg z-[2000]">
          <div className="bg-white p-6 rounded-lg flex items-center gap-3 shadow-lg">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
            <div>
              <div className="font-medium">Loading Earth Engine Layers</div>
              <div className="text-sm text-muted-foreground">Analyzing region...</div>
            </div>
          </div>
        </div>
      )}

      {/* Status Indicator */}
      <div className="absolute top-4 left-4 z-[1000]">
        <div className="bg-card/95 backdrop-blur-sm border border-border/30 rounded-lg px-3 py-2 shadow-lg">
          <div className="flex items-center gap-2 text-sm text-foreground">
            <div className={`w-2 h-2 rounded-full ${getStatusColor()}`} />
            {getStatusIcon()}
            <span className="font-medium">{getStatusText()}</span>
          </div>
        </div>
      </div>

      {/* Tool Toggle */}
      <div className="absolute top-4 right-4 z-[1000]">
        <div className="flex flex-col gap-2">
          <div className="bg-card/95 backdrop-blur-sm border border-border/30 rounded-lg p-1 shadow-lg">
            <Button 
              variant={tool === 'select' ? "default" : "ghost"} 
              size="sm"
              onClick={() => setTool('select')}
              className="w-24 flex items-center justify-center gap-2"
              title="Select Mode"
            >
              <MousePointer className="w-4 h-4" />
              <span className="text-xs">Select</span>
            </Button>
            <Button 
              variant={tool === 'draw' ? "default" : "ghost"} 
              size="sm"
              onClick={() => setTool('draw')}
              className="w-24 flex items-center justify-center gap-2"
              title="Draw Mode"
            >
              <Square className="w-4 h-4" />
              <span className="text-xs">Draw</span>
            </Button>
          </div>
        </div>
      </div>

      {/* Layer Controls */}
      {availableLayers.length > 0 && (
        <Card className="absolute bottom-4 left-4 p-4 bg-card/95 backdrop-blur-sm border border-border/30 shadow-lg max-w-sm z-[1000]">
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-sm font-medium flex items-center gap-2 text-foreground">
              <Layers className="w-4 h-4" />
              Earth Engine Layers
            </h4>
            <Badge variant="outline" className="text-xs">
              {activeLayers.length} Active
            </Badge>
          </div>
          
          <div className="space-y-2">
            {availableLayers.map((layer) => (
              <div key={layer.id}>
                <Button
                  variant={activeLayers.includes(layer.id) ? "default" : "ghost"}
                  size="sm"
                  onClick={() => toggleLayer(layer.id)}
                  className="w-full justify-start text-xs h-8"
                  disabled={!drawnGeometry}
                >
                  <Map className="w-3 h-3 mr-2" />
                  {layer.name}
                  {layer.is_mock && (
                    <Badge variant="secondary" className="ml-2 text-xs">Mock</Badge>
                  )}
                </Button>
                {activeLayers.includes(layer.id) && (
                  <p className="text-xs text-muted-foreground ml-5 mt-1">
                    {layer.description}
                  </p>
                )}
              </div>
            ))}
          </div>

          <Separator className="my-3" />

          <div className="text-xs text-muted-foreground">
            {drawnGeometry ? (
              <div>
                <div className="font-medium mb-1">Active Region</div>
                <div>Type: {drawnGeometry.type}</div>
                <div>Bounds: {drawnGeometry.bounds.getSouthWest().lat.toFixed(2)}, {drawnGeometry.bounds.getSouthWest().lng.toFixed(2)} to {drawnGeometry.bounds.getNorthEast().lat.toFixed(2)}, {drawnGeometry.bounds.getNorthEast().lng.toFixed(2)}</div>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <AlertCircle className="w-3 h-3" />
                Draw a region to load Earth Engine layers
              </div>
            )}
          </div>
        </Card>
      )}

      {/* Error State */}
      {error && (
        <div className="absolute bottom-4 right-4 z-[1000]">
          <Card className="p-4 bg-destructive/10 border-destructive/20 max-w-sm">
            <div className="flex items-center gap-2 text-sm text-destructive">
              <AlertCircle className="w-4 h-4" />
              <span className="font-medium">Layer Loading Error</span>
            </div>
            <p className="text-xs text-destructive/80 mt-2">
              {error}
            </p>
            <Button 
              size="sm" 
              variant="outline" 
              onClick={() => setError(null)}
              className="mt-2 text-xs h-7"
            >
              <X className="w-3 h-3 mr-1" />
              Dismiss
            </Button>
          </Card>
        </div>
      )}

      {/* Instructions */}
      {!drawnGeometry && tool === 'draw' && (
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-[1000]">
          <div className="bg-card/95 backdrop-blur-sm border border-border/30 rounded-lg px-4 py-3 shadow-lg text-center">
            <div className="flex items-center justify-center gap-2 mb-2">
              <Square className="w-5 h-5 text-primary" />
              <span className="font-medium">Draw Mode Active</span>
            </div>
            <p className="text-sm text-muted-foreground">
              Draw a rectangle or polygon to analyze with Earth Engine
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdvancedEarthEngineMap; 