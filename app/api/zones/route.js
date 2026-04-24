import { NextResponse } from 'next/server';
import supabase from '@/lib/supabase';
import { getUserFromRequest } from '@/lib/auth';

export async function GET() {
  try {
    const { data, error } = await supabase
      .from('venue_zones')
      .select('*')
      .order('floor', { ascending: true });
    if (error) throw error;
    return NextResponse.json(data || []);
  } catch (e) {
    return NextResponse.json([], { status: 500 });
  }
}

export async function POST(request) {
  try {
    const user = getUserFromRequest(request);
    if (!user || user.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

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
    const user = getUserFromRequest(request);
    if (!user || user.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

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
