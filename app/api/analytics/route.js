const { NextResponse } = require('next/server');

// GET /api/analytics — aggregate stats for the dashboard
module.exports.GET = async function GET(request) {
  try {
    const db = require('@/lib/db');

    // Core counts
    const total    = db.prepare('SELECT COUNT(*) as c FROM incidents').get().c;
    const active   = db.prepare("SELECT COUNT(*) as c FROM incidents WHERE status NOT IN ('resolved')").get().c;
    const resolved = db.prepare("SELECT COUNT(*) as c FROM incidents WHERE status = 'resolved'").get().c;
    const critical = db.prepare("SELECT COUNT(*) as c FROM incidents WHERE severity = 'critical' AND status NOT IN ('resolved')").get().c;

    // By type
    const byType = db.prepare(`
      SELECT type, COUNT(*) as count, 
             SUM(CASE WHEN status NOT IN ('resolved') THEN 1 ELSE 0 END) as active
      FROM incidents GROUP BY type ORDER BY count DESC
    `).all();

    // By severity
    const bySeverity = db.prepare(`
      SELECT severity, COUNT(*) as count FROM incidents GROUP BY severity
    `).all();

    // By zone (top 8)
    const byZone = db.prepare(`
      SELECT zone, COUNT(*) as count FROM incidents GROUP BY zone ORDER BY count DESC LIMIT 8
    `).all();

    // By status
    const byStatus = db.prepare(`
      SELECT status, COUNT(*) as count FROM incidents GROUP BY status
    `).all();

    // Average response time (minutes) for resolved incidents
    const avgResponse = db.prepare(`
      SELECT AVG((julianday(resolved_at) - julianday(created_at)) * 1440) as avg_min
      FROM incidents WHERE resolved_at IS NOT NULL AND created_at IS NOT NULL
    `).get();

    // Last 7 days trend
    const trend = db.prepare(`
      SELECT date(created_at) as day, COUNT(*) as count
      FROM incidents
      WHERE created_at >= date('now', '-7 days')
      GROUP BY day ORDER BY day ASC
    `).all();

    // AI provider breakdown
    const aiProviders = db.prepare(`
      SELECT ai_provider, COUNT(*) as count FROM incidents WHERE ai_provider IS NOT NULL GROUP BY ai_provider
    `).all();

    // Recent incidents
    const recent = db.prepare(`
      SELECT id, type, severity, status, zone, created_at FROM incidents ORDER BY created_at DESC LIMIT 5
    `).all();

    // Response leaderboard: staff that appeared in timeline actions
    const leaderboard = db.prepare(`
      SELECT actor as name, COUNT(*) as actions
      FROM incident_timeline
      WHERE actor NOT IN ('System', 'Anonymous', 'Guest')
      GROUP BY actor ORDER BY actions DESC LIMIT 5
    `).all();

    // Hourly distribution
    const hourly = db.prepare(`
      SELECT strftime('%H', created_at) as hour, COUNT(*) as count
      FROM incidents GROUP BY hour ORDER BY hour
    `).all();

    return NextResponse.json({
      summary: { total, active, resolved, critical },
      byType, bySeverity, byZone, byStatus, aiProviders,
      avgResponseMinutes: Math.round(avgResponse?.avg_min || 0),
      trend,
      recent,
      leaderboard,
      hourly,
    });
  } catch (err) {
    console.error('[GET /api/analytics]', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
};
