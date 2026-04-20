const { query, initSchema } = require('../lib/db');

async function testConnection() {
  try {
    console.log('Testing connection using lib/db.js...');
    await initSchema(); 
    const res = await query('SELECT NOW()');
    console.log('✅ Connection Successful!');
    console.log('Server time:', res.rows[0].now);
    
    // Check tables
    const tableRes = await query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
    `);
    console.log('Existing tables:', tableRes.rows.map(r => r.table_name));
    
  } catch (err) {
    console.error('❌ Connection Failed:', err.message);
  } finally {
    process.exit(0);
  }
}

testConnection();
