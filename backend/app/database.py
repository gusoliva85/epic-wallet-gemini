import os
from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker

# Intentar cargar variables desde .env para desarrollo local
try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    pass

# 1. Obtenemos la URL (Si no existe en el sistema, usa SQLite por defecto)
SQLALCHEMY_DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./epic_wallet.db")

# 2. Ajuste para producción: Render y otros servicios suelen entregar la URL 
# empezando con "postgres://", pero SQLAlchemy moderno exige "postgresql://"
if SQLALCHEMY_DATABASE_URL.startswith("postgres://"):
    SQLALCHEMY_DATABASE_URL = SQLALCHEMY_DATABASE_URL.replace("postgres://", "postgresql://", 1)

# 3. Configuración dinámica del motor
# Solo incluimos 'check_same_thread' si estamos usando SQLite
if "sqlite" in SQLALCHEMY_DATABASE_URL:
    engine = create_engine(
        SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False}
    )
else:
    # Para PostgreSQL (Supabase) no se necesita el argumento de SQLite
    engine = create_engine(SQLALCHEMY_DATABASE_URL)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()