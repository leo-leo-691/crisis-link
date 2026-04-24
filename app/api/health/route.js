import { NextResponse } from 'next/server';
import supabase from '@/lib/supabase';

export async function GET() {
  try {
    const { error } = await supabase.from('venue_zones').select('id').limit(1);
    if (error) throw error;
    return NextResponse.json({ status: 'ok', database: 'connected' });
  } catch(e) {
    return NextResponse.json({ status: 'error', message: e.message }, { status: 500 });
  }
}
