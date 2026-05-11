from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    MINIO_ENDPOINT: str = "minio:9000"
    MINIO_ACCESS_KEY: str = "admin"
    MINIO_SECRET_KEY: str = "admin123"
    
    REDIS_URL: str = "redis://redis:6379/0"
    GOTENBERG_URL: str = "http://gotenberg:3000"

    class Config:
        env_file = ".env"

settings = Settings()
