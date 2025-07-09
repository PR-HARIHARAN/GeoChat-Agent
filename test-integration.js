// Test Earth Engine Integration
// Add this to your browser console to test the API

async function testEarthEngineIntegration() {
  try {
    // Test backend health
    const health = await fetch('http://localhost:8000/health');
    const healthData = await health.json();
    console.log('Backend Health:', healthData);
    
    // Test Earth Engine query
    const response = await fetch('http://localhost:8000/api/earth-engine/query', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        query: "Analyze flood risk in Coimbatore",
        coordinates: { lat: 11.0168, lng: 76.9558 }
      })
    });
    
    const data = await response.json();
    console.log('Earth Engine Response:', data);
    
    if (data.earth_engine_data) {
      console.log('✅ Earth Engine integration working!');
    } else {
      console.log('⚠️ Using mock data - check service account key');
    }
    
  } catch (error) {
    console.error('❌ Integration test failed:', error);
  }
}

// Run the test
testEarthEngineIntegration();
