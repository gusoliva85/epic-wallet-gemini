from sqlalchemy import Column, Integer, String, ForeignKey, Boolean, DateTime, BigInteger
from .database import Base
from datetime import datetime, timezone

class TipoUsuario(Base):
    __tablename__ = "tipo_usuario"
    id = Column(Integer, primary_key=True, index=True)
    nombre = Column(String(20), unique=True)

class Usuario(Base):
    __tablename__ = "usuarios"
    id = Column(Integer, primary_key=True, index=True)
    nombre = Column(String(30))
    apellido = Column(String(30))
    usuario = Column(String(20), unique=True, index=True)
    mail = Column(String, unique=True, index=True)
    hashed_password = Column(String) 
    activo = Column(Boolean, default=True)
    # Corregido a lambda para mayor precisión
    fecha_creacion = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    id_tipo_usuario = Column(Integer, ForeignKey("tipo_usuario.id"))

class MotivoMovimiento(Base):
    __tablename__ = "motivo_movimientos"
    id = Column(Integer, primary_key=True, index=True)
    nombre = Column(String)
    tipo = Column(String) 
    mes = Column(Integer)
    anio = Column(Integer)
    id_usuario = Column(Integer, ForeignKey("usuarios.id"))
    # CORREGIDO: Se eliminó el .datetime extra que causaba el crash
    fecha_creacion = Column(DateTime, default=lambda: datetime.now(timezone.utc))

class Movimiento(Base):
    __tablename__ = "movimientos"
    id = Column(Integer, primary_key=True, index=True)
    id_usuario = Column(Integer, ForeignKey("usuarios.id"))
    id_motivo = Column(Integer, ForeignKey("motivo_movimientos.id"))
    monto = Column(BigInteger) 
    fecha_creacion = Column(DateTime, default=lambda: datetime.now(timezone.utc))