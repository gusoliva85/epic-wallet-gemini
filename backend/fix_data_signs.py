
import sqlite3
import os

db_path = "e:/_Mis Datos/Epic_Wallet_ver1.2 - Gemini/backend/epic_wallet.db"

if not os.path.exists(db_path):
    print(f"DB not found at {db_path}")
else:
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    print("--- INICIANDO CORRECCIÓN DE SIGNOS EN DB ---")
    
    # Buscamos todos los movimientos y su tipo de motivo
    query = """
    SELECT m.id, m.monto, mot.tipo, mot.nombre
    FROM movimientos m
    JOIN motivo_movimientos mot ON m.id_motivo = mot.id
    """
    cursor.execute(query)
    rows = cursor.fetchall()
    
    correcciones = 0
    for mid, monto, tipo, nombre in rows:
        monto_abs = abs(monto)
        monto_corregido = monto_abs if tipo == 'suma' else -monto_abs
        
        if monto != monto_corregido:
            cursor.execute("UPDATE movimientos SET monto = ? WHERE id = ?", (monto_corregido, mid))
            correcciones += 1
            # print(f"Corregido ID {mid} ({nombre}): {monto} -> {monto_corregido}")
            
    conn.commit()
    print(f"--- CORRECCIÓN FINALIZADA: {correcciones} registros actualizados ---")
    
    conn.close()
