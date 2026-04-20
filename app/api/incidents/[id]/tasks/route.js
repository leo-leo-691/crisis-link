const { NextResponse } = require('next/server');

module.exports.GET = async function GET(request, { params }) {
  try {
    const db = require('@/lib/db');
    const { id } = params;
    const tasks = db.prepare('SELECT * FROM incident_tasks WHERE incident_id = ? ORDER BY id ASC').all(id);
    return NextResponse.json({ tasks });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
};

module.exports.POST = async function POST(request, { params }) {
  try {
    const db = require('@/lib/db');
    const { getIO } = require('@/lib/socket');
    const { id } = params;
    const { title, priority = 'medium' } = await request.json();

    if (!title) return NextResponse.json({ error: 'title required' }, { status: 400 });

    const result = db.prepare('INSERT INTO incident_tasks (incident_id, title, priority) VALUES (?, ?, ?)')
      .run(id, title, priority);
    const task = db.prepare('SELECT * FROM incident_tasks WHERE id = ?').get(result.lastInsertRowid);

    // Add timeline
    db.prepare('INSERT INTO incident_timeline (incident_id, actor, action) VALUES (?, ?, ?)')
      .run(id, 'System', `Task added: "${title}"`);

    const io = getIO();
    if (io) io.to(`incident:${id}`).emit('incident:task', task);

    return NextResponse.json({ task }, { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
};
