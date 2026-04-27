import { NextResponse } from 'next/server';
import { getUserFromRequest } from '@/lib/auth';
import supabase from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export async function POST(request) {
  try {
    const user = getUserFromRequest(request);
    if (!user || user.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Delete child tables first to satisfy foreign key constraints
    await Promise.all([
      supabase.from('incident_tasks').delete().neq('id', 0),
      supabase.from('incident_messages').delete().neq('id', 0),
      supabase.from('incident_timeline').delete().neq('id', 0),
    ]);

    // Finally delete all incidents
    const { error } = await supabase.from('incidents').delete().neq('id', '');

    if (error) throw error;

    try {
      const { getIO } = require('@/lib/socket');
      const io = getIO();
      if (io) io.emit('incidents:wiped');
    } catch { /* socket not ready */ }

    return NextResponse.json({ 
      success: true, 
      message: 'All incident data has been wiped successfully.' 
    });
  } catch (err) {
    console.error('[POST /api/admin/wipe] Failure:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
