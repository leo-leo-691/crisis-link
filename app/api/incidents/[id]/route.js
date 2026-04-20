const { NextResponse } = require('next/server');

module.exports.GET = async function GET(request, { params }) {
  try {
    const db = require('@/lib/db');
    const { id } = params;
    const incident = db.prepare('SELECT * FROM incidents WHERE id = ?').get(id);
    if (!incident) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    const tasks    = db.prepare('SELECT * FROM incident_tasks WHERE incident_id = ? ORDER BY id ASC').all(id);
    const messages = db.prepare('SELECT * FROM incident_messages WHERE incident_id = ? ORDER BY created_at ASC').all(id);
    const timeline = db.prepare('SELECT * FROM incident_timeline WHERE incident_id = ? ORDER BY created_at ASC').all(id);

    // Parse ai_triage JSON if present
    if (incident.ai_triage) {
      try { incident.ai_triage = JSON.parse(incident.ai_triage); } catch (e) {}
    }

    return NextResponse.json({ incident, tasks, messages, timeline });
  } catch (err) {
    console.error('[GET /api/incidents/:id]', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
};

module.exports.DELETE = async function DELETE(request, { params }) {
  try {
    const db = require('@/lib/db');
    const { getUserFromRequest } = require('@/lib/auth');
    const user = getUserFromRequest(request);
    if (!user || user.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const { id } = params;
    db.prepare('DELETE FROM incident_tasks WHERE incident_id = ?').run(id);
    db.prepare('DELETE FROM incident_messages WHERE incident_id = ?').run(id);
    db.prepare('DELETE FROM incident_timeline WHERE incident_id = ?').run(id);
    db.prepare('DELETE FROM incidents WHERE id = ?').run(id);
    return NextResponse.json({ message: 'Deleted' });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
};
