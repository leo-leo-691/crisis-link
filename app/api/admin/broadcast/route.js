const { NextResponse } = require('next/server');

// GET /api/admin/broadcast — list recent broadcasts
export async function GET(request) {
  try {
    const db = require('@/lib/db');
    const { getUserFromRequest } = require('@/lib/auth');
    const user = getUserFromRequest(request);
    if (!user || !['admin', 'staff'].includes(user.role)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const result = await db.query('SELECT * FROM broadcast_messages ORDER BY created_at DESC LIMIT 50');
    return NextResponse.json({ broadcasts: result.rows });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// POST /api/admin/broadcast — send a broadcast
export async function POST(request) {
  try {
    const db = require('@/lib/db');
    const { getIO } = require('@/lib/socket');
    const { getUserFromRequest } = require('@/lib/auth');
    const user = getUserFromRequest(request);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { message, target_role = 'all' } = await request.json();
    if (!message) return NextResponse.json({ error: 'message required' }, { status: 400 });

    await db.query('INSERT INTO broadcast_messages (sender_id, message, target_role) VALUES ($1, $2, $3)', [user.id, message, target_role]);

    const io = getIO();
    if (io) io.emit('broadcast', { message, senderName: user.name, target_role, timestamp: new Date().toISOString() });

    return NextResponse.json({ message: 'Broadcast sent' }, { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
