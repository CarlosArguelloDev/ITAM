-- Datos semilla realistas para ITAM

-- 1. Usuarios
INSERT OR IGNORE INTO users (id, employee_code, full_name, email, department, location, is_active, created_at) VALUES
('usr-001', 'EMP-1001', 'Alejandro Navarro', 'alejandro.navarro@empresa.com', 'Engineering', 'CDMX Central', 1, '2024-01-15 09:00:00'),
('usr-002', 'EMP-1002', 'Sofia Mendoza', 'sofia.mendoza@empresa.com', 'Design & UX', 'Monterrey Hub', 1, '2024-02-01 10:00:00'),
('usr-003', 'EMP-1003', 'Carlos Ramirez', 'carlos.ramirez@empresa.com', 'DevOps & Cloud', 'CDMX Central', 1, '2024-02-15 08:30:00'),
('usr-004', 'EMP-1004', 'Valeria Gomez', 'valeria.gomez@empresa.com', 'Product Management', 'Guadalajara Tech', 1, '2024-03-01 09:15:00'),
('usr-005', 'EMP-1005', 'Miguel Torres', 'miguel.torres@empresa.com', 'Finance & Ops', 'CDMX Central', 1, '2024-03-10 11:00:00');

-- 2. Activos (Laptops, Dockings, Monitores, Periféricos)
INSERT OR IGNORE INTO assets (id, asset_tag, serial_number, category, brand, model, status, assigned_to_user_id, parent_asset_id, location, specs, warranty_expiry, last_audited_at, created_at) VALUES
-- Laptops
('ast-001', 'IT-LAP-0010', '8G7H9X3', 'LAPTOP', 'Dell', 'Latitude 5440', 'ASSIGNED', 'usr-001', NULL, 'CDMX Central', 
 '{"ram": "32GB DDR5", "cpu": "Intel Core i7-1365U", "storage": "1TB NVMe", "hostname": "MEX-NB-0010", "os": "Windows 11 Pro"}', '2026-12-15', '2024-10-01 10:00:00', '2024-01-16 10:00:00'),

('ast-002', 'IT-LAP-0011', '4K9L2M1', 'LAPTOP', 'Dell', 'Latitude 7440', 'ASSIGNED', 'usr-002', NULL, 'Monterrey Hub',
 '{"ram": "16GB LPDDR5", "cpu": "Intel Core i7-1355U", "storage": "512GB NVMe", "hostname": "MTY-NB-0011", "os": "Ubuntu 24.04 LTS"}', '2026-11-20', '2024-09-15 11:30:00', '2024-02-02 11:00:00'),

('ast-003', 'IT-LAP-0012', '2P5Q8R9', 'LAPTOP', 'Dell', 'Latitude 5540', 'ASSIGNED', 'usr-003', NULL, 'CDMX Central',
 '{"ram": "32GB DDR5", "cpu": "Intel Core i7-1370P", "storage": "1TB NVMe", "hostname": "MEX-NB-0012", "os": "Fedora 40"}', '2027-01-10', '2024-07-01 09:00:00', '2024-02-16 09:30:00'),

('ast-004', 'IT-LAP-0013', '9W3E1T4', 'LAPTOP', 'Dell', 'Latitude 5430', 'AVAILABLE', NULL, NULL, 'CDMX Central - Bodega IT',
 '{"ram": "16GB DDR4", "cpu": "Intel Core i5-1245U", "storage": "512GB NVMe", "hostname": "STOCK-NB-0013", "os": "Windows 11 Pro"}', '2025-08-30', '2024-05-10 14:00:00', '2023-08-30 12:00:00'),

('ast-005', 'IT-LAP-0014', '5F7J2K8', 'LAPTOP', 'Dell', 'Latitude 5440', 'MAINTENANCE', NULL, NULL, 'Taller Soporte IT',
 '{"ram": "16GB DDR5", "cpu": "Intel Core i7-1365U", "storage": "512GB NVMe", "issue": "Falla en teclado por derrame de líquido"}', '2026-05-15', '2024-08-01 16:00:00', '2024-01-20 14:00:00'),

-- Dockings
('ast-006', 'IT-DCK-0020', 'WD19S-8831A', 'DOCKING', 'Dell', 'WD19S 130W', 'ASSIGNED', 'usr-001', 'ast-001', 'CDMX Central',
 '{"power_watts": 130, "ports": "Dual DisplayPort 1.4, HDMI 2.0b, USB-C, 3x USB 3.1"}', '2026-12-15', '2024-10-01 10:05:00', '2024-01-16 10:10:00'),

('ast-007', 'IT-DCK-0021', 'WD19S-9912B', 'DOCKING', 'Dell', 'WD19S 180W', 'ASSIGNED', 'usr-003', 'ast-003', 'CDMX Central',
 '{"power_watts": 180, "ports": "Dual DP 1.4, HDMI, USB-C PowerShare"}', '2026-11-01', '2024-07-01 09:10:00', '2024-02-16 09:40:00'),

('ast-008', 'IT-DCK-0022', 'WD19-4402C', 'DOCKING', 'Dell', 'WD19 130W', 'AVAILABLE', NULL, NULL, 'CDMX Central - Bodega IT',
 '{"power_watts": 130, "ports": "DP, HDMI, USB-C"}', '2025-10-15', '2024-06-20 15:00:00', '2023-10-15 10:00:00'),

-- Monitores
('ast-009', 'IT-MON-0030', 'CN09912-U27', 'MONITOR', 'Dell', 'UltraSharp U2723QE', 'ASSIGNED', 'usr-001', 'ast-001', 'CDMX Central',
 '{"inches": 27, "resolution": "3840x2160 (4K UHD)", "panel": "IPS Black", "usb_hub": true}', '2027-02-10', '2024-10-01 10:10:00', '2024-01-16 10:15:00'),

('ast-010', 'IT-MON-0031', 'CN08821-P24', 'MONITOR', 'Dell', 'P2422H', 'ASSIGNED', 'usr-001', 'ast-001', 'CDMX Central',
 '{"inches": 24, "resolution": "1920x1080 (FHD)", "panel": "IPS", "inputs": "HDMI, DP, VGA"}', '2026-04-12', '2024-10-01 10:12:00', '2024-01-16 10:20:00'),

('ast-011', 'IT-MON-0032', 'CN07731-U32', 'MONITOR', 'Dell', 'UltraSharp U3223QE', 'ASSIGNED', 'usr-002', 'ast-002', 'Monterrey Hub',
 '{"inches": 32, "resolution": "3840x2160 (4K UHD)", "panel": "IPS Black", "usb_c_pd": "90W"}', '2027-05-18', '2024-09-15 11:35:00', '2024-02-02 11:15:00'),

('ast-012', 'IT-MON-0033', 'CN06641-P27', 'MONITOR', 'Dell', 'P2722H', 'AVAILABLE', NULL, NULL, 'CDMX Central - Bodega IT',
 '{"inches": 27, "resolution": "1920x1080 (FHD)", "panel": "IPS"}', '2026-01-15', '2024-05-10 14:15:00', '2023-09-01 09:00:00'),

-- Periféricos
('ast-013', 'IT-PRF-0040', 'MX3S-9901', 'PERIPHERAL', 'Logitech', 'MX Keys & MX Master 3S', 'ASSIGNED', 'usr-001', 'ast-001', 'CDMX Central',
 '{"type": "Combo Teclado + Ratón Bluetooth", "layout": "Español Latinoamérica", "rechargeable": true}', '2025-12-01', '2024-10-01 10:15:00', '2024-01-16 10:25:00'),

('ast-014', 'IT-PRF-0041', 'JB65-3312', 'PERIPHERAL', 'Jabra', 'Evolve2 65 Headset', 'ASSIGNED', 'usr-002', 'ast-002', 'Monterrey Hub',
 '{"type": "Diadema Inalámbrica ANC", "connector": "USB-A Dongle + Bluetooth"}', '2025-06-30', '2024-09-15 11:40:00', '2024-02-02 11:20:00');

-- 3. Historial de Activos (Auditoría inmutable)
INSERT OR IGNORE INTO asset_history (id, asset_id, action_type, previous_user_id, new_user_id, notes, responsiva_status, responsiva_doc_path, created_at) VALUES
('his-001', 'ast-001', 'CREATE', NULL, NULL, 'Ingreso inicial a inventario de hardware corporativo', 'NOT_REQUIRED', NULL, '2024-01-16 10:00:00'),
('his-002', 'ast-001', 'ASSIGN', NULL, 'usr-001', 'Asignación de equipo primario de desarrollo con dock y monitores', 'SIGNED', '/uploads/responsiva_EMP1001_signed.pdf', '2024-01-16 10:30:00'),
('his-003', 'ast-002', 'ASSIGN', NULL, 'usr-002', 'Entrega de equipo de diseño gráfico y monitor 32 4K', 'SIGNED', '/uploads/responsiva_EMP1002_signed.pdf', '2024-02-02 11:30:00'),
('his-004', 'ast-003', 'ASSIGN', NULL, 'usr-003', 'Asignación de laptop para DevOps y Docking Station', 'PENDING', NULL, '2024-02-16 10:00:00'),
('his-005', 'ast-005', 'STATUS_CHANGE', 'usr-004', NULL, 'Retiro de laptop por falla en teclado. Se envía a mantenimiento', 'NOT_REQUIRED', NULL, '2024-08-01 16:00:00'),
('his-006', 'ast-004', 'SWAP', 'usr-004', NULL, 'Swap preventivo: se reemplazó equipo con falla por equipo de reserva', 'PENDING', NULL, '2024-08-01 16:15:00');

-- 4. Campañas de Auditoría
INSERT OR IGNORE INTO audit_campaigns (id, name, target_location, status, created_at, closed_at) VALUES
('cmp-001', 'Auditoría Q4 - Sede CDMX Central', 'CDMX Central', 'OPEN', '2024-10-01 08:00:00', NULL),
('cmp-002', 'Auditoría Q3 - Sede Monterrey', 'Monterrey Hub', 'CLOSED', '2024-07-01 09:00:00', '2024-07-05 18:00:00');

-- 5. Escaneos de Auditoría (Demostrando casos de conciliación)
INSERT OR IGNORE INTO audit_scans (id, campaign_id, asset_id, expected_user_id, found_with_user_id, expected_location, found_location, discrepancy_type, resolved, scanned_at) VALUES
-- Match perfecto
('scn-001', 'cmp-001', 'ast-001', 'usr-001', 'usr-001', 'CDMX Central', 'CDMX Central', 'MATCH', 1, '2024-10-01 10:00:00'),
('scn-002', 'cmp-001', 'ast-006', 'usr-001', 'usr-001', 'CDMX Central', 'CDMX Central', 'MATCH', 1, '2024-10-01 10:05:00'),

-- Custodia Incorrecta (Wrong User): El docking ast-007 en sistema es de Carlos (usr-003), pero físicamente lo tiene Miguel Torres (usr-005)
('scn-003', 'cmp-001', 'ast-007', 'usr-003', 'usr-005', 'CDMX Central', 'CDMX Central', 'WRONG_USER', 0, '2024-10-01 10:30:00'),

-- Ubicación Incorrecta (Wrong Location): El monitor ast-010 según sistema está en CDMX Central, pero fue hallado en Monterrey
('scn-004', 'cmp-001', 'ast-010', 'usr-001', 'usr-001', 'CDMX Central', 'Monterrey Hub', 'WRONG_LOCATION', 0, '2024-10-01 11:00:00'),

-- Faltante (Missing): Laptop ast-004 debería estar en stock CDMX pero no fue encontrada en el barrido físico
('scn-005', 'cmp-001', 'ast-004', NULL, NULL, 'CDMX Central - Bodega IT', 'DESCONOCIDO', 'MISSING', 0, '2024-10-01 11:30:00');
