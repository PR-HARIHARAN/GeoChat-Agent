import os
from pathlib import Path
from dotenv import load_dotenv
from typing import List, Optional

# Load environment variables from .env file
env_path = Path(__file__).parent.parent / '.env'
load_dotenv(env_path)

class Config:
    # Application
    ENV: str = os.getenv('ENVIRONMENT', 'development')
    DEBUG: bool = os.getenv('DEBUG', 'False').lower() == 'true'
    SECRET_KEY: str = os.getenv('SECRET_KEY', 'dev-secret-key')
    FRONTEND_URL: str = os.getenv('FRONTEND_URL', 'http://localhost:3000')
    
    # Server
    HOST: str = os.getenv('HOST', '0.0.0.0')
    PORT: int = int(os.getenv('PORT', '8000'))
    
    # CORS
    CORS_ORIGINS: List[str] = os.getenv('CORS_ORIGINS', 'http://localhost:3000').split(',')
    
    # Google Earth Engine
    EE_PROJECT_ID: str = os.getenv('EE_PROJECT_ID', 'team-og-isro')
    EE_SERVICE_ACCOUNT: Optional[str] = os.getenv('EE_SERVICE_ACCOUNT')
    EE_PRIVATE_KEY_PATH: Optional[str] = os.path.abspath(os.path.expanduser(os.getenv('EE_PRIVATE_KEY_PATH', '')))
    GOOGLE_APPLICATION_CREDENTIALS: Optional[str] = os.path.abspath(os.path.expanduser(os.getenv('GOOGLE_APPLICATION_CREDENTIALS', '')))
    
    # LLM Configuration
    GROQ_API_KEY: Optional[str] = os.getenv('GROQ_API_KEY')
    GROQ_MODEL: str = os.getenv('GROQ_MODEL', 'llama3-70b-8192')
    
    # Default coordinates for Coimbatore, Tamil Nadu (ISRO region)
    DEFAULT_LAT: float = 11.0168
    DEFAULT_LNG: float = 76.9558
    DEFAULT_ZOOM: int = 10
    
    # Logging
    LOG_LEVEL: str = os.getenv('LOG_LEVEL', 'INFO')
    LOG_FILE: Optional[Path] = Path(os.getenv('LOG_FILE', 'logs/application.log'))
    
    # Security
    TOKEN_EXPIRE_MINUTES: int = int(os.getenv('TOKEN_EXPIRE_MINUTES', '1440'))
    
    @property
    def is_production(self) -> bool:
        return self.ENV == 'production'
    
    @property
    def is_development(self) -> bool:
        return self.ENV == 'development'

config = Config()
