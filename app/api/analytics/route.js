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

    const supabase = require('@/lib/supabase');

    const since = new Date(Date.now() - 29 * 24 * 60 * 60 * 1000).toISOString();

    const { data: incidents, error } = await supabase
      .from('incidents')
      .select('type, zone, status, created_at, resolved_at, is_drill')
      .eq('is_drill', false)
      .gte('created_at', since);

    if (error) throw error;

    const all = incidents || [];
    let totalIncidents = 0;
    let activeIncidents = 0;
    let resolvedIncidents = 0;
    let resolutionSumMin = 0;
    let resolutionCount = 0;

    const byTypeMap = new Map();
    const byZoneMap = new Map();
    const dailyMap = new Map(); // YYYY-MM-DD -> count

    for (const inc of all) {
      totalIncidents += 1;
      if (inc.status === 'resolved') resolvedIncidents += 1;
      else activeIncidents += 1;

      const type = inc.type || 'other';
      byTypeMap.set(type, (byTypeMap.get(type) || 0) + 1);

      const zone = inc.zone || 'Unknown';
      byZoneMap.set(zone, (byZoneMap.get(zone) || 0) + 1);

      const day = (inc.created_at ? new Date(inc.created_at) : new Date()).toISOString().slice(0, 10);
      dailyMap.set(day, (dailyMap.get(day) || 0) + 1);

      if (inc.resolved_at && inc.created_at) {
        const createdAt = new Date(inc.created_at).getTime();
        const resolvedAt = new Date(inc.resolved_at).getTime();
        const diffMin = (resolvedAt - createdAt) / 60000;
        if (Number.isFinite(diffMin) && diffMin >= 0) {
          resolutionSumMin += diffMin;
          resolutionCount += 1;
        }
      }
    }

    const avgResolutionMinutes = Math.round(resolutionCount ? (resolutionSumMin / resolutionCount) : 0);

    const byType = [...byTypeMap.entries()]
      .map(([type, count]) => ({ type, count }))
      .sort((a, b) => b.count - a.count);

    const byZone = [...byZoneMap.entries()]
      .map(([zone, count]) => ({ zone, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 6);

    const dailyCounts = [];
    for (let i = 29; i >= 0; i -= 1) {
      const day = new Date(Date.now() - i * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
      dailyCounts.push({ day, count: dailyMap.get(day) || 0 });
    }

    return NextResponse.json({
      totalIncidents,
      activeIncidents,
      resolvedIncidents,
      avgResolutionMinutes,
      byType,
      byZone,
      dailyCounts,
    });
  } catch (err) {
    console.error('[GET /api/analytics]', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
