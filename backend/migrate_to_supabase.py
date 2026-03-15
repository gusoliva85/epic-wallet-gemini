"""
migrate_to_supabase.py
----------------------
Script de migración única: copia todos los datos del SQLite local
hacia la base de datos Supabase (PostgreSQL).
Ejecutar UNA SOLA VEZ desde la carpeta backend/:
    python migrate_to_supabase.py
"""

import os
import sys

# Asegurarse de que puede importar los módulos de la app
sys.path.insert(0, os.path.dirname(__file__))

from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker

try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    pass

# ── Conexiones ─────────────────────────────────────────────────────────────────
SQLITE_URL = "sqlite:///./epic_wallet.db"
SUPABASE_URL = os.getenv("DATABASE_URL", "")

if not SUPABASE_URL or SUPABASE_URL.startswith("sqlite"):
    print("❌ ERROR: DATABASE_URL en .env no apunta a un servidor PostgreSQL/Supabase.")
    print("   Verificá que DATABASE_URL sea la URL de Supabase y volvé a intentar.")
    sys.exit(1)

if SUPABASE_URL.startswith("postgres://"):
    SUPABASE_URL = SUPABASE_URL.replace("postgres://", "postgresql://", 1)

print(f"📂 Origen  (SQLite)  : {SQLITE_URL}")
print(f"☁️  Destino (Supabase): {SUPABASE_URL[:50]}...")

sqlite_engine  = create_engine(SQLITE_URL, connect_args={"check_same_thread": False})
supabase_engine = create_engine(SUPABASE_URL, pool_pre_ping=True)

SqliteSession  = sessionmaker(bind=sqlite_engine)
SupabaseSession = sessionmaker(bind=supabase_engine)

src = SqliteSession()
dst = SupabaseSession()


# ── Importar modelos para crear tablas en Supabase ────────────────────────────
from app.models import Base, TipoUsuario, Usuario, MotivoMovimiento, Movimiento, ResumenMensual

print("\n🛠  Creando tablas en Supabase (si no existen)...")
Base.metadata.create_all(bind=supabase_engine)
print("   ✅ Tablas verificadas/creadas.")


# ── Helper ────────────────────────────────────────────────────────────────────
def migrate_table(model, label):
    rows = src.query(model).all()
    if not rows:
        print(f"   ⚠️  {label}: sin datos en SQLite, se omite.")
        return

    existing_ids = {r.id for r in dst.query(model).all()}
    nuevos = [r for r in rows if r.id not in existing_ids]

    if not nuevos:
        print(f"   ⚠️  {label}: todos los registros ya existen en Supabase, se omite.")
        return

    # Expunge de la sesión SQLite para poder agregar a la sesión Supabase
    src.expunge_all()
    for row in nuevos:
        dst.merge(row)  # merge por PK: inserta si no existe, actualiza si existe

    dst.commit()
    print(f"   ✅ {label}: {len(nuevos)} filas migradas ({len(existing_ids)} ya existían).")


# ── Migración en orden (respetando FK) ───────────────────────────────────────
print("\n🚀 Iniciando migración de datos...\n")

try:
    migrate_table(TipoUsuario,       "tipo_usuario")
    migrate_table(Usuario,           "usuarios")
    migrate_table(MotivoMovimiento,  "motivo_movimientos")
    migrate_table(Movimiento,        "movimientos")
    migrate_table(ResumenMensual,    "resumen_mensual")

    print("\n🎉 Migración completada exitosamente.")
    print("   Podés verificar los datos en: https://app.supabase.com → Table Editor")

except Exception as e:
    dst.rollback()
    print(f"\n❌ Error durante la migración: {e}")
    raise
finally:
    src.close()
    dst.close()
