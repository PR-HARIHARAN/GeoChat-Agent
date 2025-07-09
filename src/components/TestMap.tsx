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

const TestMap: React.FC = () => {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);

  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current) return;

    console.log('Initializing simple test map...');
    
    // Initialize map
    const map = L.map(mapRef.current, {
      preferCanvas: false,
      attributionControl: true,
      zoomControl: true
    }).setView([11.0168, 76.9558], 10);
    
    // Add base layer
    const baseLayer = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
      attribution: 'Tiles © Esri',
      maxZoom: 18
    });
    
    baseLayer.on('tileload', () => {
      console.log('✅ Base tile loaded');
    });
    
    baseLayer.on('tileerror', (e) => {
      console.error('❌ Base tile error:', e);
    });
    
    baseLayer.addTo(map);
    
    // Force map to resize properly
    setTimeout(() => {
      map.invalidateSize();
      console.log('✅ Map size invalidated');
    }, 100);
    
    mapInstanceRef.current = map;
    console.log('✅ Test map initialized');

    // Cleanup
    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  return (
    <div className="w-full h-full">
      <div 
        ref={mapRef} 
        className="w-full h-full"
        style={{ 
          height: '100vh',
          width: '100vw'
        }}
      />
    </div>
  );
};

export default TestMap;
