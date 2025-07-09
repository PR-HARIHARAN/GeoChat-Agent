import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix for default markers
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

interface InteractiveMapProps {
  onMapClick?: (coordinates: { lat: number; lng: number }) => void;
  activeLayer?: string;
  selectedLocation?: { lat: number; lng: number } | null;
  backendStatus?: 'checking' | 'available' | 'unavailable';
}

const InteractiveMap: React.FC<InteractiveMapProps> = ({ 
  onMapClick, 
  activeLayer, 
  selectedLocation,
  backendStatus 
}) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);

  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current) return;

    // Initialize map centered on Coimbatore, Tamil Nadu
    const map = L.map(mapRef.current).setView([11.0168, 76.9558], 10);

    // Add OpenStreetMap tiles
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors',
      maxZoom: 19,
    }).addTo(map);

    // Add satellite layer option
    const satelliteLayer = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
      attribution: 'Tiles © Esri',
      maxZoom: 18,
    });

    // Layer control
    const baseMaps = {
      "Street Map": L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors'
      }),
      "Satellite": satelliteLayer
    };

    L.control.layers(baseMaps).addTo(map);

    // Add click handler
    map.on('click', (e) => {
      const { lat, lng } = e.latlng;
      onMapClick?.({ lat, lng });
    });

    mapInstanceRef.current = map;

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, [onMapClick]);

  // Update marker when selected location changes
  useEffect(() => {
    if (!mapInstanceRef.current) return;

    if (markerRef.current) {
      mapInstanceRef.current.removeLayer(markerRef.current);
      markerRef.current = null;
    }

    if (selectedLocation) {
      const marker = L.marker([selectedLocation.lat, selectedLocation.lng])
        .addTo(mapInstanceRef.current)
        .bindPopup(`
          <div>
            <strong>Selected Location</strong><br/>
            Lat: ${selectedLocation.lat.toFixed(4)}<br/>
            Lng: ${selectedLocation.lng.toFixed(4)}
            ${backendStatus === 'available' ? '<br/><em>Analyzing with Earth Engine...</em>' : ''}
          </div>
        `)
        .openPopup();

      markerRef.current = marker;
    }
  }, [selectedLocation, backendStatus]);

  // Add overlay layers based on active layer
  useEffect(() => {
    if (!mapInstanceRef.current) return;

    // This is where we would add Earth Engine overlays
    // For now, we'll add some mock visualization layers
    if (activeLayer === 'flood-zones') {
      // Add flood zone visualization
      const floodCircle = L.circle([11.0168, 76.9558], {
        color: 'red',
        fillColor: '#f03',
        fillOpacity: 0.2,
        radius: 5000
      }).addTo(mapInstanceRef.current);

      return () => {
        mapInstanceRef.current?.removeLayer(floodCircle);
      };
    }
  }, [activeLayer]);

  return (
    <div className="relative w-full h-full">
      <div 
        ref={mapRef} 
        className="w-full h-full rounded-lg"
        style={{ minHeight: '400px' }}
      />
      
      {/* Status overlay */}
      <div className="absolute top-4 left-4 z-[1000]">
        <div className="bg-white/90 backdrop-blur-sm rounded-lg px-3 py-2 shadow-lg">
          <div className="flex items-center gap-2 text-sm">
            <div className={`w-2 h-2 rounded-full ${
              backendStatus === 'available' ? 'bg-green-500' : 'bg-orange-500'
            }`} />
            <span className="text-gray-700">
              {backendStatus === 'available' ? 'Earth Engine Connected' : 'Mock Mode'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default InteractiveMap;
