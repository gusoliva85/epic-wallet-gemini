from fastapi import FastAPI, Depends, HTTPException, status, Request
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from sqlalchemy import func
from datetime import datetime
from . import models, schemas, auth, database
import logging
import os
import sys

# --- CONFIGURACIÓN DE LOGGING ---
if not os.path.exists("logs"):
    os.makedirs("logs")

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    handlers=[
        logging.FileHandler("logs/server.log"),
        logging.StreamHandler(sys.stdout)
    ]
)
logger = logging.getLogger(__name__)

# --- INICIALIZACIÓN DE DB ---
try:
    models.Base.metadata.create_all(bind=database.engine)
    logger.info("Tablas de base de datos verificadas/creadas correctamente.")
except Exception as e:
    logger.error(f"Error crítico al conectar con la base de datos: {e}")

app = FastAPI(title="Epic Wallet API")

# --- CONFIGURACIÓN DE CORS ---
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- LÓGICA DE HERENCIA E IA (FUNCIONES DE APOYO) ---
def inicializar_motivos_mes(db: Session, usuario_id: int, mes_actual: int, anio_actual: int):
    """
    Función que gestiona la creación de motivos dinámicos cada mes.
    """
    existe = db.query(models.MotivoMovimiento).filter_by(
        id_usuario=usuario_id, 
        mes=mes_actual, 
        anio=anio_actual
    ).first()

    if existe:
        return 
    
    meses_previos = db.query(models.MotivoMovimiento.mes, models.MotivoMovimiento.anio)\
        .filter(models.MotivoMovimiento.id_usuario == usuario_id)\
        .distinct()\
        .order_by(models.MotivoMovimiento.anio.desc(), models.MotivoMovimiento.mes.desc())\
        .limit(2).all()

    motivos_finales = []

    if not meses_previos:
        motivos_finales = [
            ("Sueldo", "suma"), ("Luz", "resta"), ("Gas", "resta"), 
            ("ABL", "resta"), ("Tarjeta de crédito", "resta"), 
            ("Internet", "resta"), ("Otros", "resta")
        ]
    elif len(meses_previos) == 1:
        m_prev = meses_previos[0]
        historial = db.query(models.MotivoMovimiento).filter_by(
            id_usuario=usuario_id, mes=m_prev.mes, anio=m_prev.anio
        ).all()
        motivos_finales = [(h.nombre, h.tipo) for h in historial]
    else:
        m1 = meses_previos[0]
        set1 = db.query(models.MotivoMovimiento.nombre, models.MotivoMovimiento.tipo)\
            .filter_by(id_usuario=usuario_id, mes=m1.mes, anio=m1.anio).all()
        
        m2 = meses_previos[1]
        set2 = db.query(models.MotivoMovimiento.nombre, models.MotivoMovimiento.tipo)\
            .filter_by(id_usuario=usuario_id, mes=m2.mes, anio=m2.anio).all()

        nombres_set2 = {m[0] for m in set2}
        for nombre, tipo in set1:
            if nombre in nombres_set2:
                motivos_finales.append((nombre, tipo))
        
    for nombre, tipo in motivos_finales:
        nuevo_motivo = models.MotivoMovimiento(
            nombre=nombre, 
            tipo=tipo, 
            id_usuario=usuario_id, 
            mes=mes_actual, 
            anio=anio_actual
        )
        db.add(nuevo_motivo)
    
    db.commit()

# --- ENDPOINTS ---

@app.post("/register", status_code=status.HTTP_201_CREATED)
def registrar_usuario(usuario: schemas.UsuarioCreate, db: Session = Depends(database.get_db)):
    db_user = db.query(models.Usuario).filter(
        (models.Usuario.usuario == usuario.usuario) | (models.Usuario.mail == usuario.mail)
    ).first()
    
    if db_user:
        mensaje = "Ya existe el usuario" if db_user.usuario == usuario.usuario else "El mail ya existe"
        raise HTTPException(status_code=400, detail=mensaje)

    nuevo_usuario = models.Usuario(
        nombre=usuario.nombre,
        apellido=usuario.apellido,
        usuario=usuario.usuario,
        mail=usuario.mail,
        hashed_password=auth.obtener_password_hash(usuario.password),
        id_tipo_usuario=2 
    )
    db.add(nuevo_usuario)
    db.commit()
    db.refresh(nuevo_usuario)

    ahora = datetime.now()
    inicializar_motivos_mes(db, nuevo_usuario.id, ahora.month, ahora.year)

    return {"message": "Usuario creado con éxito"}

@app.post("/login")
def login(datos: schemas.LoginRequest, db: Session = Depends(database.get_db)):
    logger.info(f"Intento de login para usuario: {datos.usuario}")
    user = db.query(models.Usuario).filter(models.Usuario.usuario == datos.usuario).first()
    
    if not user:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    if not user.activo:
        raise HTTPException(status_code=403, detail="Usuario inactivo")
    if not auth.verificar_password(datos.password, user.hashed_password):
        logger.warning(f"Intento de login fallido (password incorrecto): {datos.usuario}")
        raise HTTPException(status_code=401, detail="Contraseña incorrecta")
    
    try:
        ahora = datetime.now()
        inicializar_motivos_mes(db, user.id, ahora.month, ahora.year)
    except Exception as e:
        logger.error(f"Error al inicializar motivos para usuario {user.usuario}: {e}")

    logger.info(f"Login exitoso para usuario: {user.usuario}")
    
    return {
        "message": "Ingreso exitoso", 
        "usuario": user.usuario, 
        "nombreReal": user.nombre 
    }

@app.get("/dashboard/{usuario}")
def obtener_dashboard(usuario: str, db: Session = Depends(database.get_db)):
    """
    Endpoint principal para el Dashboard. Retorna los totales del mes actual,
    el ahorro global y los movimientos del mes.
    """
    ahora = datetime.now()
    user = db.query(models.Usuario).filter(models.Usuario.usuario == usuario).first()
    if not user: raise HTTPException(status_code=404, detail="Usuario no encontrado")

    # Movimientos únicamente del mes actual (para las tablas y reporte mensual)
    # Se seleccionan columnas específicas de ambas tablas mediante el JOIN
    movs_query = db.query(
        models.Movimiento.id,
        models.Movimiento.monto,
        models.Movimiento.fecha_creacion,
        models.MotivoMovimiento.tipo,
        models.MotivoMovimiento.nombre
    ).join(models.MotivoMovimiento).filter(
        models.Movimiento.id_usuario == user.id,
        models.MotivoMovimiento.mes == ahora.month,
        models.MotivoMovimiento.anio == ahora.year,
    ).all()

    # Formateamos el resultado de la consulta para que el Frontend lo reciba como objetos limpios
    movimientos_formateados = []
    for m in movs_query:
        movimientos_formateados.append({
            "id": m.id,
            "monto": m.monto,
            "fecha": m.fecha_creacion.isoformat(),
            "tipo": m.tipo,
            "motivo": m.nombre
        })

    # Cálculo de ingresos del mes actual (suma de montos positivos)
    total_ingresos_mes = db.query(func.sum(models.Movimiento.monto)).join(models.MotivoMovimiento).filter(
        models.Movimiento.id_usuario == user.id,
        models.MotivoMovimiento.mes == ahora.month,
        models.MotivoMovimiento.anio == ahora.year,
        models.Movimiento.monto > 0
    ).scalar() or 0

    # Cálculo de gastos del mes actual (suma de montos negativos, se retorna valor absoluto)
    total_gastos_mes = db.query(func.sum(models.Movimiento.monto)).join(models.MotivoMovimiento).filter(
        models.Movimiento.id_usuario == user.id,
        models.MotivoMovimiento.mes == ahora.month,
        models.MotivoMovimiento.anio == ahora.year,
        models.Movimiento.monto < 0
    ).scalar() or 0

    # Ahorro global histórico (suma de todos los movimientos de siempre)
    ahorro_total = db.query(func.sum(models.Movimiento.monto)).filter(
        models.Movimiento.id_usuario == user.id
    ).scalar() or 0

    return {
        "movimientos_actuales": movimientos_formateados,
        "ingresos_mes": total_ingresos_mes,
        "gastos_mes": abs(total_gastos_mes),
        "ahorro_total_global": ahorro_total
    }

@app.get("/historial-resumen/{usuario}")
def obtener_resumenes_mensuales(usuario:str, db:Session = Depends(database.get_db)):
    user = db.query(models.Usuario).filter(models.Usuario.usuario == usuario).first()
    if not user: raise HTTPException(status_code=404, detail="Usuario no encontrado")

    resumenes = db.query(
        models.MotivoMovimiento.mes,
        models.MotivoMovimiento.anio,
        func.sum(models.Movimiento.monto).label("balance")
    ).join(models.Movimiento).filter(
        models.Movimiento.id_usuario == user.id
    ).group_by(models.MotivoMovimiento.mes, models.MotivoMovimiento.anio).all()

    return resumenes

@app.get("/motivos")
def obtener_motivos(usuario: str, mes: int | None = None, anio: int | None = None, db: Session = Depends(database.get_db)):
    user = db.query(models.Usuario).filter(models.Usuario.usuario == usuario).first()
    if not user:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    
    ahora = datetime.now()
    mes_target = mes if mes is not None else ahora.month
    anio_target = anio if anio is not None else ahora.year
    
    motivos = db.query(models.MotivoMovimiento).filter_by(
        id_usuario=user.id, 
        mes=mes_target, 
        anio=anio_target
    ).all()
    
    return motivos

@app.post("/movimientos")
def registrar_movimiento(mov: schemas.MovimientoCreate, db: Session = Depends(database.get_db)):
    user = db.query(models.Usuario).filter(models.Usuario.usuario == mov.usuario).first()

    if not user:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    
    nuevo_mov = models.Movimiento(
        id_usuario=user.id,
        id_motivo=mov.id_motivo,
        monto=mov.monto
    )

    db.add(nuevo_mov)
    db.commit()
    db.refresh(nuevo_mov)
    return {"status": "success", "id": nuevo_mov.id}

@app.delete("/movimientos/{movimiento_id}")
def eliminar_movimiento(movimiento_id: int, db: Session = Depends(database.get_db)):
    movimiento = db.query(models.Movimiento).filter(models.Movimiento.id == movimiento_id).first()
    if not movimiento:
        raise HTTPException(status_code=404, detail="Movimiento no encontrado")
    
    db.delete(movimiento)
    db.commit()
    return {"message": "Movimiento eliminado correctamente"}

@app.post("/motivos")
def crear_motivo(datos: schemas.MotivoCreate, db: Session = Depends(database.get_db)):
    user = db.query(models.Usuario).filter(models.Usuario.usuario == datos.usuario).first()
    
    if not user:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    
    try:
        nuevo_motivo = models.MotivoMovimiento(
            nombre=datos.nombre,
            tipo=datos.tipo,
            id_usuario=user.id,
            mes=datetime.now().month,
            anio=datetime.now().year
        )

        db.add(nuevo_motivo)
        db.commit()
        
        return {
            "status": "success", 
            "id": nuevo_motivo.id, 
            "nombre": nuevo_motivo.nombre
        }
    
    except Exception as e:
        db.rollback() 
        logger.error(f"Error en base de datos al crear motivo: {e}")
        raise HTTPException(status_code=500, detail="Error al guardar en base de datos")

@app.get("/movimientos/{usuario}")
def obtener_historial(usuario: str, db: Session = Depends(database.get_db)):
    user = db.query(models.Usuario).filter(models.Usuario.usuario == usuario).first()
    if not user:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    
    movimientos = db.query(
        models.Movimiento.id,
        models.Movimiento.monto,
        models.Movimiento.fecha_creacion,
        models.MotivoMovimiento.tipo,
        models.MotivoMovimiento.nombre
    ).join(models.MotivoMovimiento).filter(
        models.Movimiento.id_usuario == user.id
    ).all()

    resultado = []
    for m in movimientos:
        resultado.append({
            "id": m.id,
            "monto": m.monto,
            "fecha": m.fecha_creacion.isoformat(),
            "tipo": m.tipo,
            "motivo": m.nombre
        })
    
    return resultado

@app.get("/movimientos-mensuales")
def obtener_movimientos_mensuales(usuario: str, mes: int, anio: int, db: Session = Depends(database.get_db)):
    user = db.query(models.Usuario).filter(models.Usuario.usuario == usuario).first()
    if not user: raise HTTPException(status_code=404, detail="Usuario no encontrado")
    movimientos = db.query(
        models.Movimiento.id, 
        models.Movimiento.id_motivo,
        models.Movimiento.monto, 
        models.Movimiento.fecha_creacion, 
        models.MotivoMovimiento.tipo, 
        models.MotivoMovimiento.nombre
    ).join(models.MotivoMovimiento).filter(
        models.Movimiento.id_usuario == user.id, 
        models.MotivoMovimiento.mes == mes, 
        models.MotivoMovimiento.anio == anio
    ).all()
    resultado = []
    for m in movimientos:
        resultado.append({
            "id": m.id, 
            "id_motivo": m.id_motivo,
            "monto": m.monto, 
            "fecha": m.fecha_creacion.isoformat(), 
            "tipo": m.tipo, 
            "motivo": m.nombre
        })
    return resultado

@app.put("/movimientos/{id}")
def actualizar_movimiento(id: int, datos: schemas.MovimientoUpdate, db: Session = Depends(database.get_db)):
    movimiento = db.query(models.Movimiento).filter(models.Movimiento.id == id).first()
    if not movimiento: raise HTTPException(status_code=404, detail="Movimiento no encontrado")
    try:
        movimiento.monto = datos.monto
        if datos.id_motivo is not None:
            movimiento.id_motivo = datos.id_motivo
        db.commit()
        return {"status": "success", "message": "Movimiento actualizado correctamente"}
    except Exception as e:
        db.rollback()
        logger.error(f"Error al actualizar movimiento {id}: {e}")
        raise HTTPException(status_code=500, detail="Error interno del servidor")

@app.post("/movimientos-basicos")
def agregar_movimientos_basicos(req: schemas.MovimientoBasicoRequest, db: Session = Depends(database.get_db)):
    user = db.query(models.Usuario).filter(models.Usuario.usuario == req.usuario).first()
    if not user: raise HTTPException(status_code=404, detail="Usuario no encontrado")
    
    # Asegurar que existan los motivos para ese mes
    inicializar_motivos_mes(db, user.id, req.mes, req.anio)
    
    # Obtener motivos creados
    motivos = db.query(models.MotivoMovimiento).filter_by(
        id_usuario=user.id, mes=req.mes, anio=req.anio
    ).all()
    
    # Crear movimientos con monto 0 para cada motivo (si no existen ya)
    for m in motivos:
        existe = db.query(models.Movimiento).filter_by(
            id_usuario=user.id, id_motivo=m.id
        ).first()
        if not existe:
            nuevo_mov = models.Movimiento(
                id_usuario=user.id,
                id_motivo=m.id,
                monto=0
            )
            db.add(nuevo_mov)
    
    db.commit()
    return {"status": "success", "message": f"Movimientos básicos agregados para {req.mes}/{req.anio}"}


