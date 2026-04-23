const supabase = require('../lib/supabase');
async function check() {
  const { data, error } = await supabase.from('users').select('email');
  if (error) throw error;
  console.log(data);
  process.exit();
}
check();
