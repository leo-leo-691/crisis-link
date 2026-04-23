const supabase = require('../lib/supabase');

async function fix() {
  const { count, error: countError } = await supabase
    .from('venue_zones')
    .select('id', { count: 'exact', head: true });
  if (countError) throw countError;

  if ((count || 0) === 0) {
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
    const { error } = await supabase.from('venue_zones').insert(
      zones.map((z) => ({
        name: z[0],
        floor: z[1],
        map_x: z[2],
        map_y: z[3],
        map_width: z[4],
        map_height: z[5],
      }))
    );
    if (error) throw error;
    console.log('seeded zones');
  }
  process.exit();
}
fix();
