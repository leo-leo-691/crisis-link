const { NextResponse } = require('next/server');

module.exports.GET = async function GET() {
  try {
    const db = require('@/lib/db');
    const zones = db.prepare('SELECT * FROM venue_zones ORDER BY floor ASC, name ASC').all();

    // Add active incident count per zone
    const zonesWithStats = zones.map(z => {
      const activeCount = db.prepare(
        "SELECT COUNT(*) as c FROM incidents WHERE zone = ? AND status NOT IN ('resolved')"
      ).get(z.name)?.c || 0;
      return { ...z, active_incidents: activeCount };
    });

    return NextResponse.json({ zones: zonesWithStats });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
};
