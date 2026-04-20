const { NextResponse } = require('next/server');

// POST /api/incidents/[id]/debrief — generate AI debrief report
export async function POST(request, { params }) {
  try {
    const db = require('@/lib/db');
    const { generateDebrief } = require('@/lib/aiTriage');
    const { getUserFromRequest } = require('@/lib/auth');

    const user = getUserFromRequest(request);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id } = params;
    const [incRes, tasksRes, msgRes, timeRes] = await Promise.all([
      db.query('SELECT * FROM incidents WHERE id = $1', [id]),
      db.query('SELECT * FROM incident_tasks WHERE incident_id = $1', [id]),
      db.query('SELECT * FROM incident_messages WHERE incident_id = $1', [id]),
      db.query('SELECT * FROM incident_timeline WHERE incident_id = $1 ORDER BY created_at ASC', [id])
    ]);

    const incident = incRes.rows[0];
    if (!incident) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    const reportMarkdown = await generateDebrief(incident, timeRes.rows, tasksRes.rows, msgRes.rows);

    // Timeline entry
    await db.query('INSERT INTO incident_timeline (incident_id, actor, action) VALUES ($1, $2, $3)', [
      id, user.name, 'AI debrief report generated'
    ]);

    return NextResponse.json({ report: reportMarkdown, incident_id: id });
  } catch (err) {
    console.error('[POST /api/incidents/:id/debrief]', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
