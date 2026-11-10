-- Esquema DDL para ITAM en SQLite (ARM64 / bajo consumo)

CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    employee_code TEXT UNIQUE NOT NULL,
    full_name TEXT NOT NULL,
    email TEXT NOT NULL,
    department TEXT NOT NULL,
    location TEXT NOT NULL,
    is_active INTEGER NOT NULL DEFAULT 1,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_users_code ON users(employee_code);
CREATE INDEX IF NOT EXISTS idx_users_department ON users(department);

CREATE TABLE IF NOT EXISTS assets (
    id TEXT PRIMARY KEY,
    asset_tag TEXT UNIQUE NOT NULL,
    serial_number TEXT UNIQUE NOT NULL,
    category TEXT NOT NULL CHECK(category IN ('LAPTOP', 'MONITOR', 'DOCKING', 'PERIPHERAL', 'OTHER')),
    brand TEXT NOT NULL,
    model TEXT NOT NULL,
    status TEXT NOT NULL CHECK(status IN ('AVAILABLE', 'ASSIGNED', 'MAINTENANCE', 'RETIRED', 'LOST')) DEFAULT 'AVAILABLE',
    assigned_to_user_id TEXT NULLABLE REFERENCES users(id) ON DELETE SET NULL,
    parent_asset_id TEXT NULLABLE REFERENCES assets(id) ON DELETE SET NULL,
    location TEXT NOT NULL,
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
    status TEXT NOT NULL CHECK(status IN ('OPEN', 'CLOSED')) DEFAULT 'OPEN',
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
    discrepancy_type TEXT NOT NULL CHECK(discrepancy_type IN ('MATCH', 'WRONG_USER', 'WRONG_LOCATION', 'UNEXPECTED_STATUS', 'MISSING')),
    resolved INTEGER NOT NULL DEFAULT 0,
    scanned_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_scans_campaign ON audit_scans(campaign_id);
CREATE INDEX IF NOT EXISTS idx_scans_asset ON audit_scans(asset_id);
CREATE INDEX IF NOT EXISTS idx_scans_discrepancy ON audit_scans(discrepancy_type, resolved);
