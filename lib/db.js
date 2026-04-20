const Database = require('better-sqlite3');
const bcrypt = require('bcrypt');
const path = require('path');
const fs = require('fs');

// Ensure data dir
const dataDir = path.join(process.cwd(), 'data');
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

const db = new Database(path.join(dataDir, 'crisislink.db'), { verbose: null });
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// ── Schema ─────────────────────────────────────────────────────────────────
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    name TEXT NOT NULL,
    role TEXT NOT NULL CHECK(role IN ('admin','staff','guest')),
    zone_assignment TEXT,
    is_active INTEGER DEFAULT 1,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS incidents (
    id TEXT PRIMARY KEY,
    type TEXT NOT NULL,
    severity TEXT NOT NULL DEFAULT 'medium' CHECK(severity IN ('low','medium','high','critical')),
    status TEXT NOT NULL DEFAULT 'reported' CHECK(status IN ('reported','acknowledged','responding','contained','resolved')),
    zone TEXT NOT NULL,
    room_number TEXT,
    reporter_name TEXT,
    reporter_type TEXT DEFAULT 'guest' CHECK(reporter_type IN ('guest','staff')),
    description TEXT,
    description_translated TEXT,
    detected_language TEXT,
    ai_triage TEXT,
    ai_provider TEXT,
    evacuation_route TEXT,
    assigned_staff TEXT DEFAULT '[]',
    recommended_responder TEXT,
    is_drill INTEGER DEFAULT 0,
    sop_seeded INTEGER DEFAULT 0,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
    resolved_at TEXT
  );

  CREATE TABLE IF NOT EXISTS incident_tasks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    incident_id TEXT NOT NULL,
    title TEXT NOT NULL,
    assigned_to INTEGER,
    priority TEXT DEFAULT 'medium' CHECK(priority IN ('low','medium','high','urgent')),
    is_complete INTEGER DEFAULT 0,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(incident_id) REFERENCES incidents(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS incident_messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    incident_id TEXT NOT NULL,
    user_id INTEGER,
    sender_name TEXT NOT NULL,
    message TEXT NOT NULL,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(incident_id) REFERENCES incidents(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS incident_timeline (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    incident_id TEXT NOT NULL,
    actor TEXT NOT NULL,
    action TEXT NOT NULL,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(incident_id) REFERENCES incidents(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS venue_zones (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    floor INTEGER DEFAULT 1,
    map_x REAL, map_y REAL, map_width REAL, map_height REAL
  );

  CREATE TABLE IF NOT EXISTS broadcast_messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    sender_id INTEGER,
    message TEXT NOT NULL,
    target_role TEXT DEFAULT 'all',
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
  );
`);

// ── SOP Templates ───────────────────────────────────────────────────────────
const SOP_TASKS = {
  fire:     ['Call 911 immediately', 'Activate fire alarm pull station', 'Begin evacuation of affected floor', 'Meet fire department at lobby entrance', 'Account for all guests in affected zone'],
  medical:  ['Call 911 / EMS immediately', 'Retrieve AED from nearest station', 'Clear area around patient', 'Assign staff to meet paramedics at entrance', 'Document patient condition and timeline'],
  security: ['Secure affected area perimeter', 'Do not confront suspect directly', 'Call local police (if threat to safety)', 'Preserve CCTV footage', 'Take statements from witnesses'],
  flood:    ['Shut off water main if safe', 'Evacuate guests from flooded zones', 'Contact maintenance team', 'Document damage for insurance', 'Set up dehumidifiers and fans'],
  evacuation:['Sound building-wide evacuation alarm', 'Guide guests to designated assembly points', 'Account for all registered guests', 'Deploy staff to stairwells', 'Coordinate with fire marshal'],
  other:    ['Assess scene safety', 'Notify duty manager', 'Contact emergency services if required', 'Document all response actions', 'Debrief team after resolution'],
};

// ── Seed ────────────────────────────────────────────────────────────────────
function seedDatabase() {
  const count = db.prepare('SELECT COUNT(*) as c FROM users').get().c;
  if (count > 0) return;

  console.log('[DB] Seeding database...');

  // Users
  const insertUser = db.prepare(
    'INSERT INTO users (email, password_hash, name, role, zone_assignment) VALUES (?, ?, ?, ?, ?)'
  );
  const users = [
    { email: 'admin@grandhotel.com',       pw: 'demo1234', name: 'Sarah Chen',     role: 'admin',  zone: null },
    { email: 'security@grandhotel.com',    pw: 'demo1234', name: 'Marcus Rivera',  role: 'staff',  zone: 'Security' },
    { email: 'frontdesk@grandhotel.com',   pw: 'demo1234', name: 'Priya Sharma',   role: 'staff',  zone: 'Lobby' },
    { email: 'housekeeping@grandhotel.com',pw: 'demo1234', name: 'David Kim',      role: 'staff',  zone: 'Floor 3' },
    { email: 'maintenance@grandhotel.com', pw: 'demo1234', name: "James O'Brien",  role: 'staff',  zone: 'Maintenance' },
  ];
  for (const u of users) {
    const hash = bcrypt.hashSync(u.pw, 10);
    insertUser.run(u.email, hash, u.name, u.role, u.zone);
  }

  // Zones
  const insertZone = db.prepare(
    'INSERT INTO venue_zones (name, floor, map_x, map_y, map_width, map_height) VALUES (?, ?, ?, ?, ?, ?)'
  );
  const zones = [
    ['Lobby',             1, 50,  380, 180, 100],
    ['Front Desk',        1, 240, 380, 120, 100],
    ['Restaurant',        1, 370, 380, 160, 100],
    ['Kitchen',           1, 540, 380, 110, 100],
    ['Bar/Lounge',        1, 660, 380, 120, 100],
    ['Pool Area',         1, 50,  260, 200, 110],
    ['Spa',               1, 260, 260, 140, 110],
    ['Gym',               1, 410, 260, 130, 110],
    ['Conference Room A', 1, 550, 260, 150, 110],
    ['Parking',           0, 710, 260, 70,  110],
    ['Floor 1',           1, 50,  160, 170,  90],
    ['Floor 2',           2, 230, 160, 170,  90],
    ['Floor 3',           3, 410, 160, 170,  90],
    ['Floor 4',           4, 590, 160, 190,  90],
  ];
  for (const z of zones) insertZone.run(...z);

  // Seed incidents
  const insertInc = db.prepare(`
    INSERT INTO incidents (id, type, severity, status, zone, reporter_name, reporter_type, description, is_drill, created_at, updated_at, resolved_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  const now = new Date();
  const incidents = [
    {
      id: 'INC-20250419-0001', type: 'medical',  severity: 'high',
      status: 'responding', zone: 'Restaurant',
      rep: 'John Guest', repType: 'guest',
      desc: 'Guest collapsed near table 12, appears unconscious, not responding to voice',
      drill: 0,
      created: new Date(now - 15 * 60000).toISOString(),
      updated: new Date(now - 10 * 60000).toISOString(),
      resolved: null,
    },
    {
      id: 'INC-20250419-0002', type: 'fire', severity: 'critical',
      status: 'resolved', zone: 'Kitchen',
      rep: 'Chef Marco', repType: 'staff',
      desc: 'Grease fire on stove, extinguished with fire suppression system',
      drill: 0,
      created: new Date(now - 3 * 3600000).toISOString(),
      updated: new Date(now - 2 * 3600000).toISOString(),
      resolved: new Date(now - 2 * 3600000).toISOString(),
    },
    {
      id: 'INC-20250419-0003', type: 'security', severity: 'medium',
      status: 'resolved', zone: 'Parking',
      rep: 'Anonymous', repType: 'guest',
      desc: 'Suspicious individual attempting to access guest vehicles',
      drill: 0,
      created: new Date(now - 6 * 3600000).toISOString(),
      updated: new Date(now - 5 * 3600000).toISOString(),
      resolved: new Date(now - 5 * 3600000).toISOString(),
    },
  ];

  for (const inc of incidents) {
    insertInc.run(inc.id, inc.type, inc.severity, inc.status, inc.zone, inc.rep, inc.repType, inc.desc, inc.drill, inc.created, inc.updated, inc.resolved);
    db.prepare('INSERT INTO incident_timeline (incident_id, actor, action, created_at) VALUES (?, ?, ?, ?)')
      .run(inc.id, inc.rep, `Incident reported: ${inc.desc.slice(0, 60)}`, inc.created);
  }

  console.log('[DB] Seed complete — 5 users, 14 zones, 3 incidents');
}

seedDatabase();
db.SOP_TASKS = SOP_TASKS;
module.exports = db;
