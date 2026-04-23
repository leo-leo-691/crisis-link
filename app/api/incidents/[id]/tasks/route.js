const { NextResponse } = require('next/server');

export async function GET(request, { params }) {
  try {
    const { getUserFromRequest } = require('@/lib/auth');
    const user = getUserFromRequest(request);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const db = require('@/lib/db');
    const { id } = params;
    const result = await db.query('SELECT * FROM incident_tasks WHERE incident_id = $1 ORDER BY id ASC', [id]);
    return NextResponse.json({ tasks: result.rows });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(request, { params }) {
  try {
    const db = require('@/lib/db');
    const { getIO } = require('@/lib/socket');
    const { getUserFromRequest } = require('@/lib/auth');
    const user = getUserFromRequest(request);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const { id } = params;
    const { title, priority = 'medium', assigned_to = null } = await request.json();

    if (!title) return NextResponse.json({ error: 'title required' }, { status: 400 });

    const result = await db.query(
      'INSERT INTO incident_tasks (incident_id, title, assigned_to, priority) VALUES ($1, $2, $3, $4) RETURNING *',
      [id, title, assigned_to, priority]
    );
    const task = result.rows[0];

    // Add timeline
    await db.query('INSERT INTO incident_timeline (incident_id, actor, action) VALUES ($1, $2, $3)', [
      id, 'System', `Task added: "${title}"`
    ]);

    const io = getIO();
    if (io) io.to(`incident:${id}`).emit('incident:task', task);

    return NextResponse.json({ task }, { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
