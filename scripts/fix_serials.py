import sqlite3
import json
import re

conn = sqlite3.connect('data/opti.db')
cursor = conn.cursor()

cursor.execute("""
    SELECT id, asset_tag, brand, model, category, serial_number, specs
    FROM assets
    WHERE serial_number LIKE '%/%'
""")
rows = cursor.fetchall()
print(f"Total a corregir: {len(rows)}")

def format_mac(raw_mac):
    clean = re.sub(r'[^A-Fa-f0-9]', '', raw_mac).upper()
    if len(clean) == 12:
        return ':'.join(clean[i:i+2] for i in range(0, 12, 2))
    return clean

updated_count = 0

for r in rows:
    aid, tag, brand, model, cat, raw_sn, specs_json = r
    try:
        specs = json.loads(specs_json) if specs_json else {}
    except Exception:
        specs = {}

    parts = [p.strip() for p in raw_sn.split('/')]
    p1 = parts[0]
    p2 = parts[1] if len(parts) > 1 else ''

    clean_sn = raw_sn
    secondary_info = {}

    if cat == 'SCANNER':
        # Zebra MC330L
        # p1: S231..., p2: C81CFE...
        if p1.startswith('S') and p1[1:].isdigit():
            clean_sn = p1[1:]
        else:
            clean_sn = p1
        if p2:
            specs['mac_address'] = format_mac(p2)
            specs['raw_mac'] = p2

    elif cat == 'SIM-CARD':
        # Telcel SIM
        # p1: 12-digit SIM serial, p2: 8-digit PUK/PIN
        clean_sn = p1
        if p2:
            specs['puk'] = p2

    elif cat == 'TELEFONO':
        # Apple iPhone
        # One is IMEI (starts with 35, 15 digits), other is Apple Serial
        clean1 = p1.replace(' ', '')
        clean2 = p2.replace(' ', '')
        
        if clean1.startswith('35') and len(clean1) >= 14:
            imei = clean1
            apple_sn = clean2
        else:
            imei = clean2
            apple_sn = clean1

        # Apple serial might have leading 'S' from 2D barcode scanner
        clean_apple_sn = apple_sn
        if clean_apple_sn.startswith('S') and len(clean_apple_sn) in (11, 13):
            clean_apple_sn = clean_apple_sn[1:]

        clean_sn = clean_apple_sn
        if imei:
            specs['imei'] = imei

    new_specs_json = json.dumps(specs, ensure_ascii=False)

    cursor.execute("""
        UPDATE assets
        SET serial_number = ?, specs = ?
        WHERE id = ?
    """, (clean_sn, new_specs_json, aid))
    
    updated_count += 1
    print(f"[{cat}] {tag}: '{raw_sn}' -> SN: '{clean_sn}' | SPECS: {new_specs_json}")

conn.commit()
conn.close()

print(f"\n¡Éxito! Total activos actualizados en SQLite: {updated_count}")
