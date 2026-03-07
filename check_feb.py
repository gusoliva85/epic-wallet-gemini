import sqlite3
import os

# Buscamos en backend/epic_wallet.db
db_path = "backend/epic_wallet.db"
username = "gusoliva"

if not os.path.exists(db_path):
    print(f"Error: No se encontró la base de datos en {db_path}")
    exit(1)

conn = sqlite3.connect(db_path)
cursor = conn.cursor()

# 1. Obtener ID del usuario
cursor.execute("SELECT id FROM usuarios WHERE usuario = ?", (username,))
user_row = cursor.fetchone()
if not user_row:
    print(f"Error: Usuario '{username}' no encontrado")
    exit(1)

user_id = user_row[0]
print(f"Usuario {username} (ID: {user_id})")

# 2. Obtener movimientos de Febrero 2026
query = """
SELECT m.id, mm.nombre, mm.tipo, m.monto 
FROM movimientos m 
JOIN motivo_movimientos mm ON m.id_motivo = mm.id 
WHERE m.id_usuario = ? AND mm.mes = 2 AND mm.anio = 2026;
"""
cursor.execute(query, (user_id,))
rows = cursor.fetchall()

print("\n--- MOVIMIENTOS FEBRERO 2026 ---")
print(f"{'ID':<5} | {'NOMBRE':<30} | {'TIPO':<10} | {'MONTO':<12}")
print("-" * 65)

total_ingresos = 0
total_gastos = 0

for row in rows:
    mid, nombre, tipo, monto = row
    print(f"{mid:<5} | {nombre:<30} | {tipo:<10} | {monto:<12}")
    monto_abs = abs(monto)
    if tipo == 'suma':
        total_ingresos += monto_abs
    else:
        total_gastos += monto_abs

print("-" * 65)
print(f"TOTAL INGRESOS CALCULADOS (SUMA): {total_ingresos}")
print(f"TOTAL GASTOS CALCULADOS (RESTA): {total_gastos}")
print(f"BALANCE (INGRESOS - GASTOS): {total_ingresos - total_gastos}")

conn.close()
