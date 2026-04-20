const { NextResponse } = require('next/server');

// POST /api/incidents/[id]/debrief — generate AI debrief report
module.exports.POST = async function POST(request, { params }) {
  try {
    const db = require('@/lib/db');
    const { generateDebrief } = require('@/lib/aiTriage');
    const { getUserFromRequest } = require('@/lib/auth');

    const user = getUserFromRequest(request);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id } = params;
    const incident = db.prepare('SELECT * FROM incidents WHERE id = ?').get(id);
    if (!incident) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    const tasks    = db.prepare('SELECT * FROM incident_tasks WHERE incident_id = ?').all(id);
    const messages = db.prepare('SELECT * FROM incident_messages WHERE incident_id = ?').all(id);
    const timeline = db.prepare('SELECT * FROM incident_timeline WHERE incident_id = ? ORDER BY created_at ASC').all(id);

    const reportMarkdown = await generateDebrief(incident, timeline, tasks, messages);

    // Timeline entry
    db.prepare('INSERT INTO incident_timeline (incident_id, actor, action) VALUES (?, ?, ?)')
      .run(id, user.name, 'AI debrief report generated');

    return NextResponse.json({ report: reportMarkdown, incident_id: id });
  } catch (err) {
    console.error('[POST /api/incidents/:id/debrief]', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
};
