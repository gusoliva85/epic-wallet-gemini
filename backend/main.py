from fastapi import FastAPI, Depends, HTTPException, status
from sqlalchemy.orm import Session
import models, schemas, auth_utils
from database import engine, get_db

models.Base.metadata.create_all(bind=engine)

app = FastAPI(title="Epic Wallet API")

@app.post("/register", status_code=status.HTTP_201_CREATED)
def registrar_usuario(usuario: schemas.UsuarioCreate, db: Session = Depends(get_db)):
    
    # 1. Validar si ya existe el usuario o mail
    db_user = db.query(models.Usuario).filter(
        (models.Usuario.usuario == usuario.usuario) | (models.Usuario.mail == usuario.mail)
    ).first()
    
    if db_user:
        mensaje = "Ya existe el usuario registrado" if db_user.usuario == usuario.usuario else "El mail ingresado ya se encuentra registrado"
        raise HTTPException(status_code=400, detail=mensaje)

    # 2. Crear el usuario con pass encriptada
    hashed_pass = auth_utils.obtener_password_hash(usuario.password)
    nuevo_usuario = models.Usuario(
        nombre=usuario.nombre,
        apellido=usuario.apellido,
        usuario=usuario.usuario,
        mail=usuario.mail,
        hashed_password=hashed_pass,
        id_tipo_usuario=2 # 2 será el rol estándar
    )
    db.add(nuevo_usuario)
    db.commit()
    db.refresh(nuevo_usuario)

    # 3. CREAR MOTIVOS POR DEFECTO (Lo que pediste)
    motivos_default = [
        ("Sueldo", "suma"), ("Luz", "resta"), ("Gas", "resta"), 
        ("ABL", "resta"), ("Tarjeta de crédito", "resta"), ("Internet", "resta"),
        ("Carnicería / Pollería", "resta"), ("Verdulería", "resta"),
        ("Mercadería", "resta"), ("Otros", "resta")
    ]
    
    for nombre, tipo in motivos_default:
        nuevo_motivo = models.MotivoMovimiento(
            nombre=nombre,
            tipo=tipo,
            id_usuario=nuevo_usuario.id
        )
        db.add(nuevo_motivo)
    
    db.commit()
    return {"message": "Usuario creado con éxito y motivos configurados"}

@app.post("/login")
def login(datos: schemas.LoginRequest, db: Session = Depends(get_db)):
    user = db.query(models.Usuario).filter(models.Usuario.usuario == datos.usuario).first()
    
    # 1. Validar existencia
    if not user:
        raise HTTPException(status_code=404, detail="No existe usuario registrado con ese nombre")
    
    # 2. Validar si está activo
    if not user.activo:
        raise HTTPException(status_code=403, detail="El usuario actualmente se encuentra inactivo")
    
    # 3. Validar contraseña
    if not auth_utils.verificar_password(datos.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="El usuario y contraseña no son correctos")
    
    return {"message": "Ingreso exitoso", "usuario": user.usuario, "id": user.id}