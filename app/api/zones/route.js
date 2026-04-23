const { NextResponse } = require('next/server');

export async function GET() {
  try {
    const supabase = require('@/lib/supabase');
    const [{ data: zones, error: zonesError }, { data: active, error: activeError }] = await Promise.all([
      supabase.from('venue_zones').select('*').order('floor', { ascending: true }).order('name', { ascending: true }),
      supabase.from('incidents').select('zone').neq('status', 'resolved'),
    ]);

    if (zonesError) throw zonesError;
    if (activeError) throw activeError;

    const counts = new Map();
    for (const row of active || []) {
      const key = row.zone || '';
      counts.set(key, (counts.get(key) || 0) + 1);
    }

    const enriched = (zones || []).map((z) => ({
      ...z,
      active_incidents: counts.get(z.name) || 0,
    }));

    return NextResponse.json({ zones: enriched });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const { getUserFromRequest } = require('@/lib/auth');
    const user = getUserFromRequest(request);
    if (!user || user.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const supabase = require('@/lib/supabase');
    const body = await request.json();
    const name = (body?.name || '').trim();
    if (!name) return NextResponse.json({ error: 'Zone name is required' }, { status: 400 });

    const { data: zone, error } = await supabase
      .from('venue_zones')
      .insert({ name, floor: 1 })
      .select('*')
      .single();
    if (error) throw error;

    return NextResponse.json({ zone }, { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE(request) {
  try {
    const { getUserFromRequest } = require('@/lib/auth');
    const user = getUserFromRequest(request);
    if (!user || user.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const supabase = require('@/lib/supabase');
    const { searchParams } = new URL(request.url);
    const zoneId = Number(searchParams.get('id'));
    if (!zoneId) return NextResponse.json({ error: 'Zone id is required' }, { status: 400 });

    const { error } = await supabase.from('venue_zones').delete().eq('id', zoneId);
    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
