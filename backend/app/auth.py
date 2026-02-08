import bcrypt

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