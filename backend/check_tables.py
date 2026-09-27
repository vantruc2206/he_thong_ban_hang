from app.core.database import SessionLocal
from sqlalchemy import text

db = SessionLocal()
res = db.execute(text("SELECT table_schema, table_name FROM information_schema.tables WHERE table_schema IN ('sales', 'catalog', 'auth', 'public') ORDER BY table_schema, table_name;"))
for row in res:
    print(f"{row[0]}.{row[1]}")
