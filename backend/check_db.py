
import sqlite3
import os

db_path = "e:/_Mis Datos/Epic_Wallet_ver1.2 - Gemini/backend/epic_wallet.db"

if not os.path.exists(db_path):
    print(f"DB not found at {db_path}")
else:
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    target_user_id = 2 # gusoliva
    
    cursor.execute("SELECT SUM(monto) FROM movimientos WHERE id_usuario = ?", (target_user_id,))
    total_ahorro = cursor.fetchone()[0] or 0
    
    print(f"\nNUEVO AHORRO HISTORICO TOTAL (User {target_user_id}): {total_ahorro:,.2f}")
    
    # Check Feb again
    query = """
    SELECT SUM(monto)
    FROM movimientos m
    JOIN motivo_movimientos mot ON m.id_motivo = mot.id
    WHERE m.id_usuario = ? AND mot.mes = 2 AND mot.anio = 2026
    """
    cursor.execute(query, (target_user_id,))
    feb_balance = cursor.fetchone()[0] or 0
    print(f"NUEVO BALANCE FEB 2026: {feb_balance:,.2f}")

    conn.close()
