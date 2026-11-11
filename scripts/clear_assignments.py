import sqlite3

conn = sqlite3.connect('data/opti.db')
cursor = conn.cursor()

cursor.execute("SELECT COUNT(*) FROM assets WHERE status = 'ASSIGNED'")
assigned_count = cursor.fetchone()[0]

cursor.execute("UPDATE assets SET assigned_to_user_id = NULL, parent_asset_id = NULL, status = 'AVAILABLE'")
updated_assets = cursor.rowcount

cursor.execute("UPDATE asset_history SET action_type = 'CREATE', notes = 'Alta inicial de activo en inventario corporativo (En Stock)', new_user_id = NULL, previous_user_id = NULL, responsiva_status = 'NOT_REQUIRED'")
updated_history = cursor.rowcount

conn.commit()
conn.close()

print(f"DONE: Previously assigned: {assigned_count}. Assets updated to AVAILABLE: {updated_assets}. History logs updated: {updated_history}.")
