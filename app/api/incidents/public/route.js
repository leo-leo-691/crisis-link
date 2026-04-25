import { NextResponse } from 'next/server';
import supabase from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '3');

    // Only return non-sensitive fields
    const [{ data: incidents, error: incidentsError }, { count, error: countError }] = await Promise.all([
      supabase
        .from('incidents')
        .select('id, type, zone, created_at')
        .eq('is_drill', false)
        .neq('status', 'resolved')
        .order('created_at', { ascending: false })
        .limit(limit),
      supabase
        .from('incidents')
        .select('id', { count: 'exact', head: true })
        .eq('is_drill', false)
        .neq('status', 'resolved'),
    ]);

    if (incidentsError) throw incidentsError;
    if (countError) throw countError;

    return NextResponse.json({
      incidents: incidents || [],
      totalActive: count || 0,
    }, {
      headers: {
        'Cache-Control': 'public, max-age=0, s-maxage=10, stale-while-revalidate=30',
      },
    });
  } catch (err) {
    console.error('[GET /api/incidents/public] Error:', err);
    return NextResponse.json({ error: 'Failed to fetch public incidents' }, { status: 500 });
  }
}
