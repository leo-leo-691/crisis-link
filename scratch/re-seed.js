const { query, pool } = require('../lib/db');
const bcrypt = require('bcrypt');

async function seed() {
  await query('DROP TABLE incidents CASCADE;');
  await query('DROP TABLE users CASCADE;');
  await query('DROP TABLE venue_zones CASCADE;');
  
  await query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        email TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        name TEXT NOT NULL,
        role TEXT NOT NULL CHECK(role IN ('admin','manager','staff','guest')),
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
        is_drill BOOLEAN DEFAULT FALSE,
        sop_seeded BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW(),
        resolved_at TIMESTAMPTZ
      );
  `);
  
  const users = [
    { email: 'admin@grandhotel.com', pw: 'demo1234', name: 'Crisis Admin', role: 'admin' },
    { email: 'manager@grandhotel.com', pw: 'demo1234', name: 'Duty Manager', role: 'manager' },
    { email: 'staff@grandhotel.com', pw: 'demo1234', name: 'Marcus Rivera', role: 'staff', zone: 'Security' }
  ];

  for (const u of users) {
    const hash = bcrypt.hashSync(u.pw, 10);
    await query('INSERT INTO users (email, password_hash, name, role, zone_assignment) VALUES ($1, $2, $3, $4, $5)', [u.email, hash, u.name, u.role, u.zone]);
  }
  
  console.log('Seeded successfully!');
  process.exit();
}
seed();
