from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker

# Ruta de la base de datos (se creará un archivo llamado epic_wallet.db)
SQLALCHEMY_DATABASE_URL = "sqlite:///./epic_wallet.db"

# El engine es el encargado de la conexión técnica
# 'check_same_thread' es necesario solo para SQLite
engine = create_engine(
    SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False}
)

# Sesión para interactuar con la base de datos
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Esta es la 'Base' que modelos.py estaba buscando
Base = declarative_base()

# Función para obtener la base de datos en cada petición
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()