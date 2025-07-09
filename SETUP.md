# Disaster Eye Earth Engine - Setup Guide

## Project Overview

This is a comprehensive disaster monitoring application that integrates Google Earth Engine with Python backend for AI/LLM processing and a React/TypeScript frontend for visualization.

## Architecture

- **Frontend**: React/TypeScript with Vite, ShadCN UI, Tailwind CSS
- **Backend**: Python FastAPI with Google Earth Engine integration
- **AI/LLM**: OpenAI GPT for natural language processing
- **Data**: Real-time satellite imagery and geospatial analysis

## Prerequisites

1. **Node.js** (v18 or higher)
2. **Python** (v3.8 or higher)
3. **Google Earth Engine Account**
4. **OpenAI API Key** (optional, for AI features)

## Backend Setup

### 1. Install Python Dependencies

```bash
cd backend
pip install -r requirements.txt
```

### 2. Google Earth Engine Authentication

#### Option A: Service Account (Recommended for Production)
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing
3. Enable Earth Engine API
4. Create a service account
5. Download the JSON key file as `service-account-key.json`
6. Place it in the `backend/` directory

#### Option B: Personal Authentication (Development)
```bash
earthengine authenticate
```

### 3. Environment Configuration

Create `.env` file in `backend/` directory:

```env
# Google Earth Engine
EE_SERVICE_ACCOUNT=your-service-account@your-project.iam.gserviceaccount.com
EE_PRIVATE_KEY_PATH=service-account-key.json

# OpenAI API Key (optional)
OPENAI_API_KEY=your-openai-api-key-here

# API Configuration
API_HOST=0.0.0.0
API_PORT=8000

# Frontend URL for CORS
FRONTEND_URL=http://localhost:8080
```

### 4. Start Backend Server

```bash
cd backend
python main.py
```

The API will be available at `http://localhost:8000`

## Frontend Setup

### 1. Install Dependencies

```bash
npm install
```

### 2. Environment Configuration

Create `.env` file in project root:

```env
VITE_API_URL=http://localhost:8000
```

### 3. Start Development Server

```bash
npm run dev
```

The frontend will be available at `http://localhost:8080`

## API Endpoints

### Health Check
- `GET /health` - Check API and Earth Engine status

### Analysis Endpoints
- `POST /api/earth-engine/query` - Process natural language queries
- `POST /api/earth-engine/analyze-location` - Analyze specific coordinates
- `GET /api/earth-engine/map-layers` - Get satellite map layers
- `GET /api/earth-engine/flood-analysis` - Get flood vulnerability data
- `GET /api/earth-engine/building-analysis` - Get building damage assessment

## Features

### Current Implementation

1. **Real-time Satellite Data**: Integrates Sentinel-1 SAR and Sentinel-2 optical imagery
2. **Flood Vulnerability Analysis**: Uses SAR backscatter for water detection
3. **Building Damage Assessment**: NDBI-based built-up area detection
4. **Social Vulnerability Index**: Calculated from multiple risk factors
5. **Natural Language Processing**: AI-powered query interpretation
6. **Interactive Map Interface**: Click-to-analyze functionality

### Data Sources

- **Sentinel-1 SAR**: For flood detection and water body mapping
- **Sentinel-2 Optical**: For vegetation indices and built-up area detection
- **SRTM Elevation**: For topographic analysis and flood risk assessment
- **AI Analysis**: GPT-powered natural language understanding

## Usage

1. **Start Both Servers**: Backend (port 8000) and Frontend (port 8080)
2. **API Status**: Check the status indicator in the top-right corner
3. **Query Interface**: Type natural language queries or click on the map
4. **Real-time Analysis**: Get instant results from satellite data
5. **AI Insights**: Receive AI-generated analysis and recommendations

## Sample Queries

- "What is the flood vulnerability in Tamil Nadu?"
- "Analyze building damage in the selected area"
- "Show me the social vulnerability index for this region"
- "Assess critical infrastructure in flood zones"

## Troubleshooting

### Earth Engine Authentication Issues
- Ensure service account has Earth Engine permissions
- Check that the JSON key file path is correct
- Verify project has Earth Engine API enabled

### API Connection Errors
- Check that backend server is running on port 8000
- Verify CORS settings in backend configuration
- Ensure frontend environment variables are set correctly

### Map Display Issues
- Check browser console for JavaScript errors
- Verify Earth Engine tile URLs are accessible
- Ensure proper authentication with Google services

## Development Notes

### Adding New Analysis Types
1. Add new endpoints in `backend/main.py`
2. Implement analysis logic in `backend/services/earth_engine_service.py`
3. Update frontend API calls in `src/services/earthEngineAPI.ts`
4. Update UI components to display new data types

### Customizing AI Responses
- Modify prompts in `backend/services/ai_service.py`
- Add new intent categories for different query types
- Implement custom response generation logic

### Map Layer Customization
- Add new satellite datasets in Earth Engine service
- Configure visualization parameters for different data types
- Update frontend layer controls and legends

## Production Deployment

### Backend
- Use environment variables for sensitive data
- Configure proper CORS origins
- Set up SSL certificates
- Use production ASGI server (uvicorn with gunicorn)

### Frontend
- Build for production: `npm run build`
- Configure environment variables for production API URL
- Deploy to CDN or static hosting service
- Set up domain and SSL certificates

## Contributing

1. Fork the repository
2. Create a feature branch
3. Implement changes with proper testing
4. Update documentation
5. Submit a pull request

## License

This project is for educational and research purposes. Ensure compliance with Google Earth Engine Terms of Service and data usage policies.
