import { NextResponse } from 'next/server';
import supabase from '@/lib/supabase';
import { getUserFromRequest } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(request) {
  try {
    const user = getUserFromRequest(request);
    if (!user || (user.role !== 'admin' && user.role !== 'staff')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const since = new Date(Date.now() - 29 * 24 * 60 * 60 * 1000).toISOString();
    const today = new Date().toISOString().slice(0, 10);

    const { data: incidents, error } = await supabase
      .from('incidents')
      .select('id, type, zone, status, created_at, resolved_at, is_drill')
      .eq('is_drill', false)
      .gte('created_at', since);

    if (error) throw error;

    const all = incidents || [];
    let totalIncidents = 0;
    let activeIncidents = 0;
    let resolvedIncidents = 0;
    let resolutionSumMin = 0;
    let resolutionCount = 0;
    let todayIncidents = 0;

    const byTypeMap = new Map();
    const byZoneMap = new Map();
    const dailyMap = new Map();

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
      if (day === today) todayIncidents += 1;

      if (inc.resolved_at && inc.created_at) {
        const diffMin = (new Date(inc.resolved_at).getTime() - new Date(inc.created_at).getTime()) / 60000;
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
      todayIncidents,
      byType,
      byZone,
      dailyCounts,
      summary: {
        total: totalIncidents,
        active: activeIncidents,
        resolved: resolvedIncidents,
      },
      avgResponseMinutes: avgResolutionMinutes,
    }, {
      headers: {
        'Cache-Control': 'no-store',
      },
    });
  } catch (err) {
    console.error('[GET /api/analytics]', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
