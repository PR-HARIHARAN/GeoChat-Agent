import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Satellite, MapPin, Zap, Database } from 'lucide-react';
import EarthEngineMap from '@/components/EarthEngineMap';
import { apiService } from '@/services/api';

const EarthEngineDemo = () => {
  const [backendStatus, setBackendStatus] = useState<'checking' | 'connected' | 'offline'>('checking');
  const [selectedLocation, setSelectedLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [analysisData, setAnalysisData] = useState<any>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [testResults, setTestResults] = useState<any>(null);

  useEffect(() => {
    checkBackendStatus();
    loadTestResults();
  }, []);

  const checkBackendStatus = async () => {
    try {
      const health = await apiService.healthCheck();
      setBackendStatus(health.earth_engine_initialized ? 'connected' : 'offline');
    } catch (error) {
      setBackendStatus('offline');
    }
  };

  const loadTestResults = async () => {
    try {
      const response = await fetch('http://localhost:8000/api/earth-engine/test-map');
      const data = await response.json();
      setTestResults(data);
    } catch (error) {
      console.error('Failed to load test results:', error);
    }
  };

  const handleLocationClick = async (coordinates: { lat: number; lng: number }) => {
    setSelectedLocation(coordinates);
    setIsAnalyzing(true);

    try {
      if (backendStatus === 'connected') {
        // Use real Earth Engine analysis
        const response = await apiService.analyzeLocation({
          coordinates,
          include_ai: true
        });
        
        setAnalysisData(response);
      } else {
        // Mock analysis for demo
        setTimeout(() => {
          setAnalysisData({
            coordinates,
            earth_engine_data: {
              elevation: Math.round(200 + Math.random() * 300),
              land_cover: 'Urban',
              flood_risk: Math.random() > 0.5 ? 'Medium' : 'Low',
              building_density: Math.random() * 0.8,
              svi_score: Math.random() * 0.6
            },
            ai_analysis: `Analysis for location ${coordinates.lat.toFixed(4)}, ${coordinates.lng.toFixed(4)}: This area shows ${Math.random() > 0.5 ? 'moderate' : 'low'} flood vulnerability based on terrain and land use patterns.`
          });
        }, 2000);
      }
    } catch (error) {
      console.error('Analysis failed:', error);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const runTestQuery = async () => {
    setIsAnalyzing(true);
    try {
      const response = await apiService.processNaturalQuery({
        query: "What is the flood risk in Coimbatore city center?",
        coordinates: { lat: 11.0168, lng: 76.9558 }
      });
      setAnalysisData(response);
    } catch (error) {
      console.error('Test query failed:', error);
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-green-50 p-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-2 flex items-center gap-2">
            <Satellite className="w-8 h-8 text-blue-600" />
            Earth Engine Integration Demo
          </h1>
          <p className="text-gray-600">
            Real-time satellite data analysis for disaster management using Google Earth Engine
          </p>
        </div>

        {/* Status Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <Database className="w-4 h-4" />
                Backend Status
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${
                  backendStatus === 'connected' ? 'bg-green-500' : 
                  backendStatus === 'offline' ? 'bg-red-500' : 'bg-yellow-500'
                }`} />
                <span className="text-sm font-medium">
                  {backendStatus === 'connected' ? 'Earth Engine Connected' :
                   backendStatus === 'offline' ? 'Backend Offline' : 'Checking...'}
                </span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <MapPin className="w-4 h-4" />
                Selected Location
              </CardTitle>
            </CardHeader>
            <CardContent>
              {selectedLocation ? (
                <div className="text-sm">
                  <div>Lat: {selectedLocation.lat.toFixed(4)}</div>
                  <div>Lng: {selectedLocation.lng.toFixed(4)}</div>
                </div>
              ) : (
                <span className="text-sm text-gray-500">Click on map to select</span>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <Zap className="w-4 h-4" />
                Quick Test
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Button 
                size="sm" 
                onClick={runTestQuery}
                disabled={isAnalyzing}
                className="w-full"
              >
                {isAnalyzing ? 'Analyzing...' : 'Test Coimbatore'}
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Map */}
          <div className="lg:col-span-2">
            <Card className="h-[600px]">
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>Earth Engine Map Visualization</span>
                  <Badge variant={backendStatus === 'connected' ? 'default' : 'secondary'}>
                    {backendStatus === 'connected' ? 'Live Data' : 'Demo Mode'}
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="h-[520px] p-0">
                <EarthEngineMap onLocationClick={handleLocationClick} />
              </CardContent>
            </Card>
          </div>

          {/* Analysis Results */}
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Analysis Results</CardTitle>
              </CardHeader>
              <CardContent>
                {isAnalyzing ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="text-center">
                      <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
                      <p className="text-sm text-gray-500">Analyzing with Earth Engine...</p>
                    </div>
                  </div>
                ) : analysisData ? (
                  <div className="space-y-4">
                    {/* Earth Engine Data */}
                    {analysisData.earth_engine_data && (
                      <div>
                        <h4 className="font-medium text-sm mb-2">Satellite Data:</h4>
                        <div className="space-y-2 text-sm">
                          {analysisData.earth_engine_data.elevation && (
                            <div className="flex justify-between">
                              <span>Elevation:</span>
                              <span className="font-mono">{analysisData.earth_engine_data.elevation}m</span>
                            </div>
                          )}
                          {analysisData.earth_engine_data.land_cover && (
                            <div className="flex justify-between">
                              <span>Land Cover:</span>
                              <span>{analysisData.earth_engine_data.land_cover}</span>
                            </div>
                          )}
                          {analysisData.earth_engine_data.flood_risk && (
                            <div className="flex justify-between">
                              <span>Flood Risk:</span>
                              <Badge variant={
                                analysisData.earth_engine_data.flood_risk === 'High' ? 'destructive' :
                                analysisData.earth_engine_data.flood_risk === 'Medium' ? 'default' : 'secondary'
                              }>
                                {analysisData.earth_engine_data.flood_risk}
                              </Badge>
                            </div>
                          )}
                          {analysisData.earth_engine_data.building_density && (
                            <div className="flex justify-between">
                              <span>Building Density:</span>
                              <span>{(analysisData.earth_engine_data.building_density * 100).toFixed(1)}%</span>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* AI Analysis */}
                    {analysisData.ai_analysis && (
                      <div>
                        <h4 className="font-medium text-sm mb-2">AI Analysis:</h4>
                        <p className="text-sm text-gray-600 leading-relaxed">
                          {analysisData.ai_analysis}
                        </p>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <MapPin className="w-12 h-12 text-gray-300 mx-auto mb-2" />
                    <p className="text-sm text-gray-500">
                      Click anywhere on the map to analyze that location with Earth Engine data
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Test Results */}
            {testResults && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">System Status</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span>Earth Engine:</span>
                      <Badge variant={testResults.earth_engine_connected ? 'default' : 'secondary'}>
                        {testResults.earth_engine_connected ? 'Connected' : 'Offline'}
                      </Badge>
                    </div>
                    {testResults.layers && (
                      <div className="flex justify-between">
                        <span>Available Layers:</span>
                        <span>{Object.keys(testResults.layers).length}</span>
                      </div>
                    )}
                    {testResults.timestamp && (
                      <div className="flex justify-between">
                        <span>Last Updated:</span>
                        <span className="font-mono text-xs">
                          {new Date(testResults.timestamp).toLocaleTimeString()}
                        </span>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>

        {/* Instructions */}
        <Alert className="mt-6">
          <Satellite className="h-4 w-4" />
          <AlertDescription>
            <strong>How to use:</strong> Click anywhere on the map to analyze that location using Google Earth Engine satellite data. 
            Toggle different Earth Engine layers using the controls on the map. The system will provide real-time analysis including 
            elevation, land cover, flood risk assessment, and AI-powered insights.
          </AlertDescription>
        </Alert>
      </div>
    </div>
  );
};

export default EarthEngineDemo;
