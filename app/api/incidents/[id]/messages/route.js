const { NextResponse } = require('next/server');

module.exports.GET = async function GET(request, { params }) {
  try {
    const db = require('@/lib/db');
    const { id } = params;
    const messages = db.prepare('SELECT * FROM incident_messages WHERE incident_id = ? ORDER BY created_at ASC').all(id);
    return NextResponse.json({ messages });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
};

module.exports.POST = async function POST(request, { params }) {
  try {
    const db = require('@/lib/db');
    const { getIO } = require('@/lib/socket');
    const { getUserFromRequest } = require('@/lib/auth');

    const { id } = params;
    const user = getUserFromRequest(request);
    const { message, sender_name } = await request.json();
    if (!message) return NextResponse.json({ error: 'message required' }, { status: 400 });

    const senderName = user?.name || sender_name || 'Anonymous';
    const result = db.prepare('INSERT INTO incident_messages (incident_id, user_id, sender_name, message) VALUES (?, ?, ?, ?)')
      .run(id, user?.id || null, senderName, message);

    const msg = db.prepare('SELECT * FROM incident_messages WHERE id = ?').get(result.lastInsertRowid);
    db.prepare('INSERT INTO incident_timeline (incident_id, actor, action) VALUES (?, ?, ?)')
      .run(id, senderName, `Message: "${message.slice(0, 60)}"`);

    const io = getIO();
    if (io) io.to(`incident:${id}`).emit('incident:message', { incidentId: id, message: msg });

    return NextResponse.json({ message: msg }, { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
};
