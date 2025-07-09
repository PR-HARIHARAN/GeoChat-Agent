# Disaster Eye Earth Engine Backend

This is the backend service for the Disaster Eye Earth Engine project, providing geospatial analysis and AI-powered insights for disaster management.

## Features

- Google Earth Engine integration for geospatial analysis
- AI-powered natural language processing for geospatial queries
- Real-time flood risk assessment
- Building and infrastructure analysis
- Social vulnerability index calculation
- Interactive map visualization

## Prerequisites

- Python 3.9+
- Google Earth Engine account
- Groq API key
- Google Cloud Platform project with Earth Engine enabled

## Setup

1. Clone the repository:
   ```bash
   git clone https://github.com/yourusername/disaster-eye-earth-engine.git
   cd disaster-eye-earth-engine/backend
   ```

2. Create and activate a virtual environment:
   ```bash
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   ```

3. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```

4. Set up environment variables:
   - Copy `.env.example` to `.env`
   - Update the values in `.env` with your credentials

5. Authenticate with Google Earth Engine:
   ```bash
   earthengine authenticate
   ```

## Configuration

Edit the `.env` file to configure the application:

```env
# Application
ENVIRONMENT=development
DEBUG=True

# Server
HOST=0.0.0.0
PORT=8000

# CORS
CORS_ORIGINS=http://localhost:3000,http://localhost:8080

# Google Earth Engine
EE_PROJECT_ID=your-project-id
EE_SERVICE_ACCOUNT=your-service-account@project.iam.gserviceaccount.com
EE_PRIVATE_KEY_PATH=./service-account-key.json

# LLM Configuration
GROQ_API_KEY=your-groq-api-key
GROQ_MODEL=llama3-70b-8192

# Logging
LOG_LEVEL=INFO
LOG_FILE=logs/application.log

# Security
SECRET_KEY=your-secret-key
TOKEN_EXPIRE_MINUTES=1440
```

## Running the Application

```bash
# Development mode with auto-reload
uvicorn main:app --reload

# Production mode
uvicorn main:app --host 0.0.0.0 --port 8000
```

The API will be available at `http://localhost:8000`

## API Documentation

Once the server is running, you can access:

- Interactive API docs: `http://localhost:8000/docs`
- Alternative API docs: `http://localhost:8000/redoc`

## Project Structure

```
backend/
├── main.py              # FastAPI application entry point
├── agent.py             # AI agent implementation
├── config.py            # Configuration settings
├── requirements.txt     # Python dependencies
├── .env                 # Environment variables (gitignored)
└── services/
    ├── __init__.py
    ├── earth_engine_service.py  # Google Earth Engine integration
    ├── geospatial_service.py    # Geospatial analysis logic
    └── ai_service.py           # AI/ML model integration
```


```

