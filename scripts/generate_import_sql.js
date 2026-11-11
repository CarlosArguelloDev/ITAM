const fs = require('fs');
const crypto = require('crypto');

function parseCSVLine(text) {
  const result = [];
  let cur = '';
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (c === '"') inQuotes = !inQuotes;
    else if (c === ',' && !inQuotes) { result.push(cur.trim()); cur = ''; }
    else cur += c;
  }
  result.push(cur.trim());
  return result;
}

function normalizeName(str) {
  if (!str) return '';
  return str.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
}

function genId(prefix) {
  return `${prefix}-${crypto.randomBytes(6).toString('hex')}`;
}

// 1. Read Users CSV
const userLines = fs.readFileSync('data/users_import.csv', 'utf8').split(/\r?\n/).filter(l => l.trim().length > 0);
const users = [];
const userMapByNormName = new Map();
const userMapByCode = new Map();
let autoEmpSeq = 1000;

for (let i = 1; i < userLines.length; i++) {
  const cols = parseCSVLine(userLines[i]);
  if (cols.length < 3) continue;
  let code = cols[0].replace(/^["']|["']$/g, '').trim();
  let name = cols[1].replace(/^["']|["']$/g, '').trim();
  let email = cols[2].replace(/^["']|["']$/g, '').trim();
  let loc = cols[3] ? cols[3].replace(/^["']|["']$/g, '').trim().toUpperCase() : 'OPM';

  if (!name) continue;

  if (name.includes(',')) {
    const parts = name.split(',').map(p => p.trim());
    if (parts.length === 2) name = parts[1] + ' ' + parts[0];
  }

  if (loc !== 'OMEX') loc = 'OPM';

  if (!code) {
    code = `EMP-${loc}-${autoEmpSeq++}`;
  }

  if (code && userMapByCode.has(code)) {
    const existing = userMapByCode.get(code);
    userMapByNormName.set(normalizeName(name), existing);
    continue;
  }

  const uObj = {
    id: genId('usr'),
    code,
    name,
    email: email || `${normalizeName(name).replace(/\s+/g, '.')}@optibelt.com`,
    department: 'GENERAL',
    location: loc,
    isActive: 1,
    norm: normalizeName(name)
  };
  users.push(uObj);
  userMapByNormName.set(uObj.norm, uObj);
  userMapByCode.set(code, uObj);
}

// Alias mapping for user names found in assignments
const nameAliases = {
  'brenda noemi chavez mendez': 'brenda nahomi chavez mendez',
  'luis gael (trainee)': 'luis gael otero uribe',
  'christian castillo': 'christian salvador castillo munoz',
  'oscar alvarez cisneros': 'oscar alvares cisneros',
  'cristina avila /practicante': 'cristina avila gallegos',
  'chavez silva, carlos manuel': 'carlos manuel chavez silva',
  'carlos manuel (manto)': 'carlos manuel chavez silva',
  'sergio siller': 'sergio tadeo siller garcia',
  'milagros nayzeth': 'milagros nayzeth mendez gomez',
  'galilea navarrete': 'galilea navarrete mejia',
  'galilea': 'galilea navarrete mejia',
  'moises': 'moises lopez nicolas',
  'moises lopez': 'moises lopez nicolas',
  'everardo': 'jose everardo castaneda aguirre',
  'everardo castaneda': 'jose everardo castaneda aguirre',
  'enrique figueroa': 'juan enrique figueroa lara',
  'maria fernanda gonzalez': 'maria fernanda gonzalez rodriguez',
  'antonio fernandez': 'carlos antonio fernandez salazar',
};

// 2. Read Assignments CSV
const assignLines = fs.readFileSync('data/assignments_import.csv', 'utf8').split(/\r?\n/).filter(l => l.trim().length > 0);
const rawAssignments = [];

for (let i = 1; i < assignLines.length; i++) {
  const cols = parseCSVLine(assignLines[i]);
  if (cols.length < 5) continue;
  let user = cols[0].replace(/^["']|["']$/g, '').trim();
  let device = cols[1].replace(/^["']|["']$/g, '').trim().toUpperCase();
  let model = cols[2].replace(/^["']|["']$/g, '').trim();
  let serial = cols[3].replace(/^["']|["']$/g, '').trim();
  let brand = cols[4].replace(/^["']|["']$/g, '').trim();
  let desc = cols[5] ? cols[5].replace(/^["']|["']$/g, '').trim() : '';
  let dept = cols[6] ? cols[6].replace(/^["']|["']$/g, '').trim().toUpperCase() : '';
  let plant = cols[7] ? cols[7].replace(/^["']|["']$/g, '').trim().toUpperCase() : 'OPM';
  let assignedStatus = cols[8] ? cols[8].replace(/^["']|["']$/g, '').trim().toUpperCase() : '';
  let startDate = cols[9] ? cols[9].replace(/^["']|["']$/g, '').trim() : '';
  let hostname = cols[10] ? cols[10].replace(/^["']|["']$/g, '').trim() : '';

  if (!device) continue;

  // Filter out keyboards and mice per user instructions
  if (['MOUSE', 'TECLADO', 'TECLADO Y MOUSE', 'TECLADO NUMERICO'].includes(device)) {
    continue;
  }

  // Normalize location / plant
  if (plant !== 'OMEX') plant = 'OPM';

  // Normalize department
  let cleanDept = dept;
  if (cleanDept === 'RH') cleanDept = 'HR';
  if (cleanDept === 'FINANZAS') cleanDept = 'FINANCE';
  if (cleanDept === 'PUCHARSING') cleanDept = 'PURCHASING';
  if (cleanDept === 'MANAGMENT') cleanDept = 'MANAGEMENT';
  if (cleanDept === '?' || cleanDept === 'UNASSIGNED') cleanDept = 'GENERAL';
  if (!cleanDept) cleanDept = 'GENERAL';

  rawAssignments.push({
    user,
    device,
    model,
    serial,
    brand,
    desc,
    dept: cleanDept,
    plant,
    assignedStatus,
    startDate,
    hostname
  });
}

// Ensure all distinct departments are tracked
const allDepartments = new Set(['LOGISTICS', 'PRODUCTION', 'MAINTENANCE', 'QUALITY', 'FINANCE', 'HR', 'IT', 'EHS', 'PURCHASING', 'SAP', 'MANAGEMENT', 'GENERAL']);
rawAssignments.forEach(a => {
  if (a.dept) allDepartments.add(a.dept);
});

// Check if any users need to be added from assignments (employees not in user_import.csv)
const extraEmployees = [
  { name: 'Jose Ramon Hernandez Guerrero', dept: 'SITE 1', loc: 'OPM' },
  { name: 'Milagros Nayzeth Mendez Gomez', dept: 'QUALITY', loc: 'OPM' },
  { name: 'Ariel Adair (Trainee)', dept: 'FINANCE', loc: 'OPM' },
  { name: 'Francisco Alonso Reza Flores', dept: 'FINANCE', loc: 'OPM' },
  { name: 'Jenifer Alejandra Cortes Quintanar', dept: 'FINANCE', loc: 'OPM' },
  { name: 'Leobardo Islas Reyna', dept: 'MAINTENANCE', loc: 'OPM' },
  { name: 'Phillip', dept: 'MANAGEMENT', loc: 'OPM' },
  { name: 'Rafael Medina Valdes', dept: 'LOGISTICS', loc: 'OPM' },
  { name: 'Boris Held', dept: 'MANAGEMENT', loc: 'OPM' },
  { name: 'Ronald Bruemmer', dept: 'MANAGEMENT', loc: 'OPM' },
  { name: 'Ana Karen Colin Herrera', dept: 'IT', loc: 'OPM' },
  { name: 'YK', dept: 'PRODUCTION', loc: 'OPM' },
];

for (const emp of extraEmployees) {
  const norm = normalizeName(emp.name);
  if (!userMapByNormName.has(norm)) {
    const uObj = {
      id: genId('usr'),
      code: `EMP-OPM-${autoEmpSeq++}`,
      name: emp.name,
      email: `${norm.replace(/[^a-z0-9]/g, '.')}@optibelt.com`,
      department: emp.dept,
      location: emp.loc,
      isActive: 1,
      norm
    };
    users.push(uObj);
    userMapByNormName.set(norm, uObj);
  }
}

// Update users' department from their equipment assignments
rawAssignments.forEach(a => {
  if (!a.user) return;
  let normU = normalizeName(a.user);
  if (nameAliases[normU]) normU = nameAliases[normU];
  const u = userMapByNormName.get(normU);
  if (u && a.dept && a.dept !== 'GENERAL' && !a.dept.startsWith('SITE') && !a.dept.startsWith('PASILLO')) {
    u.department = a.dept;
  }
});

// Category normalizer
function normalizeCategory(dev) {
  dev = dev.toUpperCase();
  if (dev.includes('LAPTOP')) return 'LAPTOP';
  if (dev.includes('MONITOR')) return 'MONITOR';
  if (dev.includes('DOCKING')) return 'DOCKING';
  if (dev.includes('WORKSTATION')) return 'WORKSTATION';
  if (dev.includes('AUDIFONOS')) return 'AUDIFONOS';
  if (dev.includes('TELEFONO') && !dev.includes('FIJO')) return 'TELEFONO';
  if (dev.includes('TELEFONO FIJO')) return 'TELEFONO FIJO';
  if (dev.includes('SIM')) return 'SIM-CARD';
  if (dev.includes('IMPRESORA')) return 'IMPRESORA';
  if (dev.includes('SCANNER')) return 'SCANNER';
  if (dev.includes('IPAD') || dev.includes('TABLET')) return 'IPAD';
  if (dev.includes('FIREWALL')) return 'FIREWALL';
  if (dev.includes('SWITCH')) return 'SWITCH';
  if (dev.includes('ACCESS POINT')) return 'ACCESS POINT';
  if (dev.includes('SERVER')) return 'SERVER';
  if (dev.includes('NVR')) return 'NVR';
  if (dev.includes('DVR')) return 'DVR';
  if (dev.includes('ROUTER')) return 'ROUTER';
  if (dev.includes('APC') || dev.includes('NO-BREAK')) return 'NO-BREAK';
  if (dev.includes('PDU')) return 'PDU';
  if (dev.includes('PROYECTOR')) return 'PROYECTOR';
  if (dev.includes('TELEVISI') || dev.includes('TV')) return 'TELEVISION';
  if (dev.includes('TRITURADORA')) return 'TRITURADORA';
  if (dev.includes('CONTROL TV')) return 'CONTROL TV';
  if (dev.includes('CONVERTIDOR')) return 'CONVERTIDOR DE MEDIOS';
  if (dev.includes('GOPRO')) return 'GOPRO';
  if (dev.includes('RACK MOUNT')) return 'RACK MOUNT TRAY';
  if (dev.includes('ADAPTADOR')) return 'ADAPTADOR DE RED';
  if (dev.includes('BOCINA')) return 'BOCINA';
  if (dev.includes('BATERIA')) return 'BATERIA';
  if (dev.includes('CARGADOR BATERIA')) return 'CARGADOR BATERIA';
  if (dev.includes('QUEMADOR')) return 'QUEMADOR DE CD';
  return 'OTHER';
}

// Build assets list
const assets = [];
const usedTags = new Set();
let autoTagSeq = 1;

for (const a of rawAssignments) {
  const cat = normalizeCategory(a.device);
  let tag = a.hostname.trim();

  // If duplicate tag or empty tag
  if (!tag || tag === 'NA' || tag === 'N/A' || usedTags.has(tag)) {
    if (tag && usedTags.has(tag)) {
      tag = `${tag}-2`;
    }
    if (!tag || usedTags.has(tag)) {
      tag = `OPM-AST-${String(autoTagSeq++).padStart(4, '0')}`;
    }
  }
  usedTags.add(tag);

  // Assets start unassigned in inventory
  let assignedUserId = null;
  let status = 'AVAILABLE';

  // Brand / Model fallbacks
  let brand = a.brand || 'Generico';
  let model = a.model || a.device;

  let cleanSN = a.serial || 'NO LEGIBLE';
  const specsObj = {
    original_device: a.device,
    description: a.desc,
    department: a.dept,
    start_date: a.startDate || null,
  };

  if (cleanSN.includes('/')) {
    const parts = cleanSN.split('/').map(p => p.trim());
    const p1 = parts[0];
    const p2 = parts[1] || '';

    if (cat === 'SCANNER') {
      cleanSN = (p1.startsWith('S') && /^\d+$/.test(p1.slice(1))) ? p1.slice(1) : p1;
      if (p2) {
        const hex = p2.replace(/[^A-Fa-f0-9]/g, '').toUpperCase();
        specsObj.mac_address = hex.length === 12 ? hex.match(/.{1,2}/g).join(':') : hex;
        specsObj.raw_mac = p2;
      }
    } else if (cat === 'SIM-CARD') {
      cleanSN = p1;
      if (p2) specsObj.puk = p2;
    } else if (cat === 'TELEFONO') {
      const c1 = p1.replace(/\s+/g, '');
      const c2 = p2.replace(/\s+/g, '');
      let imei = '', appleSn = '';
      if (c1.startsWith('35') && c1.length >= 14) {
        imei = c1;
        appleSn = c2;
      } else {
        imei = c2;
        appleSn = c1;
      }
      if (appleSn.startsWith('S') && (appleSn.length === 11 || appleSn.length === 13)) {
        appleSn = appleSn.slice(1);
      }
      cleanSN = appleSn;
      if (imei) specsObj.imei = imei;
    }
  }

  assets.push({
    id: genId('ast'),
    tag,
    serial: cleanSN,
    category: cat,
    brand,
    model,
    status,
    assignedUserId,
    parentAssetId: null, // Will be linked to laptop if applicable
    location: a.plant,
    department: a.dept,
    specs: JSON.stringify(specsObj)
  });
}

// Link parent_asset_id: If a user has a LAPTOP, other assets assigned to that user point to the laptop!
const userLaptops = new Map();
assets.forEach(ast => {
  if (ast.assignedUserId && ast.category === 'LAPTOP') {
    userLaptops.set(ast.assignedUserId, ast.id);
  }
});

assets.forEach(ast => {
  if (ast.assignedUserId && ast.category !== 'LAPTOP') {
    if (userLaptops.has(ast.assignedUserId)) {
      ast.parentAssetId = userLaptops.get(ast.assignedUserId);
    }
  }
});

console.log('Total departments to insert:', allDepartments.size);
console.log('Total users to insert:', users.length);
console.log('Total assets to insert:', assets.length);

function sqlStr(val) {
  if (val === null || val === undefined) return 'NULL';
  return "'" + String(val).replace(/'/g, "''") + "'";
}

// Generate SQL
let sql = `-- Opti ITAM - Real Enterprise Data Seed
-- Generated at: ${new Date().toISOString()}

PRAGMA foreign_keys = OFF;

DELETE FROM audit_scans;
DELETE FROM audit_campaigns;
DELETE FROM asset_history;
DELETE FROM assets;
DELETE FROM users;
DELETE FROM departments;

`;

// Insert departments
sql += `-- Departamentos\n`;
let deptIdx = 1;
for (const dept of [...allDepartments].sort()) {
  sql += `INSERT INTO departments (id, name) VALUES ('dept-${String(deptIdx++).padStart(3, '0')}', ${sqlStr(dept)});\n`;
}

// Insert users
sql += `\n-- Usuarios / Colaboradores (${users.length})\n`;
for (const u of users) {
  sql += `INSERT INTO users (id, employee_code, full_name, email, department, location, is_active) VALUES (${sqlStr(u.id)}, ${sqlStr(u.code)}, ${sqlStr(u.name)}, ${sqlStr(u.email)}, ${sqlStr(u.department)}, ${sqlStr(u.location)}, 1);\n`;
}

// Insert assets
sql += `\n-- Activos (${assets.length})\n`;
for (const a of assets) {
  sql += `INSERT INTO assets (id, asset_tag, serial_number, category, brand, model, status, assigned_to_user_id, parent_asset_id, location, department, specs) VALUES (${sqlStr(a.id)}, ${sqlStr(a.tag)}, ${sqlStr(a.serial)}, ${sqlStr(a.category)}, ${sqlStr(a.brand)}, ${sqlStr(a.model)}, ${sqlStr(a.status)}, ${a.assignedUserId ? sqlStr(a.assignedUserId) : 'NULL'}, ${a.parentAssetId ? sqlStr(a.parentAssetId) : 'NULL'}, ${sqlStr(a.location)}, ${sqlStr(a.department)}, ${sqlStr(a.specs)});\n`;
}

// Insert asset_history
sql += `\n-- Historial inicial de activos\n`;
for (const a of assets) {
  const action = a.assignedUserId ? 'ASSIGN' : 'CREATE';
  sql += `INSERT INTO asset_history (id, asset_id, action_type, new_user_id, notes, responsiva_status) VALUES (${sqlStr(genId('his'))}, ${sqlStr(a.id)}, ${sqlStr(action)}, ${a.assignedUserId ? sqlStr(a.assignedUserId) : 'NULL'}, 'Alta inicial en inventario corporativo', 'NOT_REQUIRED');\n`;
}

sql += `\nPRAGMA foreign_keys = ON;\n`;

fs.writeFileSync('internal/db/seed.sql', sql, 'utf8');
fs.writeFileSync('data/real_seed.sql', sql, 'utf8');
console.log('Saved real_seed.sql successfully! Total size:', sql.length, 'bytes');
