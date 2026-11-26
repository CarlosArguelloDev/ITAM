-- Esquema DDL para ITAM en SQLite (ARM64 / bajo consumo)

CREATE TABLE IF NOT EXISTS departments (
    id TEXT PRIMARY KEY,
    name TEXT UNIQUE NOT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_departments_name ON departments(name);

CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    employee_code TEXT UNIQUE NOT NULL,
    full_name TEXT NOT NULL,
    email TEXT NOT NULL,
    department TEXT NOT NULL,
    location TEXT NOT NULL CHECK(location IN ('OPM', 'OMEX')),
    is_active INTEGER NOT NULL DEFAULT 1,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_users_code ON users(employee_code);
CREATE INDEX IF NOT EXISTS idx_users_department ON users(department);

CREATE TABLE IF NOT EXISTS assets (
    id TEXT PRIMARY KEY,
    asset_tag TEXT UNIQUE NOT NULL,
    serial_number TEXT NOT NULL,
    category TEXT NOT NULL,
    brand TEXT NOT NULL,
    model TEXT NOT NULL,
    status TEXT NOT NULL CHECK(status IN ('AVAILABLE', 'ASSIGNED', 'MAINTENANCE', 'RETIRED', 'LOST')) DEFAULT 'AVAILABLE',
    assigned_to_user_id TEXT NULLABLE REFERENCES users(id) ON DELETE SET NULL,
    parent_asset_id TEXT NULLABLE REFERENCES assets(id) ON DELETE SET NULL,
    location TEXT NOT NULL CHECK(location IN ('OPM', 'OMEX')),
    department TEXT NOT NULL DEFAULT '',
    ip_address TEXT NOT NULL DEFAULT '',
    mac_address TEXT NOT NULL DEFAULT '',
    specs TEXT NOT NULL DEFAULT '{}',
    warranty_expiry DATE NULLABLE,
    last_audited_at DATETIME NULLABLE,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_assets_tag ON assets(asset_tag);
CREATE INDEX IF NOT EXISTS idx_assets_serial ON assets(serial_number);
CREATE INDEX IF NOT EXISTS idx_assets_assigned_user ON assets(assigned_to_user_id);
CREATE INDEX IF NOT EXISTS idx_assets_parent ON assets(parent_asset_id);
CREATE INDEX IF NOT EXISTS idx_assets_status ON assets(status);
CREATE INDEX IF NOT EXISTS idx_assets_category ON assets(category);
CREATE INDEX IF NOT EXISTS idx_assets_location ON assets(location);
CREATE INDEX IF NOT EXISTS idx_assets_department ON assets(department);

CREATE TABLE IF NOT EXISTS asset_history (
    id TEXT PRIMARY KEY,
    asset_id TEXT NOT NULL REFERENCES assets(id) ON DELETE CASCADE,
    action_type TEXT NOT NULL CHECK(action_type IN ('CREATE', 'ASSIGN', 'UNASSIGN', 'SWAP', 'STATUS_CHANGE', 'AUDIT_MATCH', 'AUDIT_DISCREPANCY')),
    previous_user_id TEXT NULLABLE REFERENCES users(id) ON DELETE SET NULL,
    new_user_id TEXT NULLABLE REFERENCES users(id) ON DELETE SET NULL,
    notes TEXT,
    responsiva_status TEXT NOT NULL CHECK(responsiva_status IN ('PENDING', 'SIGNED', 'NOT_REQUIRED')) DEFAULT 'NOT_REQUIRED',
    responsiva_doc_path TEXT NULLABLE,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_history_asset ON asset_history(asset_id);
CREATE INDEX IF NOT EXISTS idx_history_created ON asset_history(created_at);
CREATE INDEX IF NOT EXISTS idx_history_responsiva ON asset_history(responsiva_status);

CREATE TABLE IF NOT EXISTS audit_campaigns (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    target_location TEXT NOT NULL,
    target_type TEXT NOT NULL DEFAULT 'LOCATION',
    target_id TEXT NULLABLE,
    target_name TEXT NOT NULL DEFAULT '',
    status TEXT NOT NULL CHECK(status IN ('OPEN', 'CLOSED')) DEFAULT 'OPEN',
    total_expected INTEGER NOT NULL DEFAULT 0,
    total_scanned INTEGER NOT NULL DEFAULT 0,
    total_matches INTEGER NOT NULL DEFAULT 0,
    total_discrepancies INTEGER NOT NULL DEFAULT 0,
    total_missing INTEGER NOT NULL DEFAULT 0,
    notes TEXT NULLABLE,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    closed_at DATETIME NULLABLE
);

CREATE TABLE IF NOT EXISTS audit_scans (
    id TEXT PRIMARY KEY,
    campaign_id TEXT NOT NULL REFERENCES audit_campaigns(id) ON DELETE CASCADE,
    asset_id TEXT NOT NULL REFERENCES assets(id) ON DELETE CASCADE,
    expected_user_id TEXT NULLABLE REFERENCES users(id) ON DELETE SET NULL,
    found_with_user_id TEXT NULLABLE REFERENCES users(id) ON DELETE SET NULL,
    expected_location TEXT NOT NULL,
    found_location TEXT NOT NULL,
    discrepancy_type TEXT NOT NULL,
    resolved INTEGER NOT NULL DEFAULT 0,
    notes TEXT NULLABLE,
    scanned_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_scans_campaign ON audit_scans(campaign_id);
CREATE INDEX IF NOT EXISTS idx_scans_asset ON audit_scans(asset_id);
CREATE INDEX IF NOT EXISTS idx_scans_discrepancy ON audit_scans(discrepancy_type, resolved);

-- Consumibles de Impresoras (Tóners, Cartuchos, Cintas, Tambores)
CREATE TABLE IF NOT EXISTS consumables (
    id TEXT PRIMARY KEY,
    code TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    kind TEXT NOT NULL CHECK(kind IN ('TONER', 'CARTUCHO', 'CINTA', 'TAMBOR', 'OTRO')) DEFAULT 'TONER',
    brand TEXT NOT NULL DEFAULT '',
    color TEXT NOT NULL CHECK(color IN ('NEGRO', 'CIAN', 'MAGENTA', 'AMARILLO', 'COLOR', 'NA')) DEFAULT 'NEGRO',
    compatible_models TEXT NOT NULL DEFAULT '',
    location TEXT NOT NULL CHECK(location IN ('OPM', 'OMEX')) DEFAULT 'OPM',
    stock INTEGER NOT NULL DEFAULT 0,
    min_stock INTEGER NOT NULL DEFAULT 2,
    ideal_stock INTEGER NOT NULL DEFAULT 4,
    unit_cost REAL NOT NULL DEFAULT 0,
    page_yield INTEGER NOT NULL DEFAULT 0,
    notes TEXT NOT NULL DEFAULT '',
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_consumables_code ON consumables(code);
CREATE INDEX IF NOT EXISTS idx_consumables_kind ON consumables(kind);
CREATE INDEX IF NOT EXISTS idx_consumables_location ON consumables(location);

CREATE TABLE IF NOT EXISTS consumable_movements (
    id TEXT PRIMARY KEY,
    consumable_id TEXT NOT NULL REFERENCES consumables(id) ON DELETE CASCADE,
    movement_type TEXT NOT NULL CHECK(movement_type IN ('IN', 'OUT', 'ADJUST')),
    quantity INTEGER NOT NULL,
    printer_asset_id TEXT NULLABLE REFERENCES assets(id) ON DELETE SET NULL,
    department TEXT NOT NULL DEFAULT '',
    notes TEXT NOT NULL DEFAULT '',
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_consumable_movements_item ON consumable_movements(consumable_id);
CREATE INDEX IF NOT EXISTS idx_consumable_movements_created ON consumable_movements(created_at);
