// Earth Engine JavaScript API integration (optional)
// Use this if you want direct frontend connection to Earth Engine

declare global {
  interface Window {
    google: any;
  }
}

class EarthEngineDirectService {
  private initialized = false;
  private ee: any;

  async initialize(apiKey: string) {
    if (this.initialized) return;

    try {
      // Load Earth Engine JavaScript API
      await this.loadEarthEngineAPI();
      
      // Initialize with API key
      const { ee } = window.google.earthengine;
      
      await ee.initialize({
        'client_id': 'your-client-id',
        'api_key': apiKey,
      });
      
      this.ee = ee;
      this.initialized = true;
      console.log('✅ Earth Engine JavaScript API initialized');
      
    } catch (error) {
      console.error('❌ Earth Engine initialization failed:', error);
    }
  }

  private loadEarthEngineAPI(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (window.google?.earthengine) {
        resolve();
        return;
      }

      const script = document.createElement('script');
      script.src = 'https://earthengine.googleapis.com/v1alpha/client.js';
      script.onload = () => resolve();
      script.onerror = () => reject(new Error('Failed to load Earth Engine API'));
      document.head.appendChild(script);
    });
  }

  async getFloodData(lat: number, lng: number) {
    if (!this.initialized) throw new Error('Earth Engine not initialized');
    
    // Example: Get flood data for location
    const point = this.ee.Geometry.Point([lng, lat]);
    const floodDataset = this.ee.ImageCollection('MODIS/006/MOD09A1')
      .filterDate('2023-01-01', '2023-12-31')
      .filterBounds(point);
    
    return floodDataset.getInfo();
  }
}

export const earthEngineDirectService = new EarthEngineDirectService();

// Usage in component:
// await earthEngineDirectService.initialize('YOUR_API_KEY');
// const data = await earthEngineDirectService.getFloodData(lat, lng);
