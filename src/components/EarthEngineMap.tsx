import React, { useState, useEffect, useRef, useCallback } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix for default markers
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

interface EarthEngineMapProps {
  onLocationClick?: (coordinates: { lat: number; lng: number }) => void;
  mapObject?: any;
  center?: { lat: number; lng: number } | null;
  showFloodOverlay?: boolean;
  onFloodOverlayShown?: () => void;
}

interface EarthEngineLayer {
  name: string;
  tile_url: string;
  map_id: string;
  token: string;
  description: string;
}

interface EarthEngineLayersResponse {
  status: string;
  location: { lat: number; lng: number };
  layers: Record<string, EarthEngineLayer>;
  timestamp: string;
  request_count: number;
}

const EarthEngineMap: React.FC<EarthEngineMapProps> = ({ onLocationClick, mapObject, center, showFloodOverlay, onFloodOverlayShown }) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const layersRef = useRef<Record<string, L.TileLayer>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingLayers, setIsLoadingLayers] = useState(false);
  const [currentLayers, setCurrentLayers] = useState<Record<string, EarthEngineLayer>>({});
  const [error, setError] = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const markerRef = useRef<L.Marker | null>(null);
  const floodOverlayRef = useRef<L.Circle | null>(null);

  // Function to fetch Earth Engine layers from backend
  const fetchEarthEngineLayers = useCallback(async (lat: number, lng: number) => {
    setIsLoadingLayers(true);
    setError(null);
    
    try {
      const response = await fetch(`http://localhost:8000/api/earth-engine/live-layers?lat=${lat}&lng=${lng}`);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      const data: EarthEngineLayersResponse = await response.json();
      if (data.status === 'success' && data.layers) {
        setCurrentLayers(data.layers);
        setLastUpdate(new Date());
        addLayersToMap(data.layers);
        return data.layers;
      } else {
        throw new Error('Invalid response format from backend');
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Unknown error';
      setError(`Failed to load Earth Engine data: ${errorMsg}`);
      return null;
    } finally {
      setIsLoadingLayers(false);
    }
  }, []);

  // Function to add Earth Engine layers to the map
  const addLayersToMap = useCallback((layers: Record<string, EarthEngineLayer>) => {
    if (!mapInstanceRef.current) return;
    // Remove existing Earth Engine layers
    Object.values(layersRef.current).forEach(layer => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.removeLayer(layer);
      }
    });
    layersRef.current = {};
    // Add new layers
    Object.entries(layers).forEach(([key, layer]) => {
      try {
        const tileLayer = L.tileLayer(layer.tile_url, {
          attribution: `Earth Engine - ${layer.name}`,
          maxZoom: 18,
          minZoom: 3,
        });
        tileLayer.addTo(mapInstanceRef.current!);
        layersRef.current[key] = tileLayer;
      } catch (err) {
        // Ignore
      }
    });
  }, []);

  // Function to refresh layers when map moves
  const handleMapMove = useCallback(() => {
    if (!mapInstanceRef.current || isLoadingLayers) return;
    const center = mapInstanceRef.current.getCenter();
    // Debounce the layer refresh
    const timeoutId = setTimeout(() => {
      fetchEarthEngineLayers(center.lat, center.lng);
    }, 1000);
    return () => clearTimeout(timeoutId);
  }, [fetchEarthEngineLayers, isLoadingLayers]);

  // Initialize map
  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current) return;
    // Initialize map centered on Coimbatore
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
    // Add only the satellite base layer (Esri World Imagery)
    const satelliteLayer = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
      attribution: 'Tiles © Esri — Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community',
      maxZoom: 18,
      minZoom: 3,
    }).addTo(map);
    mapInstanceRef.current = map;
    setIsLoading(false);
    map.on('click', (e) => {
      if (onLocationClick) {
        onLocationClick({ lat: e.latlng.lat, lng: e.latlng.lng });
      }
    });
    // Initial fetch
    fetchEarthEngineLayers(11.0168, 76.9558);
    // Set up interval for auto-refresh every 10 minutes
    const intervalId = setInterval(() => {
      const center = map.getCenter();
      fetchEarthEngineLayers(center.lat, center.lng);
    }, 600000); // 10 minutes
    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
      clearInterval(intervalId);
    };
  }, [fetchEarthEngineLayers, onLocationClick]);

  // Effect to update marker and map view when mapObject changes
  useEffect(() => {
    if (!mapInstanceRef.current || !mapObject) return;
    
    console.log('Updating map with object:', mapObject);
    
    // Remove previous marker if it exists
    if (markerRef.current) {
      mapInstanceRef.current.removeLayer(markerRef.current);
      markerRef.current = null;
    }
    
    // Handle different formats of mapObject
    const lat = mapObject.lat || (mapObject.center && mapObject.center.lat);
    const lng = mapObject.lng || (mapObject.center && mapObject.center.lng) || mapObject.lon;
    const zoom = mapObject.zoom || 13;
    const title = mapObject.name || 'Analyzed Location';
    
    // If we have valid coordinates, update the map
    if (lat && lng) {
      // Add a marker at the location
      const marker = L.marker([lat, lng], {
        title: title,
        icon: L.icon({
          iconUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png',
          iconRetinaUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon-2x.png',
          shadowUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png',
          iconSize: [25, 41],
          iconAnchor: [12, 41],
          popupAnchor: [1, -34],
          shadowSize: [41, 41]
        })
      }).addTo(mapInstanceRef.current);
      
      // Add a popup with the location name if available
      if (title) {
        marker.bindPopup(`<b>${title}</b>`).openPopup();
      }
      
      markerRef.current = marker;
      
      // Pan and zoom to the marker
      mapInstanceRef.current.setView([lat, lng], zoom);
      
      // If there's analysis data, we might want to show additional layers or info
      if (mapObject.analysis) {
        console.log('Analysis data available:', mapObject.analysis);
        // Here you could add additional layers based on analysis data
      }
    }
  }, [mapObject]);

  // Effect to update map center when center prop changes
  useEffect(() => {
    if (!mapInstanceRef.current || !center) return;
    
    const currentZoom = mapInstanceRef.current.getZoom();
    const newZoom = currentZoom > 0 ? currentZoom : 11; // Default zoom if not set
    
    // Only update if the center actually changed
    const currentCenter = mapInstanceRef.current.getCenter();
    if (Math.abs(currentCenter.lat - center.lat) > 0.0001 || 
        Math.abs(currentCenter.lng - center.lng) > 0.0001) {
      mapInstanceRef.current.setView([center.lat, center.lng], newZoom);
    }
  }, [center]);

  // Effect to show flood overlay when showFloodOverlay is true
  useEffect(() => {
    if (!mapInstanceRef.current || !showFloodOverlay || !center) return;
    // Remove previous overlay
    if (floodOverlayRef.current) {
      mapInstanceRef.current.removeLayer(floodOverlayRef.current);
      floodOverlayRef.current = null;
    }
    // Add flood vulnerability overlay (e.g., a red circle)
    const circle = L.circle([center.lat, center.lng], {
      color: 'red',
      fillColor: '#f03',
      fillOpacity: 0.3,
      radius: 10000 // 10km buffer, adjust as needed
    }).addTo(mapInstanceRef.current);
    floodOverlayRef.current = circle;
    // Optionally pan to the overlay
    mapInstanceRef.current.setView([center.lat, center.lng], 12);
    // Reset the flag after showing
    if (onFloodOverlayShown) onFloodOverlayShown();
    // Cleanup on unmount or prop change
    return () => {
      if (floodOverlayRef.current && mapInstanceRef.current) {
        mapInstanceRef.current.removeLayer(floodOverlayRef.current);
        floodOverlayRef.current = null;
      }
    };
  }, [showFloodOverlay, center, onFloodOverlayShown]);

  return (
    <div className="relative w-full h-full">
      {/* Map Container */}
      <div 
        ref={mapRef} 
        className="w-full h-full rounded-lg"
        style={{ minHeight: '500px' }}
      />
      {isLoading && (
        <div className="absolute inset-0 bg-black/50 flex items-center justify-center rounded-lg">
          <div className="bg-white p-4 rounded-lg flex items-center gap-2">
            <div className="w-5 h-5 border-2 border-gray-300 border-t-blue-600 rounded-full animate-spin"></div>
            <span>Initializing Earth Engine Map...</span>
          </div>
        </div>
      )}
      {isLoadingLayers && !isLoading && (
        <div className="absolute top-4 right-4 bg-white/90 p-3 rounded-lg shadow-lg">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 border-2 border-gray-300 border-t-green-600 rounded-full animate-spin"></div>
            <span className="text-sm font-medium">Loading Earth Engine Data...</span>
          </div>
        </div>
      )}
      {error && (
        <div className="absolute top-4 left-4 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg shadow-lg max-w-md">
          <div className="flex items-center gap-2">
            <span className="text-red-500">⚠️</span>
            <span className="text-sm">{error}</span>
          </div>
        </div>
      )}
      {/* Real-time Map Badge and Last Updated */}
      <div className="absolute top-4 right-4 flex items-center gap-2 z-10">
        <span className="bg-green-500 text-white px-3 py-1 rounded-full text-xs font-semibold shadow">Real-time Map</span>
        {lastUpdate && (
          <span className="bg-white/90 text-gray-700 px-2 py-1 rounded text-xs border border-gray-300">Last updated on: {lastUpdate.toLocaleString()}</span>
        )}
        </div>
    </div>
  );
};

export default EarthEngineMap;
