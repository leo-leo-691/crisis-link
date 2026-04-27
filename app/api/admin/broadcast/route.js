const { NextResponse } = require('next/server');

// GET /api/admin/broadcast — list recent broadcasts
export async function GET(request) {
  try {
    const supabase = require('@/lib/supabase');
    const { getUserFromRequest } = require('@/lib/auth');
    const user = getUserFromRequest(request);
    if (!user || !['admin', 'staff'].includes(user.role)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    return NextResponse.json({ broadcasts: [] });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// POST /api/admin/broadcast — send a broadcast
export async function POST(request) {
  try {
    const supabase = require('@/lib/supabase');
    const { getIO } = require('@/lib/socket');
    const { getUserFromRequest } = require('@/lib/auth');
    const user = getUserFromRequest(request);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { message, target_role = 'all' } = await request.json();
    if (!message) return NextResponse.json({ error: 'message required' }, { status: 400 });

    const io = getIO();
    if (io) io.emit('broadcast', { message, senderName: user.name, target_role, timestamp: new Date().toISOString() });

    return NextResponse.json({ message: 'Broadcast sent' }, { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
