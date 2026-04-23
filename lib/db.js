const { Pool } = require('pg');
const bcrypt = require('bcrypt');
require('dotenv').config();

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  console.warn('⚠️ DATABASE_URL not found. Database operations will fail until configured.');
}

const isProduction = process.env.NODE_ENV === 'production';

const pool = new Pool({
  connectionString,
  ssl: connectionString?.includes('localhost') ? false : { rejectUnauthorized: false },
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
});

pool.on('error', (err) => {
  console.error('💥 Unexpected error on idle client', err);
});

const query = async (text, params) => {
  const start = Date.now();
  try {
    const res = await pool.query(text, params);
    const duration = Date.now() - start;
    if (process.env.DEBUG === 'true') {
      console.log('[DB] Query Executed:', { text, duration, rows: res.rowCount });
    }
    return res;
  } catch (err) {
    console.error('[DB] Query Error:', { text, error: err.message });
    // Provide a safe fallback response format if the query fails, preventing outright crashes in some map/filter loops
    throw err;
  }
};

const SOP_TASKS = {
  fire:     ['Call emergency services (911/999)', 'Activate nearest fire alarm pull station', 'Announce evacuation via PA system', 'Maneuver guests to assembly point A', 'Direct fire service to FDC entrance'],
  medical:  ['Dispatch first-aid certified staff', 'Request paramedics via secondary line', 'Retrieve AED/BVM from security office', 'Clear path for ambulance access', 'Assign liaison for patient next-of-kin'],
  security: ['Seal all entry/exit points', 'Deploy security response team', 'Secure witnesses in lounge area', 'Preserve digital CCTV evidence', 'Contact law enforcement supervisor'],
  flood:    ['Isolate primary water valves', 'Protect electrical assets in basement', 'Relocate guests from ground floor', 'Deploy emergency drainage pumps', 'Notify maintenance engineering team'],
  evacuation:['Initiate full building sweep', 'Verify stairwell clearance', 'Check accessibility needs of guests', 'Confirm assembly point headcount', 'Await official "All Clear" from authorities'],
  other:    ['Establish command post', 'Verify scene safety', 'Notify property manager', 'Document incident in logbook', 'Conduct after-action review'],
};

async function initSchema() {
  if (!connectionString) return;
  
  try {
    await query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        email TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        name TEXT NOT NULL,
        role TEXT NOT NULL CHECK(role IN ('admin','staff','guest')),
        zone_assignment TEXT,
        is_active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS incidents (
        id TEXT PRIMARY KEY,
        type TEXT NOT NULL,
        severity TEXT NOT NULL DEFAULT 'medium',
        status TEXT NOT NULL DEFAULT 'reported',
        zone TEXT NOT NULL,
        room_number TEXT,
        reporter_name TEXT,
        reporter_type TEXT DEFAULT 'guest',
        description TEXT,
        description_translated TEXT,
        detected_language TEXT,
        ai_triage JSONB,
        ai_provider TEXT,
        evacuation_route TEXT,
        assigned_staff JSONB DEFAULT '[]',
        recommended_responder TEXT,
        debrief_report TEXT,
        is_drill BOOLEAN DEFAULT FALSE,
        sop_seeded BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW(),
        resolved_at TIMESTAMPTZ
      );

      CREATE TABLE IF NOT EXISTS incident_tasks (
        id SERIAL PRIMARY KEY,
        incident_id TEXT NOT NULL REFERENCES incidents(id) ON DELETE CASCADE,
        title TEXT NOT NULL,
        assigned_to INTEGER,
        priority TEXT DEFAULT 'medium',
        is_complete BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS incident_messages (
        id SERIAL PRIMARY KEY,
        incident_id TEXT NOT NULL REFERENCES incidents(id) ON DELETE CASCADE,
        user_id INTEGER,
        sender_name TEXT NOT NULL,
        message TEXT NOT NULL,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS incident_timeline (
        id SERIAL PRIMARY KEY,
        incident_id TEXT NOT NULL REFERENCES incidents(id) ON DELETE CASCADE,
        actor TEXT NOT NULL,
        action TEXT NOT NULL,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS venue_zones (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        floor INTEGER DEFAULT 1,
        map_x REAL, map_y REAL, map_width REAL, map_height REAL
      );

      CREATE TABLE IF NOT EXISTS broadcast_messages (
        id SERIAL PRIMARY KEY,
        sender_id INTEGER,
        message TEXT NOT NULL,
        target_role TEXT DEFAULT 'all',
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);

    await query(`
      ALTER TABLE incidents
      ADD COLUMN IF NOT EXISTS debrief_report TEXT;
    `);
    
    const userCount = await query('SELECT COUNT(*) FROM users');
    if (parseInt(userCount.rows[0].count) === 0) {
      await seedDatabase();
    }
  } catch (err) {
    console.error('[DB] Schema Initialization Failed:', err.message);
  }
}

async function seedDatabase() {
  console.log('[DB] Seeding essential data...');
  const users = [
    { email: 'admin@grandhotel.com', pw: 'demo1234', name: 'Crisis Admin', role: 'admin' },
    { email: 'manager@grandhotel.com', pw: 'demo1234', name: 'Duty Manager', role: 'manager' },
    { email: 'staff@grandhotel.com', pw: 'demo1234', name: 'Marcus Rivera', role: 'staff', zone: 'Security' }
  ];

  for (const u of users) {
    const hash = bcrypt.hashSync(u.pw, 10);
    await query('INSERT INTO users (email, password_hash, name, role, zone_assignment) VALUES ($1, $2, $3, $4, $5)', [u.email, hash, u.name, u.role, u.zone]);
  }

  const zones = [
    // Ground Floor / Amenities
    ['Lobby', 1, 40, 380, 200, 100],
    ['Front Desk', 1, 260, 380, 120, 100],
    ['Restaurant', 1, 400, 380, 200, 100],
    ['Bar & Lounge', 1, 620, 380, 170, 100],
    ['Pool Deck', 1, 40, 260, 250, 100],
    ['Gym & Spa', 1, 310, 260, 200, 100],
    ['Grand Ballroom', 1, 530, 260, 260, 100],
    
    // High Level Floors
    ['Floor 1 East', 2, 40, 140, 180, 80],
    ['Floor 1 West', 2, 240, 140, 180, 80],
    ['Floor 2 East', 3, 440, 140, 180, 80],
    ['Floor 2 West', 3, 640, 140, 180, 80],
    
    // Support Areas
    ['Kitchen', 1, 400, 340, 100, 30],
    ['Laundry', 0, 520, 340, 80, 30],
    ['Server Room', 2, 40, 100, 60, 30],
  ];

  for (const z of zones) {
    await query('INSERT INTO venue_zones (name, floor, map_x, map_y, map_width, map_height) VALUES ($1, $2, $3, $4, $5, $6)', z);
  }
}

// Ensure unique initialization
if (!global._dbInitPromise) {
  global._dbInitPromise = initSchema()
    .then(() => {
      console.log('📦 Database Schema Synced');
      return true;
    })
    .catch((err) => {
      console.error('📦 Database Schema Sync Failed:', err);
      global._dbInitPromise = null; // Allow retry on next request
    });
}

module.exports = { pool, query, SOP_TASKS };

