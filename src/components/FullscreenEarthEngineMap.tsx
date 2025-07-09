import React, { useState, useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, Layers, Satellite, Map } from 'lucide-react';

// Fix for default markers
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

interface FullscreenEarthEngineMapProps {
  onLocationClick?: (coordinates: { lat: number; lng: number }) => void;
}

const FullscreenEarthEngineMap: React.FC<FullscreenEarthEngineMapProps> = ({ onLocationClick }) => {
  console.log('FullscreenEarthEngineMap component is loading!');
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [earthEngineStatus, setEarthEngineStatus] = useState<'loading' | 'connected' | 'error'>('loading');
  const [availableLayers, setAvailableLayers] = useState<any>(null);
  const [activeLayers, setActiveLayers] = useState<string[]>([]);
  const layerGroupsRef = useRef<{ [key: string]: L.TileLayer }>({});

  useEffect(() => {
    initializeMap();
    loadEarthEngineLayers();
    
    // Cleanup on unmount
    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (availableLayers && Object.keys(availableLayers).length > 0 && activeLayers.length === 0) {
      const firstLayerId = Object.keys(availableLayers)[0];
      toggleLayer(firstLayerId);
    }
  }, [availableLayers]);

  const initializeMap = () => {
    if (!mapRef.current || mapInstanceRef.current) return;

    console.log('[FullscreenEarthEngineMap] Initializing map...');

    // Initialize map centered on Coimbatore with fullscreen view
    const map = L.map(mapRef.current, {
      preferCanvas: false,
      attributionControl: true,
      zoomControl: true
    }).setView([11.0168, 76.9558], 11);

    // Add satellite base layer as default
    const satelliteLayer = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
      attribution: 'Tiles © Esri',
      maxZoom: 18,
    });

    satelliteLayer.on('tileload', () => {
      console.log('[FullscreenEarthEngineMap] Base tiles loaded');
    });

    satelliteLayer.addTo(map);

    // Add OpenStreetMap layer as alternative
    const streetLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors',
      maxZoom: 19,
    });

    // Layer control (positioned to not interfere with floating UI)
    const baseMaps = {
      "Satellite": satelliteLayer,
      "Street Map": streetLayer
    };

    L.control.layers(baseMaps, {}, { position: 'bottomright' }).addTo(map);

    // Add click handler
    map.on('click', (e) => {
      const { lat, lng } = e.latlng;
      console.log(`[FullscreenEarthEngineMap] Map clicked: ${lat.toFixed(4)}, ${lng.toFixed(4)}`);
      onLocationClick?.({ lat, lng });
      
      // Add a marker at clicked location
      L.marker([lat, lng])
        .addTo(map)
        .bindPopup(`<b>Analyzing Location</b><br/>Lat: ${lat.toFixed(4)}<br/>Lng: ${lng.toFixed(4)}`)
        .openPopup();
    });

    // Force map to resize properly for fullscreen
    setTimeout(() => {
      map.invalidateSize();
      console.log('[FullscreenEarthEngineMap] Map size invalidated');
    }, 100);

    mapInstanceRef.current = map;
    setIsLoading(false);
    console.log('[FullscreenEarthEngineMap] Map initialized successfully');
  };

  const loadEarthEngineLayers = async () => {
    try {
      setEarthEngineStatus('loading');
      
      // Try to get live Earth Engine layers
      const response = await fetch('http://localhost:8000/api/earth-engine/live-layers?lat=11.0168&lng=76.9558');
      const data = await response.json();

      if (data.status === 'success') {
        setAvailableLayers(data.layers);
        setEarthEngineStatus('connected');
        console.log('✅ [FullscreenEarthEngineMap] Earth Engine layers loaded:', Object.keys(data.layers));
      } else {
        throw new Error(data.message || 'Failed to load layers');
      }
    } catch (error) {
      console.error('❌ [FullscreenEarthEngineMap] Failed to load Earth Engine layers:', error);
      setEarthEngineStatus('error');
    }
  };

  const toggleLayer = (layerId: string) => {
    if (!mapInstanceRef.current || !availableLayers) return;

    const layer = availableLayers[layerId];
    if (!layer) return;

    // Remove layer if active
    if (activeLayers.includes(layerId)) {
      const tileLayer = layerGroupsRef.current[layerId];
      if (tileLayer) {
        mapInstanceRef.current.removeLayer(tileLayer);
        delete layerGroupsRef.current[layerId];
      }
      setActiveLayers(prev => prev.filter(id => id !== layerId));
      console.log(`[FullscreenEarthEngineMap] Removed layer: ${layerId}`);
    } else {
      // Add layer
      const tileUrl = layer.tile_url || layer.url;
      
      const tileLayer = L.tileLayer(tileUrl, {
        attribution: 'Google Earth Engine',
        opacity: 0.7,
        maxZoom: 18,
      });

      tileLayer.on('tileload', () => {
        console.log(`[FullscreenEarthEngineMap] Earth Engine tiles loaded for: ${layerId}`);
      });

      tileLayer.on('tileerror', (e) => {
        console.error(`[FullscreenEarthEngineMap] Tile error for ${layerId}:`, e);
      });

      tileLayer.addTo(mapInstanceRef.current);
      layerGroupsRef.current[layerId] = tileLayer;
      setActiveLayers(prev => [...prev, layerId]);
      console.log(`[FullscreenEarthEngineMap] Added layer: ${layerId}`);
    }
  };

  const getStatusColor = () => {
    switch (earthEngineStatus) {
      case 'connected': return 'bg-green-500';
      case 'error': return 'bg-red-500';
      default: return 'bg-yellow-500';
    }
  };

  const getStatusText = () => {
    switch (earthEngineStatus) {
      case 'connected': return 'Earth Engine Connected';
      case 'error': return 'Connection Failed';
      default: return 'Connecting...';
    }
  };

  return (
    <div style={{position: 'absolute', inset: 0, width: '100vw', height: '100vh', zIndex: 0, overflow: 'visible', background: '#eee'}}>
      {/* DEBUGGING: This should be visible if the component loads */}
      <div className="absolute top-0 left-0 z-[9999] bg-red-500 text-white p-4 text-xl font-bold">
        FULLSCREEN EARTH ENGINE MAP LOADED!
      </div>

      {/* Fullscreen Map Container */}
      <div
        ref={mapRef}
        className="leaflet-container"
        style={{
          width: '100vw',
          height: '100vh',
          minHeight: '100vh',
          minWidth: '100vw',
          zIndex: 1,
          background: '#fff',
          outline: '4px solid purple',
        }}
      />

      {/* Loading Overlay */}
      {isLoading && (
        <div className="absolute inset-0 bg-black/50 flex items-center justify-center z-[9999]">
          <div className="bg-white p-4 rounded-lg flex items-center gap-2">
            <Loader2 className="w-5 h-5 animate-spin" />
            <span>Loading Map...</span>
          </div>
        </div>
      )}

      {/* Compact Status Indicator - positioned to avoid main UI */}
      <div className="absolute bottom-4 right-4 z-[1000]">
        <div className="bg-white/95 backdrop-blur-sm rounded-lg px-3 py-2 shadow-lg">
          <div className="flex items-center gap-2 text-sm">
            <div className={`w-2 h-2 rounded-full ${getStatusColor()}`} />
            <Satellite className="w-4 h-4" />
            <span className="font-medium">{getStatusText()}</span>
          </div>
        </div>
      </div>

      {/* Compact Layer Controls - positioned to avoid main UI */}
      {availableLayers && earthEngineStatus === 'connected' && (
        <div className="absolute bottom-20 right-4 z-[1000]">
          <div className="bg-white/95 backdrop-blur-sm rounded-lg p-3 shadow-lg max-w-xs">
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-sm font-medium flex items-center gap-2">
                <Layers className="w-4 h-4" />
                EE Layers
              </h4>
              <Badge variant="outline" className="text-xs">
                {activeLayers.length} Active
              </Badge>
            </div>
            
            <div className="space-y-2">
              {Object.entries(availableLayers).map(([layerId, layer]: [string, any]) => (
                <Button
                  key={layerId}
                  variant={activeLayers.includes(layerId) ? "default" : "ghost"}
                  size="sm"
                  onClick={() => toggleLayer(layerId)}
                  className="w-full justify-start text-xs h-8"
                >
                  <Map className="w-3 h-3 mr-2" />
                  {layer.name}
                </Button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Error State - compact for fullscreen */}
      {earthEngineStatus === 'error' && (
        <div className="absolute top-4 right-4 z-[1000]">
          <div className="bg-red-50/95 backdrop-blur-sm border border-red-200 rounded-lg p-3 max-w-sm">
            <div className="flex items-center gap-2 text-sm text-red-700">
              <div className="w-2 h-2 bg-red-500 rounded-full" />
              <span className="font-medium">EE Offline</span>
            </div>
            <Button 
              size="sm" 
              variant="outline" 
              onClick={loadEarthEngineLayers}
              className="mt-2 text-xs h-7"
            >
              Retry
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default FullscreenEarthEngineMap;
