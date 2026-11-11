import sqlite3
import re

conn = sqlite3.connect('data/opti.db')
cursor = conn.cursor()

cursor.execute("""
    SELECT id, asset_tag, serial_number, brand, model, category, department, specs
    FROM assets
    ORDER BY category, asset_tag
""")
assets = cursor.fetchall()
conn.close()

slash_serials = []
other_anomalies = []

for ast in assets:
    aid, tag, sn, brand, model, cat, dept, specs = ast
    sn_clean = sn.strip()
    
    if '/' in sn_clean:
        parts = [p.strip() for p in sn_clean.split('/')]
        slash_serials.append({
            'id': aid,
            'tag': tag,
            'sn': sn_clean,
            'parts': parts,
            'brand': brand,
            'model': model,
            'category': cat,
            'dept': dept,
            'specs': specs
        })
    elif sn_clean in ('NO LEGIBLE', 'NA', 'N/A', '') or 'SIN ' in sn_clean.upper() or ' ' in sn_clean:
        other_anomalies.append({
            'id': aid,
            'tag': tag,
            'sn': sn_clean,
            'brand': brand,
            'model': model,
            'category': cat,
            'dept': dept
        })

print(f"Total con diagonal (/): {len(slash_serials)}")
print(f"Total otras anomalías (espacios, NO LEGIBLE, etc.): {len(other_anomalies)}")

print("\n--- OTRAS ANOMALÍAS (NO LEGIBLE, ESPACIOS, ETC.) ---")
for item in other_anomalies[:40]:
    print(f"[{item['category']}] {item['tag']} ({item['brand']} {item['model']}): '{item['sn']}'")

print("\n--- DETALLE DE SERIALES CON DIAGONAL (/) ---")
for item in slash_serials:
    print(f"[{item['category']}] {item['tag']} ({item['brand']} {item['model']}): '{item['sn']}'")
