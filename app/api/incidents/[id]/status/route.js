const { NextResponse } = require('next/server');

const VALID_TRANSITIONS = {
  reported:     ['acknowledged', 'responding', 'resolved'],
  acknowledged: ['responding', 'contained', 'resolved'],
  responding:   ['contained', 'resolved'],
  contained:    ['resolved'],
  resolved:     [],
};

const DEBRIEF_SYSTEM_PROMPT = 'You are a hospitality safety analyst. Return ONLY valid JSON with these exact keys: executive_summary (string, 2 sentences), what_went_well (array of 3 strings), areas_for_improvement (array of 3 strings), root_cause_analysis (string, one paragraph), recommendations (array of 4 strings), training_recommendations (array of 2 strings)';

async function generateAndStoreDebrief(incidentId, incidentSnapshot) {
  try {
    const db = require('@/lib/db');
    const { GoogleGenerativeAI } = require('@google/generative-ai');
    const { getIO } = require('@/lib/socket');

    if (!process.env.GEMINI_API_KEY) return;

    const [timelineRes, tasksRes] = await Promise.all([
      db.query('SELECT id FROM incident_timeline WHERE incident_id = $1', [incidentId]),
      db.query('SELECT is_complete FROM incident_tasks WHERE incident_id = $1', [incidentId]),
    ]);

    const timelineCount = timelineRes.rows.length;
    const tasksCompletedCount = tasksRes.rows.filter((task) => task.is_complete).length;
    const resolutionTimeMinutes = Math.max(
      1,
      Math.round((Date.now() - new Date(incidentSnapshot.created_at).getTime()) / 60000)
    );

    const prompt = `${DEBRIEF_SYSTEM_PROMPT}

Incident type: ${incidentSnapshot.type}
Zone: ${incidentSnapshot.zone}
Description: ${incidentSnapshot.description || 'N/A'}
Resolution time in minutes: ${resolutionTimeMinutes}
Timeline entries count: ${timelineCount}
Tasks completed count: ${tasksCompletedCount}`;

    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });
    const result = await model.generateContent(prompt);
    const raw = result.response.text().replace(/```json|```/g, '').trim();
    const parsed = JSON.parse(raw);

    const updateRes = await db.query(
      'UPDATE incidents SET debrief_report = $1, updated_at = $2 WHERE id = $3 RETURNING *',
      [JSON.stringify(parsed), new Date().toISOString(), incidentId]
    );
    const updatedWithDebrief = updateRes.rows[0];
    const io = getIO();
    if (io && updatedWithDebrief) io.emit('incident:updated', updatedWithDebrief);
  } catch (error) {
    console.error('[Auto Debrief] Failed to generate/store report:', error.message);
  }
}

export async function PATCH(request, { params }) {
  try {
    const db = require('@/lib/db');
    const { getIO } = require('@/lib/socket');
    const { getUserFromRequest } = require('@/lib/auth');

    const { id } = params;
    const { status } = await request.json();
    const user = getUserFromRequest(request);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const incResult = await db.query('SELECT * FROM incidents WHERE id = $1', [id]);
    const incident = incResult.rows[0];
    if (!incident) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    const allowed = VALID_TRANSITIONS[incident.status] || [];
    if (!allowed.includes(status)) {
      return NextResponse.json({
        error: `Cannot transition from "${incident.status}" to "${status}"`,
        allowed,
      }, { status: 422 });
    }

    const now = new Date().toISOString();
    const resolvedAt = status === 'resolved' ? now : incident.resolved_at;

    await db.query('UPDATE incidents SET status = $1, updated_at = $2, resolved_at = $3 WHERE id = $4', [
      status, now, resolvedAt, id
    ]);

    // Timeline entry
    const actorName = user?.name || 'System';
    await db.query('INSERT INTO incident_timeline (incident_id, actor, action, created_at) VALUES ($1, $2, $3, $4)', [
      id, actorName, `Status changed to "${status}"`, now
    ]);

    const upResult = await db.query('SELECT * FROM incidents WHERE id = $1', [id]);
    const updatedIncident = upResult.rows[0];
    const io = getIO();
    if (io) io.emit('incident:updated', updatedIncident);

    if (status === 'resolved') {
      // Fire-and-forget generation to keep status update fast.
      generateAndStoreDebrief(id, updatedIncident);
    }

    return NextResponse.json({ incident: updatedIncident });
  } catch (err) {
    console.error('[PATCH /api/incidents/:id/status]', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
