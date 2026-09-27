from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker, declarative_base
from app.core.config import settings

db_url = settings.DATABASE_URL
if not db_url:
    raise RuntimeError("POSTGREE_DATABASE_URL chua duoc cau hinh trong backend/.env")

engine = create_engine(
    db_url,
    pool_pre_ping=True,
    pool_recycle=900,
    pool_size=5,
    max_overflow=10,
    connect_args={"connect_timeout": 10},
)

# Kiem tra ket noi khi khoi dong
try:
    with engine.connect() as conn:
        conn.execute(text("SELECT 1"))
    print("Ket noi Supabase PostgreSQL: THANH CONG!")
except Exception as e:
    raise RuntimeError(f"Khong the ket noi Supabase: {e}")

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

def get_db():
    """Dependency cho cac API endpoint de mo va tu dong dong phien ket noi CSDL"""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
