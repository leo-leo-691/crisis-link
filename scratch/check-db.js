const { query } = require('./lib/db');
async function check() {
  const res = await query('SELECT email FROM users');
  console.log(res.rows);
  process.exit();
}
check();
