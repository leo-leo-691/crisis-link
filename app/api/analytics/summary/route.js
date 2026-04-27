import { NextResponse } from 'next/server';
import supabase from '@/lib/supabase';

export const dynamic = 'force-dynamic';

function jsonWithPublicCache(payload, init = {}) {
  return NextResponse.json(payload, {
    ...init,
    headers: {
      'Cache-Control': 'public, max-age=0, s-maxage=15, stale-while-revalidate=60',
      ...(init.headers || {}),
    },
  });
}

export async function GET(request) {
  try {
    const referer = request.headers.get('referer');
    const host = request.headers.get('host');
    
    // Very basic check to ensure requests come from the same site (prevent scraping)
    // Note: referer might be missing in some legitimate edge cases, but for a public dashboard ticker it's acceptable.
    if (referer && !referer.includes(host) && !referer.includes('localhost') && !referer.includes('crisislink')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    const [totalResult, activeResult, todayResult] = await Promise.all([
      supabase
        .from('incidents')
        .select('id', { count: 'exact', head: true })
        .eq('is_drill', false),
      supabase
        .from('incidents')
        .select('id', { count: 'exact', head: true })
        .eq('is_drill', false)
        .neq('status', 'resolved'),
      supabase
        .from('incidents')
        .select('id', { count: 'exact', head: true })
        .eq('is_drill', false)
        .gte('created_at', startOfToday.toISOString()),
    ]);

    if (totalResult.error) throw totalResult.error;
    if (activeResult.error) throw activeResult.error;
    if (todayResult.error) throw todayResult.error;

    return jsonWithPublicCache({
      totalIncidents: totalResult.count || 0,
      activeIncidents: activeResult.count || 0,
      todayIncidents: todayResult.count || 0,
    });
  } catch (err) {
    console.error('[GET /api/analytics/summary]', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
