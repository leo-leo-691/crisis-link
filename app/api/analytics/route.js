const { NextResponse } = require('next/server');

// GET /api/analytics — aggregate stats for the dashboard
export async function GET(request) {
  try {
    const { getUserFromRequest } = require('@/lib/auth');
    const user = getUserFromRequest(request);
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    if (user.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const db = require('@/lib/db');

    const [totalRes, activeRes, resolvedRes, avgResolutionRes, byTypeRes, byZoneRes, dailyRes] = await Promise.all([
      db.query("SELECT COUNT(*) as c FROM incidents WHERE is_drill = false"),
      db.query("SELECT COUNT(*) as c FROM incidents WHERE status <> 'resolved' AND is_drill = false"),
      db.query("SELECT COUNT(*) as c FROM incidents WHERE status = 'resolved' AND is_drill = false"),
      db.query(`
        SELECT AVG(EXTRACT(EPOCH FROM (resolved_at - created_at))/60) as avg_min
        FROM incidents
        WHERE resolved_at IS NOT NULL AND created_at IS NOT NULL AND is_drill = false
      `),
      db.query(`
        SELECT type, COUNT(*)::int as count
        FROM incidents
        WHERE is_drill = false
        GROUP BY type
        ORDER BY count DESC
      `),
      db.query(`
        SELECT zone, COUNT(*)::int as count
        FROM incidents
        WHERE is_drill = false
        GROUP BY zone
        ORDER BY count DESC
        LIMIT 6
      `),
      db.query(`
        WITH days AS (
          SELECT generate_series(
            CURRENT_DATE - INTERVAL '29 days',
            CURRENT_DATE,
            INTERVAL '1 day'
          )::date AS day
        ),
        counts AS (
          SELECT created_at::date AS day, COUNT(*)::int AS count
          FROM incidents
          WHERE is_drill = false
            AND created_at >= CURRENT_DATE - INTERVAL '29 days'
          GROUP BY created_at::date
        )
        SELECT days.day, COALESCE(counts.count, 0)::int AS count
        FROM days
        LEFT JOIN counts ON counts.day = days.day
        ORDER BY days.day ASC
      `),
    ]);

    const dailyCounts = dailyRes.rows.map((row) => ({
      day: new Date(row.day).toISOString().slice(0, 10),
      count: Number(row.count) || 0,
    }));

    return NextResponse.json({
      totalIncidents: parseInt(totalRes.rows[0].c, 10),
      activeIncidents: parseInt(activeRes.rows[0].c, 10),
      resolvedIncidents: parseInt(resolvedRes.rows[0].c, 10),
      avgResolutionMinutes: Math.round(Number(avgResolutionRes.rows[0].avg_min) || 0),
      byType: byTypeRes.rows.map((row) => ({ type: row.type || 'other', count: Number(row.count) || 0 })),
      byZone: byZoneRes.rows.map((row) => ({ zone: row.zone || 'Unknown', count: Number(row.count) || 0 })),
      dailyCounts,
    });
  } catch (err) {
    console.error('[GET /api/analytics]', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
