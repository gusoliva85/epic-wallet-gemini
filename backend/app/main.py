<<<<<<< HEAD
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
# Crear directorio de logs si no existe (por seguridad)
if not os.path.exists("logs"):
    os.makedirs("logs")

# Configurar el logger
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    handlers=[
        logging.FileHandler("logs/server.log"),
        logging.StreamHandler(sys.stdout) # También mostrar en consola
    ]
)
logger = logging.getLogger(__name__)

# Crear tablas automáticamente en la base de datos
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
    # 1. Verificar si ya existen motivos para este usuario en el mes/año actual
    existe = db.query(models.MotivoMovimiento).filter_by(
        id_usuario=usuario_id, 
        mes=mes_actual, 
        anio=anio_actual
    ).first()

    if existe:
        return # Ya están cargados, no hacemos nada
    
    # 2. Buscar historial de meses anteriores para analizar
    # Obtenemos los últimos 2 meses distintos donde el usuario tuvo actividad
    meses_previos = db.query(models.MotivoMovimiento.mes, models.MotivoMovimiento.anio)\
        .filter(models.MotivoMovimiento.id_usuario == usuario_id)\
        .distinct()\
        .order_by(models.MotivoMovimiento.anio.desc(), models.MotivoMovimiento.mes.desc())\
        .limit(2).all()

    motivos_finales = []

    # CASO A: Usuario nuevo (Sin historial)
    if not meses_previos:
        motivos_finales = [
            ("Sueldo", "suma"), ("Luz", "resta"), ("Gas", "resta"), 
            ("ABL", "resta"), ("Tarjeta de crédito", "resta"), 
            ("Internet", "resta"), ("Otros", "resta")
        ]

    # CASO B: Solo tiene 1 mes de historial -> Clonamos todo
    elif len(meses_previos) == 1:
        m_prev = meses_previos[0]
        historial = db.query(models.MotivoMovimiento).filter_by(
            id_usuario=usuario_id, mes=m_prev.mes, anio=m_prev.anio
        ).all()
        motivos_finales = [(h.nombre, h.tipo) for h in historial]
    
    # CASO C: Tiene 2 o más meses -> Analizamos repetición (Lógica IA)
    else:
        # Obtenemos motivos del mes N-1
        m1 = meses_previos[0]
        set1 = db.query(models.MotivoMovimiento.nombre, models.MotivoMovimiento.tipo)\
            .filter_by(id_usuario=usuario_id, mes=m1.mes, anio=m1.anio).all()
        
        # Obtenemos motivos del mes N-2
        m2 = meses_previos[1]
        set2 = db.query(models.MotivoMovimiento.nombre, models.MotivoMovimiento.tipo)\
            .filter_by(id_usuario=usuario_id, mes=m2.mes, anio=m2.anio).all()

        # Comparamos: Solo pasan los que están en AMBOS meses
        # Convertimos a sets para comparar nombres fácilmente
        nombres_set2 = {m[0] for m in set2}
        for nombre, tipo in set1:
            if nombre in nombres_set2:
                motivos_finales.append((nombre, tipo))
        
    # 3. Guardar los motivos resultantes para el mes actual
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

# REGISTRAR USUARIO
@app.post("/register", status_code=status.HTTP_201_CREATED)
def registrar_usuario(usuario: schemas.UsuarioCreate, db: Session = Depends(database.get_db)):
    # Validar si el usuario o mail ya existen
    db_user = db.query(models.Usuario).filter(
        (models.Usuario.usuario == usuario.usuario) | (models.Usuario.mail == usuario.mail)
    ).first()
    
    if db_user:
        mensaje = "Ya existe el usuario" if db_user.usuario == usuario.usuario else "El mail ya existe"
        raise HTTPException(status_code=400, detail=mensaje)

    # Crear el nuevo usuario
    nuevo_usuario = models.Usuario(
        nombre=usuario.nombre,
        apellido=usuario.apellido,
        usuario=usuario.usuario,
        mail=usuario.mail,
        hashed_password=auth.obtener_password_hash(usuario.password),
        id_tipo_usuario=2 # Tipo Normal
    )
    db.add(nuevo_usuario)
    db.commit()
    db.refresh(nuevo_usuario)

    # Al registrarse, le creamos sus primeros motivos para el mes actual
    ahora = datetime.now()
    inicializar_motivos_mes(db, nuevo_usuario.id, ahora.month, ahora.year)

    return {"message": "Usuario creado con éxito"}


# INICIAR SESION
@app.post("/login")
def login(datos: schemas.LoginRequest, db: Session = Depends(database.get_db)):
    logger.info(f"Intento de login para usuario: {datos.usuario}")
    # Buscar usuario
    user = db.query(models.Usuario).filter(models.Usuario.usuario == datos.usuario).first()
    
    # Validaciones de seguridad
    if not user:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    if not user.activo:
        raise HTTPException(status_code=403, detail="Usuario inactivo")
    if not auth.verificar_password(datos.password, user.hashed_password):
        logger.warning(f"Intento de login fallido (password incorrecto): {datos.usuario}")
        raise HTTPException(status_code=401, detail="Contraseña incorrecta")
    
    # Cada vez que inicia sesión, verificamos si es un mes nuevo para heredar motivos
    try:
        ahora = datetime.now()
        inicializar_motivos_mes(db, user.id, ahora.month, ahora.year)
    except Exception as e:
        logger.error(f"Error al inicializar motivos para usuario {user.usuario}: {e}")

    logger.info(f"Login exitoso para usuario: {user.usuario}")
    
    # Enviamos el nombre real además del usuario
    return {
        "message": "Ingreso exitoso", 
        "usuario": user.usuario, 
        "nombreReal": user.nombre 
    }


# CARGAR TARJETAS
# Endpoint para el home (solo mes actual + ahorro total)
@app.get("/dashboard/{usuario}")
def obtener_dashboard(usuario: str, db: Session = Depends(database.get_db)):
    ahora = datetime.now()
    user = db.query(models.Usuario).filter(models.Usuario.usuario == usuario).first()
    if not user: raise HTTPException(status_code=404, detail="Usuario no encontrado")

    # Movimientos solo del mes actual
    movs_mes = db.query(models.Movimiento).join(models.MotivoMovimiento).filter(
        models.Movimiento.id_usuario == user.id,
        models.MotivoMovimiento.mes == ahora.month,
        models.MotivoMovimiento.anio == ahora.year,
    ).all()

    # Total ahorrado sumando los meses
    ahorro_total = db.query(func.sum(models.Movimiento.monto)).filter(
        models.Movimiento.id_usuario == user.id
    ).scalar() or 0

    return {
        "movimientos_actuales": movs_mes,
        "ahorro_total_global": ahorro_total
    }

# Endpoint para el detalle mensual
@app.get("/historial-resumen/{usuario}")
def obtener_resumenes_mensuales(usuario:str, db:Session = Depends(database.get_db)):
    user = db.query(models.Usuario).filter(models.Usuario.usuario == usuario).first()

    # Agrupar por mes y año
    resumenes = db.query(
        models.MotivoMovimiento.mes,
        models.MotivoMovimiento.anio,
        func.sum(models.Movimiento.monto).label("balance")
    ).join(models.Movimiento).filter(
        models.Movimiento.id_usuario == user.id
    ).group_by(models.MotivoMovimiento.mes, models.MotivoMovimiento.anio).all()

    return resumenes


@app.get("/motivos")
def obtener_motivos(usuario: str, db: Session = Depends(database.get_db)):
    """
    Endpoint para que el Frontend cargue el combo de motivos del mes actual.
    """
    user = db.query(models.Usuario).filter(models.Usuario.usuario == usuario).first()
    if not user:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    
    ahora = datetime.now()
    motivos = db.query(models.MotivoMovimiento).filter_by(
        id_usuario=user.id, 
        mes=ahora.month, 
        anio=ahora.year
    ).all()
    
    return motivos

# INGRESAR MOVIMIENTO
@app.post("/movimientos")
def registrar_movimiento(mov: schemas.MovimientoCreate, db: Session = Depends(database.get_db)):
    # 1. Buscamos al usuario por su nombre
    user = db.query(models.Usuario).filter(models.Usuario.usuario == mov.usuario).first()

    if not user:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    
    # 2. Creamos el objeto
    nuevo_mov = models.Movimiento(
        id_usuario=user.id,
        id_motivo=mov.id_motivo,
        monto=mov.monto
    )

    db.add(nuevo_mov)
    db.commit()
    db.refresh(nuevo_mov)
    return {"status": "success", "id": nuevo_mov.id}

# BORRAR MOVIMIENTO
@app.delete("/movimientos/{movimiento_id}")
def eliminar_movimiento(movimiento_id: int, db: Session = Depends(database.get_db)):
    movimiento = db.query(models.Movimiento).filter(models.Movimiento.id == movimiento_id).first()
    if not movimiento:
        raise HTTPException(status_code=404, detail="Movimiento no encontrado")
    
    db.delete(movimiento)
    db.commit()
    return {"message": "Movimiento eliminado correctamente"}


# AGREGAR MOTIVO DE MOVIMIENTO
@app.post("/motivos")
def crear_motivo(datos: schemas.MotivoCreate, db: Session = Depends(database.get_db)):
    # 1. Buscamos al usuario
    user = db.query(models.Usuario).filter(models.Usuario.usuario == datos.usuario).first()
    
    if not user:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    
    try:
        # 2. Creamos la instancia
        nuevo_motivo = models.MotivoMovimiento(
            nombre=datos.nombre,
            tipo=datos.tipo,
            id_usuario=user.id,
            mes=datetime.now().month,
            anio=datetime.now().year
        )

        db.add(nuevo_motivo)
        db.commit()
        
        # 3. En lugar de refresh (que a veces falla por la sesión), 
        # devolvemos los datos que ya tenemos confirmados.
        return {
            "status": "success", 
            "id": nuevo_motivo.id, 
            "nombre": nuevo_motivo.nombre
        }
    
    except Exception as e:
        db.rollback() # Importantísimo: deshace el intento si hubo error
        print(f"Error en base de datos: {e}")
        raise HTTPException(status_code=500, detail="Error al guardar en base de datos")


# OBTENER HISTORIAL DE MOVIMIENTOS DEL USUARIO
@app.get("/movimientos/{usuario}")
def obtener_historial(usuario: str, db: Session = Depends(database.get_db)):
    # Se busca al usuario
    user = db.query(models.Usuario).filter(models.Usuario.usuario == usuario).first()
    if not user:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    
    # Traemos sus movimientos haciendo un JOIN con los motivos
    movimientos = db.query(
        models.Movimiento.id,
        models.Movimiento.monto,
        models.Movimiento.fecha_creacion,
        models.MotivoMovimiento.tipo,
        models.MotivoMovimiento.nombre
    ).join(models.MotivoMovimiento).filter(models.Movimiento.id_usuario == user.id).all()

    # Formateo de la respuesta
    resultado = []
    for m in movimientos:
        resultado.append({
            "id": m.id,
            "monto": m.monto,
            "fecha": m.fecha_creacion.isoformat(),
            "tipo": m.tipo,
            "motivo": m.nombre
        })
    
=======
from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from datetime import datetime
from . import models, schemas, auth, database

# Crear tablas automáticamente en la base de datos
models.Base.metadata.create_all(bind=database.engine)

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
    # 1. Verificar si ya existen motivos para este usuario en el mes/año actual
    existe = db.query(models.MotivoMovimiento).filter_by(
        id_usuario=usuario_id, 
        mes=mes_actual, 
        anio=anio_actual
    ).first()

    if existe:
        return # Ya están cargados, no hacemos nada
    
    # 2. Buscar historial de meses anteriores para analizar
    # Obtenemos los últimos 2 meses distintos donde el usuario tuvo actividad
    meses_previos = db.query(models.MotivoMovimiento.mes, models.MotivoMovimiento.anio)\
        .filter(models.MotivoMovimiento.id_usuario == usuario_id)\
        .distinct()\
        .order_by(models.MotivoMovimiento.anio.desc(), models.MotivoMovimiento.mes.desc())\
        .limit(2).all()

    motivos_finales = []

    # CASO A: Usuario nuevo (Sin historial)
    if not meses_previos:
        motivos_finales = [
            ("Sueldo", "suma"), ("Luz", "resta"), ("Gas", "resta"), 
            ("ABL", "resta"), ("Tarjeta de crédito", "resta"), 
            ("Internet", "resta"), ("Otros", "resta")
        ]

    # CASO B: Solo tiene 1 mes de historial -> Clonamos todo
    elif len(meses_previos) == 1:
        m_prev = meses_previos[0]
        historial = db.query(models.MotivoMovimiento).filter_by(
            id_usuario=usuario_id, mes=m_prev.mes, anio=m_prev.anio
        ).all()
        motivos_finales = [(h.nombre, h.tipo) for h in historial]
    
    # CASO C: Tiene 2 o más meses -> Analizamos repetición (Lógica IA)
    else:
        # Obtenemos motivos del mes N-1
        m1 = meses_previos[0]
        set1 = db.query(models.MotivoMovimiento.nombre, models.MotivoMovimiento.tipo)\
            .filter_by(id_usuario=usuario_id, mes=m1.mes, anio=m1.anio).all()
        
        # Obtenemos motivos del mes N-2
        m2 = meses_previos[1]
        set2 = db.query(models.MotivoMovimiento.nombre, models.MotivoMovimiento.tipo)\
            .filter_by(id_usuario=usuario_id, mes=m2.mes, anio=m2.anio).all()

        # Comparamos: Solo pasan los que están en AMBOS meses
        # Convertimos a sets para comparar nombres fácilmente
        nombres_set2 = {m[0] for m in set2}
        for nombre, tipo in set1:
            if nombre in nombres_set2:
                motivos_finales.append((nombre, tipo))
        
    # 3. Guardar los motivos resultantes para el mes actual
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

# REGISTRAR USUARIO
@app.post("/register", status_code=status.HTTP_201_CREATED)
def registrar_usuario(usuario: schemas.UsuarioCreate, db: Session = Depends(database.get_db)):
    # Validar si el usuario o mail ya existen
    db_user = db.query(models.Usuario).filter(
        (models.Usuario.usuario == usuario.usuario) | (models.Usuario.mail == usuario.mail)
    ).first()
    
    if db_user:
        mensaje = "Ya existe el usuario" if db_user.usuario == usuario.usuario else "El mail ya existe"
        raise HTTPException(status_code=400, detail=mensaje)

    # Crear el nuevo usuario
    nuevo_usuario = models.Usuario(
        nombre=usuario.nombre,
        apellido=usuario.apellido,
        usuario=usuario.usuario,
        mail=usuario.mail,
        hashed_password=auth.obtener_password_hash(usuario.password),
        id_tipo_usuario=2 # Tipo Normal
    )
    db.add(nuevo_usuario)
    db.commit()
    db.refresh(nuevo_usuario)

    # Al registrarse, le creamos sus primeros motivos para el mes actual
    ahora = datetime.now()
    inicializar_motivos_mes(db, nuevo_usuario.id, ahora.month, ahora.year)

    return {"message": "Usuario creado con éxito"}


# INICIAR SESION
@app.post("/login")
def login(datos: schemas.LoginRequest, db: Session = Depends(database.get_db)):
    # Buscar usuario
    user = db.query(models.Usuario).filter(models.Usuario.usuario == datos.usuario).first()
    
    # Validaciones de seguridad
    if not user:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    if not user.activo:
        raise HTTPException(status_code=403, detail="Usuario inactivo")
    if not auth.verificar_password(datos.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Contraseña incorrecta")
    
    # Cada vez que inicia sesión, verificamos si es un mes nuevo para heredar motivos
    ahora = datetime.now()
    inicializar_motivos_mes(db, user.id, ahora.month, ahora.year)
    
    # Enviamos el nombre real además del usuario
    return {
        "message": "Ingreso exitoso", 
        "usuario": user.usuario, 
        "nombreReal": user.nombre 
    }


@app.get("/motivos")
def obtener_motivos(usuario: str, db: Session = Depends(database.get_db)):
    """
    Endpoint para que el Frontend cargue el combo de motivos del mes actual.
    """
    user = db.query(models.Usuario).filter(models.Usuario.usuario == usuario).first()
    if not user:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    
    ahora = datetime.now()
    motivos = db.query(models.MotivoMovimiento).filter_by(
        id_usuario=user.id, 
        mes=ahora.month, 
        anio=ahora.year
    ).all()
    
    return motivos

# INGRESAR MOVIMIENTO
@app.post("/movimientos")
def registrar_movimiento(mov: schemas.MovimientoCreate, db: Session = Depends(database.get_db)):
    # 1. Buscamos al usuario por su nombre
    user = db.query(models.Usuario).filter(models.Usuario.usuario == mov.usuario).first()

    if not user:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    
    # 2. Creamos el objeto
    nuevo_mov = models.Movimiento(
        id_usuario=user.id,
        id_motivo=mov.id_motivo,
        monto=mov.monto
    )

    db.add(nuevo_mov)
    db.commit()
    db.refresh(nuevo_mov)
    return {"status": "success", "id": nuevo_mov.id}

# BORRAR MOVIMIENTO
@app.delete("/movimientos/{movimiento_id}")
def eliminar_movimiento(movimiento_id: int, db: Session = Depends(database.get_db)):
    movimiento = db.query(models.Movimiento).filter(models.Movimiento.id == movimiento_id).first()
    if not movimiento:
        raise HTTPException(status_code=404, detail="Movimiento no encontrado")
    
    db.delete(movimiento)
    db.commit()
    return {"message": "Movimiento eliminado correctamente"}


# AGREGAR MOTIVO DE MOVIMIENTO
@app.post("/motivos")
def crear_motivo(datos: schemas.MotivoCreate, db: Session = Depends(database.get_db)):
    # 1. Buscamos al usuario
    user = db.query(models.Usuario).filter(models.Usuario.usuario == datos.usuario).first()
    
    if not user:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    
    try:
        # 2. Creamos la instancia
        nuevo_motivo = models.MotivoMovimiento(
            nombre=datos.nombre,
            tipo=datos.tipo,
            id_usuario=user.id,
            mes=datetime.now().month,
            anio=datetime.now().year
        )

        db.add(nuevo_motivo)
        db.commit()
        
        # 3. En lugar de refresh (que a veces falla por la sesión), 
        # devolvemos los datos que ya tenemos confirmados.
        return {
            "status": "success", 
            "id": nuevo_motivo.id, 
            "nombre": nuevo_motivo.nombre
        }
    
    except Exception as e:
        db.rollback() # Importantísimo: deshace el intento si hubo error
        print(f"Error en base de datos: {e}")
        raise HTTPException(status_code=500, detail="Error al guardar en base de datos")


# OBTENER HISTORIAL DE MOVIMIENTOS DEL USUARIO
@app.get("/movimientos/{usuario}")
def obtener_historial(usuario: str, db: Session = Depends(database.get_db)):
    # Obtener fecha de hoy para despues filtrar
    ahora = datetime.now()
    mes_actual = ahora.month
    anio_actual = ahora.year

    # Se busca al usuario
    user = db.query(models.Usuario).filter(models.Usuario.usuario == usuario).first()
    if not user:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    
    # Traemos sus movimientos haciendo un JOIN con los motivos
    # Existe el fitro de mes y año para traer solo los movimientos del corriente mes
    movimientos = db.query(
        models.Movimiento.id,
        models.Movimiento.monto,
        models.Movimiento.fecha_creacion,
        models.MotivoMovimiento.tipo,
        models.MotivoMovimiento.nombre
    ).join(models.MotivoMovimiento).filter(
        models.Movimiento.id_usuario == user.id,
        models.MotivoMovimiento.mes == mes_actual,
        models.MotivoMovimiento.anio == anio_actual
    ).all()

    # Formateo de la respuesta
    resultado = []
    for m in movimientos:
        resultado.append({
            "id": m.id,
            "monto": m.monto,
            "fecha": m.fecha_creacion.isoformat(),
            "tipo": m.tipo,
            "motivo": m.nombre
        })
    
>>>>>>> 84226d677f354ba20cc27944bda2f24fbe724a74
    return resultado