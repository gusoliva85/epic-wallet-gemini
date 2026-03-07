import bcrypt
from datetime import datetime, timedelta
from jose import JWTError, jwt
from typing import Optional

def obtener_password_hash(password: str) -> str:
    # Pasamos el string a bytes
    pwd_bytes = password.encode('utf-8')
    # Generamos la sal (salt) y el hash
    salt = bcrypt.gensalt()
    hashed_password = bcrypt.hashpw(pwd_bytes, salt)
    # Devolvemos el hash como string para guardarlo en la DB
    return hashed_password.decode('utf-8')

def verificar_password(password_plano: str, password_hasheado: str) -> bool:
    # Convertimos ambos a bytes para comparar
    pwd_bytes = password_plano.encode('utf-8')
    hash_bytes = password_hasheado.encode('utf-8')
    # Bcrypt se encarga de comparar de forma segura
    return bcrypt.checkpw(pwd_bytes, hash_bytes)

def crear_token_acceso(data: dict, secret_key: str, algorithm: str, expires_delta: Optional[timedelta] = None):
    para_encriptar = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=15)
    para_encriptar.update({"exp": expire})
    encoded_jwt = jwt.encode(para_encriptar, secret_key, algorithm=algorithm)
    return encoded_jwt