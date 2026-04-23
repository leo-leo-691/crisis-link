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

    // Run all analysis queries in parallel for high performance
    const [
      totalRes, 
      activeRes, 
      resolvedRes, 
      criticalRes,
      byTypeRes,
      bySeverityRes,
      byZoneRes,
      byStatusRes,
      avgResponseRes,
      trendRes,
      aiProvidersRes,
      recentRes,
      leaderboardRes,
      hourlyRes
    ] = await Promise.all([
      db.query('SELECT COUNT(*) as c FROM incidents'),
      db.query("SELECT COUNT(*) as c FROM incidents WHERE status NOT IN ('resolved')"),
      db.query("SELECT COUNT(*) as c FROM incidents WHERE status = 'resolved'"),
      db.query("SELECT COUNT(*) as c FROM incidents WHERE severity = 'critical' AND status NOT IN ('resolved')"),
      db.query(`
        SELECT type, COUNT(*) as count, 
               SUM(CASE WHEN status NOT IN ('resolved') THEN 1 ELSE 0 END) as active
        FROM incidents GROUP BY type ORDER BY count DESC
      `),
      db.query(`
        SELECT severity, COUNT(*) as count FROM incidents GROUP BY severity
      `),
      db.query(`
        SELECT z.name as zone, z.map_x, z.map_y, z.map_width, z.map_height, COUNT(i.id) as count
        FROM venue_zones z
        LEFT JOIN incidents i ON i.zone = z.name
        GROUP BY z.name, z.map_x, z.map_y, z.map_width, z.map_height
        ORDER BY count DESC
      `),

      db.query(`
        SELECT status, COUNT(*) as count FROM incidents GROUP BY status
      `),
      db.query(`
        SELECT AVG(EXTRACT(EPOCH FROM (resolved_at - created_at))/60) as avg_min
        FROM incidents WHERE resolved_at IS NOT NULL AND created_at IS NOT NULL
      `),
      db.query(`
        SELECT created_at::date as day, COUNT(*) as count
        FROM incidents
        WHERE created_at >= NOW() - INTERVAL '7 days'
        GROUP BY day ORDER BY day ASC
      `),
      db.query(`
        SELECT ai_provider, COUNT(*) as count FROM incidents WHERE ai_provider IS NOT NULL GROUP BY ai_provider
      `),
      db.query(`
        SELECT id, type, severity, status, zone, created_at FROM incidents ORDER BY created_at DESC LIMIT 5
      `),
      db.query(`
        SELECT actor as name, COUNT(*) as actions
        FROM incident_timeline
        WHERE actor NOT IN ('System', 'Anonymous', 'Guest')
        GROUP BY actor ORDER BY actions DESC LIMIT 5
      `),
      db.query(`
        SELECT EXTRACT(HOUR FROM created_at) as hour, COUNT(*) as count
        FROM incidents GROUP BY hour ORDER BY hour
      `)
    ]);

    return NextResponse.json({
      summary: { 
        total: parseInt(totalRes.rows[0].c), 
        active: parseInt(activeRes.rows[0].c), 
        resolved: parseInt(resolvedRes.rows[0].c), 
        critical: parseInt(criticalRes.rows[0].c) 
      },
      byType: byTypeRes.rows, 
      bySeverity: bySeverityRes.rows, 
      byZone: byZoneRes.rows, 
      byStatus: byStatusRes.rows, 
      aiProviders: aiProvidersRes.rows,
      avgResponseMinutes: Math.round(Number(avgResponseRes.rows[0].avg_min) || 0),
      trend: trendRes.rows,
      recent: recentRes.rows,
      leaderboard: leaderboardRes.rows,
      hourly: hourlyRes.rows,
    });
  } catch (err) {
    console.error('[GET /api/analytics]', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
