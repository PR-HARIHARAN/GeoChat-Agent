import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix for default markers
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

interface SimpleEarthEngineMapProps {
  onLocationClick?: (coordinates: { lat: number; lng: number }) => void;
}

const SimpleEarthEngineMap: React.FC<SimpleEarthEngineMapProps> = ({ onLocationClick }) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const currentLayerRef = useRef<L.TileLayer | null>(null);
  const [status, setStatus] = useState<string>('Initializing...');

  useEffect(() => {
    console.log('[SimpleEarthEngineMap] Component mounted');
    initializeMap();
    
    // Handle window resize
    const handleResize = () => {
      if (mapInstanceRef.current) {
        setTimeout(() => {
          mapInstanceRef.current?.invalidateSize();
        }, 100);
      }
    };
    
    window.addEventListener('resize', handleResize);
    
    // Cleanup
    return () => {
      console.log('[SimpleEarthEngineMap] Component unmounting');
      window.removeEventListener('resize', handleResize);
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  const log = (message: string) => {
    console.log(`[SimpleEarthEngineMap] ${message}`);
    setStatus(message);
  };

  const initializeMap = () => {
    if (!mapRef.current) {
      log('❌ Map ref not available');
      return;
    }
    
    if (mapInstanceRef.current) {
      log('ℹ️ Map already initialized');
      return;
    }

    log('Initializing map...');
    
    try {
      // Initialize map with explicit size
      const map = L.map(mapRef.current, {
        preferCanvas: false,
        attributionControl: true,
        zoomControl: true
      }).setView([11.0168, 76.9558], 10);
      
      // Add base layer - using satellite like the working test
      const baseLayer = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
        attribution: 'Tiles © Esri',
        maxZoom: 18
      });
      
      baseLayer.on('tileerror', (e) => {
        console.warn('Base tile error:', e);
      });
      
      baseLayer.on('tileload', () => {
        log('✅ Base tiles loaded');
      });
      
      baseLayer.addTo(map);
      
      // Add click handler
      map.on('click', (e) => {
        const { lat, lng } = e.latlng;
        log(`Map clicked: ${lat.toFixed(4)}, ${lng.toFixed(4)}`);
        onLocationClick?.({ lat, lng });
        
        // Add a marker
        L.marker([lat, lng])
          .addTo(map)
          .bindPopup(`<b>Location</b><br/>Lat: ${lat.toFixed(4)}<br/>Lng: ${lng.toFixed(4)}`)
          .openPopup();
      });
      
      // Force map to resize properly
      setTimeout(() => {
        map.invalidateSize();
        log('✅ Map size invalidated');
      }, 100);
      
      mapInstanceRef.current = map;
      log('✅ Map initialized successfully');
      
      // Auto-load Earth Engine layer (like the test file)
      setTimeout(() => {
        loadEarthEngineLayer();
      }, 1000);
      
    } catch (error) {
      log(`❌ Map initialization failed: ${error}`);
      console.error('Map init error:', error);
    }
  };

  const loadEarthEngineLayer = async () => {
    log('Loading Earth Engine layer from backend...');
    
    try {
      const response = await fetch('http://localhost:8000/api/earth-engine/live-layers');
      const data = await response.json();
      
      if (data.status === 'success') {
        log('✅ Live layers endpoint working');
        console.log('🔍 Full response data:', data);
        
        // Get elevation layer (like in the test file)
        const elevationLayer = data.layers.elevation;
        console.log('🔍 Elevation layer:', elevationLayer);
        
        if (elevationLayer && elevationLayer.tile_url) {
          
          // Remove existing layer if any
          if (currentLayerRef.current && mapInstanceRef.current) {
            mapInstanceRef.current.removeLayer(currentLayerRef.current);
          }
          
          // Instead of using the proxy URL, use the Earth Engine URL directly
          // This bypasses our problematic proxy and uses the direct EE API
          let finalTileUrl = elevationLayer.tile_url;
          
          // Check if it's our proxy URL format and convert to direct EE URL if needed
          if (finalTileUrl.includes('localhost:8000/api/earth-engine/tiles/')) {
            // Extract layer info and build direct EE URL
            // For now, let's request a fresh URL from a different endpoint
            log('🔄 Getting direct Earth Engine URL...');
            
            try {
              const directResponse = await fetch('http://localhost:8000/api/earth-engine/test-map');
              const directData = await directResponse.json();
              
              if (directData.status === 'success' && directData.layers && directData.layers.elevation) {
                finalTileUrl = directData.layers.elevation.url;
                log(`Using direct EE URL: ${finalTileUrl}`);
              }
            } catch (e) {
              log(`Failed to get direct URL: ${e}`);
            }
          }
          
          log(`Loading tile URL: ${finalTileUrl}`);
          
          const tileLayer = L.tileLayer(finalTileUrl, {
            attribution: 'Google Earth Engine',
            opacity: 0.7,
            errorTileUrl: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg=='
          });
          
          tileLayer.on('tileerror', (e) => {
            log(`❌ Tile error: ${e}`);
            console.error('Tile error details:', e);
          });
          
          tileLayer.on('tileloadstart', () => {
            log('🔄 Loading tiles...');
          });
          
          tileLayer.on('tileload', () => {
            log('✅ Tiles loaded successfully');
          });
          
          if (mapInstanceRef.current) {
            tileLayer.addTo(mapInstanceRef.current);
            currentLayerRef.current = tileLayer;
            log('✅ Earth Engine elevation layer added to map');
          }
        } else {
          log('❌ No elevation layer found in response');
        }
      } else {
        log(`❌ Live layers failed: ${data.message}`);
      }
    } catch (error) {
      log(`❌ Request failed: ${error}`);
      console.error('Full error:', error);
    }
  };

  return (
    <div 
      className="relative w-full h-full" 
      style={{ 
        height: '100vh', 
        width: '100vw'
      }}
    >
      <div 
        ref={mapRef} 
        className="w-full h-full"
        style={{ 
          height: '100vh',
          width: '100vw',
          zIndex: 0
        }}
      />
      
      {/* Status display */}
      <div className="absolute top-4 left-4 z-[1000]">
        <div className="bg-white/95 backdrop-blur-sm rounded-lg px-3 py-2 shadow-lg">
          <div className="text-sm font-medium">{status}</div>
        </div>
      </div>
      
      {/* Test button */}
      <div className="absolute top-4 right-4 z-[1000]">
        <button 
          onClick={loadEarthEngineLayer}
          className="bg-blue-500 text-white px-3 py-2 rounded-lg text-sm hover:bg-blue-600"
        >
          Load EE Layer
        </button>
      </div>
    </div>
  );
};

export default SimpleEarthEngineMap;
