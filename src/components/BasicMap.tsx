import React, { useEffect, useRef } from 'react';
import L from 'leaflet';

// Simple test component to verify Leaflet works
const BasicMap: React.FC = () => {
  const mapRef = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    console.log('[BasicMap] Initializing basic map...');
    
    if (!mapRef.current) {
      console.log('[BasicMap] No map ref');
      return;
    }
    
    try {
      // Initialize map
      const map = L.map(mapRef.current, {
        center: [11.0168, 76.9558],
        zoom: 10
      });
      
      console.log('[BasicMap] Map created:', map);
      
      // Add basic tile layer
      const tileLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors'
      });
      
      tileLayer.addTo(map);
      console.log('[BasicMap] Tile layer added');
      
      // Force resize
      setTimeout(() => {
        map.invalidateSize();
        console.log('[BasicMap] Map size invalidated');
      }, 100);
      
      return () => {
        console.log('[BasicMap] Cleaning up...');
        map.remove();
      };
    } catch (error) {
      console.error('[BasicMap] Error:', error);
    }
  }, []);
  
  return (
    <div style={{ height: '100vh', width: '100vw', backgroundColor: 'red' }}>
      <div 
        ref={mapRef} 
        style={{ 
          height: '100%', 
          width: '100%',
          backgroundColor: 'blue'
        }}
      />
    </div>
  );
};

export default BasicMap;
