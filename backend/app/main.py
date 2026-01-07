from fastapi import FastAPI, Depends, HTTPException, status
from sqlalchemy.orm import Session
from . import models, schemas, auth, database

# Crear tablas automáticamente
models.Base.metadata.create_all(bind=database.engine)

app = FastAPI(title="Epic Wallet API")

@app.post("/register", status_code=status.HTTP_201_CREATED)
def registrar_usuario(usuario: schemas.UsuarioCreate, db: Session = Depends(database.get_db)):
    # Validar existencia
    db_user = db.query(models.Usuario).filter(
        (models.Usuario.usuario == usuario.usuario) | (models.Usuario.mail == usuario.mail)
    ).first()
    
    if db_user:
        mensaje = "Ya existe el usuario registrado" if db_user.usuario == usuario.usuario else "El mail ingresado ya se encuentra registrado"
        raise HTTPException(status_code=400, detail=mensaje)

    # Crear usuario
    hashed_pass = auth.obtener_password_hash(usuario.password)
    nuevo_usuario = models.Usuario(
        nombre=usuario.nombre,
        apellido=usuario.apellido,
        usuario=usuario.usuario,
        mail=usuario.mail,
        hashed_password=hashed_pass,
        id_tipo_usuario=2
    )
    db.add(nuevo_usuario)
    db.commit()
    db.refresh(nuevo_usuario)

    # Motivos por defecto
    motivos = [("Sueldo", "suma"), ("Luz", "resta"), ("Gas", "resta"), ("ABL", "resta"), 
               ("Tarjeta de crédito", "resta"), ("Internet", "resta"), ("Otros", "resta")]
    
    for nombre, tipo in motivos:
        db.add(models.MotivoMovimiento(nombre=nombre, tipo=tipo, id_usuario=nuevo_usuario.id))
    
    db.commit()
    return {"message": "Usuario creado con éxito"}

@app.post("/login")
def login(datos: schemas.LoginRequest, db: Session = Depends(database.get_db)):
    user = db.query(models.Usuario).filter(models.Usuario.usuario == datos.usuario).first()
    
    if not user:
        raise HTTPException(status_code=404, detail="No existe usuario registrado con ese nombre")
    if not user.activo:
        raise HTTPException(status_code=403, detail="El usuario actualmente se encuentra inactivo")
    if not auth.verificar_password(datos.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="El usuario y contraseña no son correctos")
    
    return {"message": "Ingreso exitoso", "usuario": user.usuario}