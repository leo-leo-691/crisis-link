import { NextResponse } from 'next/server';
import { getUserFromRequest } from '@/lib/auth';
import { getIO } from '@/lib/socket';

export async function POST(request) {
  try {
    const user = getUserFromRequest(request);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const db = require('@/lib/db');
    const { message, target_role = 'all' } = await request.json();
    if (!message) return NextResponse.json({ error: 'message required' }, { status: 400 });

    await db.query('INSERT INTO broadcast_messages (sender_id, message, target_role) VALUES ($1, $2, $3)', [user.id, message, target_role]);

    const io = getIO();
    if (io) {
      io.emit('broadcast', {
        message,
        senderName: user.name,
        target_role,
        timestamp: new Date().toISOString(),
      });
    }

    return NextResponse.json({ message: 'Broadcast sent' }, { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
