import { NextResponse } from 'next/server';
import { getUserFromRequest } from '@/lib/auth';
import { getIO } from '@/lib/socket';

export async function POST(request) {
  try {
    const user = getUserFromRequest(request);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const supabase = require('@/lib/supabase');
    const { message, target_role = 'all' } = await request.json();
    if (!message) return NextResponse.json({ error: 'message required' }, { status: 400 });

    const { error } = await supabase
      .from('broadcast_messages')
      .insert({ sender_id: user.id, message, target_role });
    if (error) throw error;

    try {
      const io = getIO();
      if (io) {
        io.emit('broadcast', {
          message,
          senderName: user.name,
          target_role,
          timestamp: new Date().toISOString(),
        });
      }
    } catch (socketError) {
      console.error('[POST /api/broadcast] Socket emit failed:', socketError);
    }

    return NextResponse.json({ success: true, message: 'Broadcast sent' }, { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
