import os
from dotenv import load_dotenv

# Tự động load biến môi trường từ file .env
load_dotenv()

class Settings:
    PROJECT_NAME: str = "Hệ Thống Bán Hàng Đa Kênh API"
    VERSION: str = "1.0.0"
    
    # URL kết nối Database Supabase PostgreSQL
    DATABASE_URL: str = os.getenv("POSTGREE_DATABASE_URL")
    SUPABASE_SECRET_KEY: str = os.getenv("SUPABASE_SECRET_KEY", "")
    
    # Secret Key cho JWT Token
    SECRET_KEY: str = os.getenv("SECRET_KEY", "super-secret-key-change-this-in-production-123456789")
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24  # 1 ngày cho dev

settings = Settings()
