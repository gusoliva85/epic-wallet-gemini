from sqlalchemy import Column, Integer, String, ForeignKey, Boolean, DateTime, BigInteger
from sqlalchemy.orm import relationship
from database import Base
import datetime

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
    hashed_password = Column(String) # Seguridad
    activo = Column(Boolean, default=True)
    fecha_creacion = Column(DateTime, default=datetime.datetime.utcnow)
    id_tipo_usuario = Column(Integer, ForeignKey("tipo_usuario.id"))

class MotivoMovimiento(Base):
    __tablename__ = "motivo_movimientos"
    id = Column(Integer, primary_key=True, index=True)
    nombre = Column(String)
    tipo = Column(String) # "suma" o "resta"
    id_usuario = Column(Integer, ForeignKey("usuarios.id"))
    fecha_creacion = Column(DateTime, default=datetime.datetime.utcnow)

class Movimiento(Base):
    __tablename__ = "movimientos"
    id = Column(Integer, primary_key=True, index=True)
    id_usuario = Column(Integer, ForeignKey("usuarios.id"))
    id_motivo = Column(Integer, ForeignKey("motivo_movimientos.id"))
    monto = Column(BigInteger) # Soporta números grandes sin decimales
    fecha_creacion = Column(DateTime, default=datetime.datetime.utcnow)