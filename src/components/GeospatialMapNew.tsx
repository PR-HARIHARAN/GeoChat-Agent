import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Layers, ZoomIn, ZoomOut, MousePointer, Square, Download, Share } from 'lucide-react';
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
    { id: 'flood-zones', name: 'Flood Zones', color: 'hsl(var(--destructive))', description: 'High/Medium/Low Risk Areas' },
    { id: 'buildings', name: 'Building Footprints', color: 'hsl(var(--accent))', description: 'Infrastructure Outlines' },
    { id: 'svi', name: 'Social Vulnerability', color: 'hsl(var(--warning))', description: 'Community Risk Index' },
    { id: 'infrastructure', name: 'Critical Infrastructure', color: 'hsl(var(--primary))', description: 'Hospitals, Schools, Power' }
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

  const handleMapClick = (coordinates: { lat: number; lng: number }) => {
    setClickedLocation(coordinates);
    onMapClick?.(coordinates);
  };

  return (
    <div className="relative w-full h-full rounded-lg overflow-hidden">
      {/* Interactive Map */}
      <InteractiveMap 
        onMapClick={handleMapClick}
        activeLayer={activeLayer}
        selectedLocation={clickedLocation}
        backendStatus={backendStatus}
      />

      {/* Map Tools */}
      <div className="absolute top-4 right-4 flex flex-col gap-2 z-[1000]">
        <div className="flex flex-col gap-1 bg-white/90 backdrop-blur-sm rounded-lg p-1 shadow-lg">
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
        
        <div className="flex flex-col gap-1 bg-white/90 backdrop-blur-sm rounded-lg p-1 shadow-lg">
          <Button variant="ghost" size="icon" className="w-8 h-8">
            <ZoomIn className="w-4 h-4" />
          </Button>
          <Button variant="ghost" size="icon" className="w-8 h-8">
            <ZoomOut className="w-4 h-4" />
          </Button>
        </div>

        <div className="flex flex-col gap-1 bg-white/90 backdrop-blur-sm rounded-lg p-1 shadow-lg">
          <Button variant="ghost" size="icon" className="w-8 h-8">
            <Download className="w-4 h-4" />
          </Button>
          <Button variant="ghost" size="icon" className="w-8 h-8">
            <Share className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Enhanced Layer Controls */}
      <Card className="absolute bottom-4 left-4 p-4 bg-white/95 backdrop-blur-sm border shadow-lg max-w-sm z-[1000]">
        <div className="flex items-center justify-between mb-3">
          <h4 className="text-sm font-medium">Data Layers</h4>
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
        <div className="mt-4 pt-3 border-t">
          <h5 className="text-xs font-medium mb-2">Flood Risk Legend</h5>
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

      {/* Loading Indicator */}
      {isLoadingLayers && (
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-[1000]">
          <div className="bg-white/90 backdrop-blur-sm rounded-lg px-4 py-2 shadow-lg">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
              <span className="text-sm">Loading Earth Engine Layers...</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default GeospatialMap;
