const { query, pool } = require('./lib/db');

async function fix() {
  await query(`
      CREATE TABLE IF NOT EXISTS venue_zones (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        floor INTEGER DEFAULT 1,
        map_x REAL, map_y REAL, map_width REAL, map_height REAL
      );
  `);
  
  const count = await query('SELECT COUNT(*) FROM venue_zones');
  if (parseInt(count.rows[0].count) === 0) {
    const zones = [
      ['Lobby', 1, 40, 380, 200, 100],
      ['Front Desk', 1, 260, 380, 120, 100],
      ['Restaurant', 1, 400, 380, 200, 100],
      ['Bar & Lounge', 1, 620, 380, 170, 100],
      ['Pool Deck', 1, 40, 260, 250, 100],
      ['Gym & Spa', 1, 310, 260, 200, 100],
      ['Grand Ballroom', 1, 530, 260, 260, 100],
      ['Floor 1 East', 2, 40, 140, 180, 80],
      ['Floor 1 West', 2, 240, 140, 180, 80],
      ['Floor 2 East', 3, 440, 140, 180, 80],
      ['Floor 2 West', 3, 640, 140, 180, 80],
      ['Kitchen', 1, 400, 340, 100, 30],
      ['Laundry', 0, 520, 340, 80, 30],
      ['Server Room', 2, 40, 100, 60, 30],
    ];
    for (const z of zones) {
      await query('INSERT INTO venue_zones (name, floor, map_x, map_y, map_width, map_height) VALUES ($1, $2, $3, $4, $5, $6)', z);
    }
    console.log('seeded zones');
  }
  process.exit();
}
fix();
