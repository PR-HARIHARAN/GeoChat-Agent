import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

const MinimalLeafletMap: React.FC = () => {
  const mapRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!mapRef.current) return;
    const map = L.map(mapRef.current).setView([11.0168, 76.9558], 11);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors',
      maxZoom: 19,
    }).addTo(map);
    return () => { map.remove(); };
  }, []);
  return (
    <div style={{ width: '100vw', height: '100vh', border: '4px solid purple' }} ref={mapRef} />
  );
};
export default MinimalLeafletMap;
