const { NextResponse } = require('next/server');
import { getUserFromRequest } from '@/lib/auth';

export async function GET(request, { params }) {
  try {
    const user = getUserFromRequest(request);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const db = require('@/lib/db');
    const { id } = params;

    const [incRes, tasksRes, msgRes, timeRes] = await Promise.all([
      db.query('SELECT * FROM incidents WHERE id = $1', [id]),
      db.query('SELECT * FROM incident_tasks WHERE incident_id = $1 ORDER BY id ASC', [id]),
      db.query('SELECT * FROM incident_messages WHERE incident_id = $1 ORDER BY created_at ASC', [id]),
      db.query('SELECT * FROM incident_timeline WHERE incident_id = $1 ORDER BY created_at ASC', [id])
    ]);

    const incident = incRes.rows[0];
    if (!incident) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    // Handle ai_triage JSON (Postgres returns it as an object already if it is JSONB)
    if (typeof incident.ai_triage === 'string') {
      try { incident.ai_triage = JSON.parse(incident.ai_triage); } catch (e) {}
    }

    return NextResponse.json({ 
      incident, 
      tasks: tasksRes.rows, 
      messages: msgRes.rows, 
      timeline: timeRes.rows 
    });
  } catch (err) {
    console.error('[GET /api/incidents/:id]', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE(request, { params }) {
  try {
    const db = require('@/lib/db');
    const { getUserFromRequest } = require('@/lib/auth');
    const user = getUserFromRequest(request);
    if (!user || user.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const { id } = params;
    await Promise.all([
      db.query('DELETE FROM incident_tasks WHERE incident_id = $1', [id]),
      db.query('DELETE FROM incident_messages WHERE incident_id = $1', [id]),
      db.query('DELETE FROM incident_timeline WHERE incident_id = $1', [id]),
      db.query('DELETE FROM incidents WHERE id = $1', [id])
    ]);
    return NextResponse.json({ message: 'Deleted' });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
