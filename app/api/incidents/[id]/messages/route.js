const { NextResponse } = require('next/server');

export async function GET(request, { params }) {
  try {
    const { getUserFromRequest } = require('@/lib/auth');
    const user = getUserFromRequest(request);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const db = require('@/lib/db');
    const { id } = params;
    const result = await db.query('SELECT * FROM incident_messages WHERE incident_id = $1 ORDER BY created_at ASC', [id]);
    return NextResponse.json({ messages: result.rows });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(request, { params }) {
  try {
    const db = require('@/lib/db');
    const { getIO } = require('@/lib/socket');
    const { getUserFromRequest } = require('@/lib/auth');

    const { id } = params;
    const user = getUserFromRequest(request);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const { message, sender_name } = await request.json();
    if (!message) return NextResponse.json({ error: 'message required' }, { status: 400 });

    const senderName = user?.name || sender_name || 'Anonymous';
    
    // Insert message with RETURNING to get full object
    const result = await db.query(
      'INSERT INTO incident_messages (incident_id, user_id, sender_name, message) VALUES ($1, $2, $3, $4) RETURNING *',
      [id, user?.id || null, senderName, message]
    );
    const msg = result.rows[0];

    // Add timeline entry
    await db.query('INSERT INTO incident_timeline (incident_id, actor, action) VALUES ($1, $2, $3)', [
      id, senderName, `Message: "${message.slice(0, 60)}"`
    ]);

    const updatedIncidentRes = await db.query('SELECT * FROM incidents WHERE id = $1', [id]);
    const updatedIncident = updatedIncidentRes.rows[0];

    const io = getIO();
    if (io) {
      io.to(id).emit('incident:message', msg);
      if (updatedIncident) io.emit('incident:updated', updatedIncident);
    }

    return NextResponse.json({ message: msg }, { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
