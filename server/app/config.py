import os
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    # Database
    DATABASE_URL: str = "postgresql://postgres:password@localhost:5432/apex_capital"
    
    # Redis
    REDIS_URL: str = "redis://localhost:6379"
    
    # Groq LLM
    GROQ_API_KEY: str = ""
    GROQ_MODEL: str = "llama-3.3-70b-versatile"

    # Workflow throttling
    WORKFLOW_LLM_CONCURRENCY: int = 1
    WORKFLOW_COMPANY_CONCURRENCY: int = 2
    WORKFLOW_GROUP_AGENT_CONCURRENCY: int = 2
    WORKFLOW_TARGET_COMPANY_LIMIT: int = 4
    WORKFLOW_TARGET_COMPANY_IDS: str = ""
    
    # Resend Email
    RESEND_API_KEY: str = ""
    EMAIL_FROM: str = "noreply@apexcapital.ai"
    EMAIL_TO_PARTNERS: str = "partners@apexcapital.ai"
    
    # App
    APP_NAME: str = "PE Firm Partners - Month-End Close Platform"
    DEBUG: bool = True
    
    # Frontend URL (for email links)
    FRONTEND_URL: str = "http://localhost:3000"
    
    # Socket.io
    CORS_ORIGINS: list = ["http://localhost:3000", "http://localhost:3001"]

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"


settings = Settings()
