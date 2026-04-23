import { NextResponse } from 'next/server';
import supabase from '@/lib/supabase';

export async function GET() {
  try {
    const { error } = await supabase.from('venue_zones').select('id').limit(1);
    return NextResponse.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      database: error ? 'error' : 'connected',
      provider: 'supabase'
    });
  } catch(e) {
    return NextResponse.json({ status: 'error', message: e.message }, { status: 500 });
  }
}
