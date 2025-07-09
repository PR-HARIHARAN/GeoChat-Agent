import React, { useState } from 'react';
import Header from '@/components/Header';
import EarthEngineMap from '@/components/EarthEngineMap';
import QueryInterface from '@/components/QueryInterface';
import DataPanel from '@/components/DataPanel';

const Index = () => {
  const [activeLayer, setActiveLayer] = useState<string>('');
  const [currentQuery, setCurrentQuery] = useState<string>('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisData, setAnalysisData] = useState<any>(null);
  const [selectedLocation, setSelectedLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [backendStatus, setBackendStatus] = useState<'checking' | 'available' | 'unavailable'>('checking');
  const [mapObject, setMapObject] = useState<any>(null);
  const [showFloodOverlay, setShowFloodOverlay] = useState(false);

  React.useEffect(() => {
    const checkBackend = async () => {
      try {
        const response = await fetch('http://localhost:8000/health');
        if (response.ok) {
          const data = await response.json();
          if (data.earth_engine_initialized) {
            setBackendStatus('available');
          } else {
            setBackendStatus('unavailable');
          }
        } else {
          setBackendStatus('unavailable');
        }
      } catch (error) {
        setBackendStatus('unavailable');
      }
    };
    checkBackend();
    const interval = setInterval(checkBackend, 30000);
    return () => clearInterval(interval);
  }, []);

  const handleMapClick = (coordinates: { lat: number; lng: number }) => {
    console.log('Map clicked at:', coordinates);
    setSelectedLocation(coordinates);
    // Reset the analysis data when clicking a new location
    setAnalysisData(null);
    setCurrentQuery('');
  };

  const handleMapObject = (mapData: any) => {
    console.log('Map object updated:', mapData);
    
    // Update the map object with the new data
    setMapObject(mapData);
    
    // If we have coordinates, update the selected location
    if (mapData?.lat && mapData?.lng) {
      setSelectedLocation({ 
        lat: mapData.lat, 
        lng: mapData.lng 
      });
      
      // Show flood overlay if this is a flood analysis
      if (mapData.analysis?.type === 'flood' || mapData.analysis?.risk_level) {
        setShowFloodOverlay(true);
      }
      
      // Update the current query and analysis data if available
      if (mapData.analysis) {
        setAnalysisData(prev => ({
          ...prev,
          ...mapData.analysis,
          timestamp: new Date().toISOString()
        }));
      }
    }
    
    // If we have a name for the location, update the current query
    if (mapData?.name) {
      setCurrentQuery(`Analysis for ${mapData.name}`);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-atmosphere relative overflow-hidden">
      {/* Fullscreen Map Background */}
      <div className="absolute inset-0">
        <EarthEngineMap 
          onLocationClick={handleMapClick}
          mapObject={mapObject}
          center={selectedLocation}
          showFloodOverlay={showFloodOverlay}
          onFloodOverlayShown={() => setShowFloodOverlay(false)}
        />
      </div>
      {/* Floating Header Overlay */}
      <div className="absolute top-4 left-11 right-60 z-[2000]">
        <div className="w-full bg-card/80 backdrop-blur-md border border-border/30 rounded-xl shadow-elevation">
          <Header earthEngineStatus={backendStatus === 'available' ? 'connected' : backendStatus === 'checking' ? 'checking' : 'error'} />
        </div>
      </div>
      {/* Floating Query Interface - Top Left */}
      <div className="absolute top-40 left-4 z-[2000] w-96 max-w-[calc(100vw-2rem)]">
        <div className="bg-card/85 backdrop-blur-md border border-border/30 rounded-xl shadow-elevation">
          <QueryInterface 
            isLoading={isAnalyzing}
            selectedLocation={selectedLocation}
            onMapObject={handleMapObject}
          />
        </div>
      </div>
      {/* Floating Data Panel - Bottom Left */}
      <div className="absolute bottom-4 left-4 z-[2000] w-80 max-w-[calc(100vw-2rem)]">
        <div className="bg-card/85 backdrop-blur-md border border-border/30 rounded-xl shadow-elevation">
          <DataPanel 
            title={currentQuery || "Analysis Results"}
            data={analysisData}
          />
        </div>
      </div>
    </div>
  );
};

export default Index;
