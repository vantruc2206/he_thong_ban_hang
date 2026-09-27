import os
from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from sqlalchemy.orm import Session
from sqlalchemy import text
from app.core.config import settings
from app.core.database import get_db
from app.modules.auth.router import router as auth_router
from app.modules.catalog.router import router as catalog_router
from app.modules.inventory.router import router as inventory_router
from app.modules.sales.router import router as sales_router
from app.modules.omnichannel.router import router as omnichannel_router
from app.modules.marketing.router import router as marketing_router
from app.modules.hr_system.router import router as hr_system_router
from app.modules.chat.router import router as chat_router

app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    docs_url="/docs",
    redoc_url="/redoc"
)

# Cấu hình CORS cho phép Frontend truy cập
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Cấu hình thư mục Static đệm phục vụ tải lên hình ảnh & video sản phẩm
uploads_dir = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "static", "uploads")
os.makedirs(uploads_dir, exist_ok=True)
app.mount("/static/uploads", StaticFiles(directory=uploads_dir), name="uploads")

# Đăng ký toàn bộ các Module Routers bao phủ 9 Schemas CSDL
app.include_router(auth_router, prefix="/api/v1")
app.include_router(catalog_router, prefix="/api/v1")
app.include_router(inventory_router, prefix="/api/v1")
app.include_router(sales_router, prefix="/api/v1")
app.include_router(omnichannel_router, prefix="/api/v1")
app.include_router(marketing_router, prefix="/api/v1")
app.include_router(hr_system_router, prefix="/api/v1")
app.include_router(chat_router, prefix="/api/v1")

@app.get("/")
def read_root():
    return {
        "status": "online",
        "message": f"Chào mừng bạn đến với {settings.PROJECT_NAME}",
        "docs": "/docs",
        "uploads_url": "/static/uploads/"
    }

@app.get("/healthcheck")
def healthcheck(db: Session = Depends(get_db)):
    """API Kiểm tra kết nối CSDL Supabase PostgreSQL"""
    try:
        result = db.execute(text("SELECT version();")).fetchone()
        return {
            "status": "healthy",
            "database": "connected",
            "postgres_version": result[0] if result else "unknown"
        }
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Lỗi kết nối CSDL: {str(e)}"
        )
