from pydantic import BaseModel, EmailStr, Field, validator

class UsuarioBase(BaseModel):
    nombre: str = Field(..., max_length=30)
    apellido: str = Field(..., max_length=30)
    usuario: str = Field(..., min_length=6, max_length=20)
    mail: EmailStr

    @validator('usuario')
    def usuario_sin_espacios(cls, v):
        if ' ' in v:
            raise ValueError('El usuario no debe contener espacios')
        return v

class UsuarioCreate(UsuarioBase):
    password: str = Field(..., min_length=1, max_length=20)

class LoginRequest(BaseModel):
    usuario: str
    password: str

class MovimientoCreate(BaseModel):
    monto: int
    id_motivo: int
    usuario: str

class MotivoCreate(BaseModel):
    nombre: str
    tipo: str # "suma" o "resta"
    usuario: str
class MovimientoUpdate(BaseModel):
    monto: int
