import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Layers, ZoomIn, ZoomOut, MousePointer, Square, Download, Share, Satellite } from 'lucide-react';
import { apiService } from '@/services/api';
import InteractiveMap from './InteractiveMap';

interface GeospatialMapProps {
  onLayerToggle?: (layer: string) => void;
  activeLayer?: string;
  onMapClick?: (coordinates: { lat: number; lng: number }) => void;
  backendStatus?: 'checking' | 'available' | 'unavailable';
}

const GeospatialMap: React.FC<GeospatialMapProps> = ({ onLayerToggle, activeLayer, onMapClick, backendStatus = 'checking' }) => {
  const [selectedTool, setSelectedTool] = useState<'select' | 'draw'>('select');
  const [clickedLocation, setClickedLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [mapLayers, setMapLayers] = useState<any>(null);
  const [isLoadingLayers, setIsLoadingLayers] = useState(false);

  const layers = [
    { id: 'flood-zones', name: 'Flood Zones', color: 'hsl(var(--destructive))', description: 'High/Medium/Low Risk Areas', source: 'Earth Engine' },
    { id: 'buildings', name: 'Building Footprints', color: 'hsl(var(--accent))', description: 'Infrastructure Outlines', source: 'Earth Engine' },
    { id: 'svi', name: 'Social Vulnerability', color: 'hsl(var(--warning))', description: 'Community Risk Index', source: 'Earth Engine' },
    { id: 'infrastructure', name: 'Critical Infrastructure', color: 'hsl(var(--primary))', description: 'Hospitals, Schools, Power', source: 'Earth Engine' }
  ];

  // Load Earth Engine map layers when component mounts
  useEffect(() => {
    if (backendStatus === 'available' && clickedLocation) {
      loadMapLayers(clickedLocation.lat, clickedLocation.lng);
    }
  }, [backendStatus, clickedLocation]);

  const loadMapLayers = async (lat: number, lng: number) => {
    setIsLoadingLayers(true);
    try {
      const layers = await apiService.getMapLayers(lat, lng, 12);
      setMapLayers(layers);
    } catch (error) {
      console.error('Failed to load Earth Engine map layers:', error);
    } finally {
      setIsLoadingLayers(false);
    }
  };

  const handleMapClick = (event: React.MouseEvent<HTMLDivElement>) => {
    if (selectedTool === 'select') {
      const rect = event.currentTarget.getBoundingClientRect();
      const x = event.clientX - rect.left;
      const y = event.clientY - rect.top;
      
      // Mock coordinates based on click position
      const mockLat = 11.0 + (y / rect.height) * 0.5; // Mock latitude around Coimbatore
      const mockLng = 76.9 + (x / rect.width) * 0.5; // Mock longitude
      
      const coordinates = { lat: mockLat, lng: mockLng };
      setClickedLocation(coordinates);
      onMapClick?.(coordinates);
    }
  };

  return (
    <div className="relative w-full h-full bg-gradient-atmosphere rounded-lg overflow-hidden">
      {/* Interactive Map Area with Click-to-Query */}
      <div 
        className="absolute inset-0 bg-gradient-to-br from-blue-900/20 to-green-900/20 cursor-crosshair"
        onClick={handleMapClick}
      >
        {/* Earth Engine Map Placeholder */}
        <div className="flex items-center justify-center h-full">
          <div className="text-center p-8">
            <div className="w-24 h-24 mx-auto mb-4 rounded-full bg-gradient-ocean flex items-center justify-center animate-pulse-glow">
              <Satellite className="w-12 h-12 text-white" />
            </div>
            <h3 className="text-2xl font-bold text-white mb-2">
              {backendStatus === 'available' ? 'Earth Engine Live View' : 'Mock Geospatial View'}
            </h3>
            <p className="text-blue-100 mb-4">
              {backendStatus === 'available' 
                ? 'Real-time satellite imagery and analysis layers'
                : 'Click anywhere to simulate location analysis'
              }
            </p>
            
            {/* Status Indicators */}
            <div className="flex justify-center gap-2 mb-4">
              <Badge variant="outline" className="bg-white/10 text-white border-white/30">
                {backendStatus === 'available' ? '🛰️ Live Data' : '📍 Mock Mode'}
              </Badge>
              {isLoadingLayers && (
                <Badge variant="outline" className="bg-blue-500/20 text-blue-200 border-blue-400/30">
                  Loading Layers...
                </Badge>
              )}
            </div>
            
            <p className="text-blue-100 text-sm max-w-sm">
              Interactive geospatial visualization • Click anywhere to query flood vulnerability
            </p>
          </div>
        </div>

        {/* Clicked Location Indicator */}
        {clickedLocation && (
          <div 
            className="absolute w-6 h-6 bg-primary/80 border-2 border-white rounded-full animate-pulse-glow transform -translate-x-1/2 -translate-y-1/2 pointer-events-none"
            style={{
              left: `${((clickedLocation.lng - 76.9) / 0.5) * 100}%`,
              top: `${((clickedLocation.lat - 11.0) / 0.5) * 100}%`
            }}
          />
        )}
      </div>

      {/* Map Tools */}
      <div className="absolute top-4 right-4 flex flex-col gap-2">
        <div className="flex flex-col gap-1 bg-card/90 backdrop-blur-sm rounded-lg p-1">
          <Button 
            variant={selectedTool === 'select' ? "default" : "ghost"} 
            size="icon" 
            onClick={() => setSelectedTool('select')}
            className="w-8 h-8"
          >
            <MousePointer className="w-4 h-4" />
          </Button>
          <Button 
            variant={selectedTool === 'draw' ? "default" : "ghost"} 
            size="icon" 
            onClick={() => setSelectedTool('draw')}
            className="w-8 h-8"
          >
            <Square className="w-4 h-4" />
          </Button>
        </div>
        
        <div className="flex flex-col gap-1 bg-card/90 backdrop-blur-sm rounded-lg p-1">
          <Button variant="ghost" size="icon" className="w-8 h-8">
            <ZoomIn className="w-4 h-4" />
          </Button>
          <Button variant="ghost" size="icon" className="w-8 h-8">
            <ZoomOut className="w-4 h-4" />
          </Button>
        </div>

        <div className="flex flex-col gap-1 bg-card/90 backdrop-blur-sm rounded-lg p-1">
          <Button variant="ghost" size="icon" className="w-8 h-8">
            <Download className="w-4 h-4" />
          </Button>
          <Button variant="ghost" size="icon" className="w-8 h-8">
            <Share className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Enhanced Layer Controls with Legend */}
      <Card className="absolute bottom-4 left-4 p-4 bg-card/95 backdrop-blur-sm border-border/50 max-w-sm">
        <div className="flex items-center justify-between mb-3">
          <h4 className="text-sm font-medium text-foreground">Data Layers</h4>
          <Badge variant="outline" className="text-xs">
            {layers.filter(l => activeLayer === l.id).length} Active
          </Badge>
        </div>
        
        <div className="space-y-2">
          {layers.map((layer) => (
            <div key={layer.id} className="space-y-1">
              <Button
                variant={activeLayer === layer.id ? "default" : "ghost"}
                size="sm"
                onClick={() => onLayerToggle?.(layer.id)}
                className="w-full justify-start text-xs h-8"
              >
                <div 
                  className="w-3 h-3 rounded-full mr-2" 
                  style={{ backgroundColor: layer.color }}
                />
                {layer.name}
              </Button>
              {activeLayer === layer.id && (
                <p className="text-xs text-muted-foreground ml-5 pl-1">
                  {layer.description}
                </p>
              )}
            </div>
          ))}
        </div>

        {/* Legend */}
        <div className="mt-4 pt-3 border-t border-border/50">
          <h5 className="text-xs font-medium text-foreground mb-2">Flood Risk Legend</h5>
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-xs">
              <div className="w-3 h-3 bg-destructive rounded-full"></div>
              <span className="text-muted-foreground">High Risk</span>
            </div>
            <div className="flex items-center gap-2 text-xs">
              <div className="w-3 h-3 bg-warning rounded-full"></div>
              <span className="text-muted-foreground">Medium Risk</span>
            </div>
            <div className="flex items-center gap-2 text-xs">
              <div className="w-3 h-3 bg-secondary rounded-full"></div>
              <span className="text-muted-foreground">Low Risk</span>
            </div>
          </div>
        </div>
      </Card>

      {/* Status Indicator */}
      <div className="absolute top-4 left-4">
        <div className="flex items-center gap-2 bg-card/90 backdrop-blur-sm rounded-lg px-3 py-2">
          <div className="w-2 h-2 bg-primary rounded-full animate-data-flow"></div>
          <span className="text-xs text-muted-foreground">
            {selectedTool === 'select' ? 'Click to query location' : 'Draw area to analyze'}
          </span>
        </div>
      </div>
    </div>
  );
};

export default GeospatialMap;