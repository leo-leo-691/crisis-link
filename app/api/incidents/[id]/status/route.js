const { NextResponse } = require('next/server');

const VALID_TRANSITIONS = {
  reported:     ['acknowledged', 'responding', 'resolved'],
  acknowledged: ['responding', 'contained', 'resolved'],
  responding:   ['contained', 'resolved'],
  contained:    ['resolved'],
  resolved:     [],
};

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
    const updated = upResult.rows[0];
    const io = getIO();
    if (io) io.emit('incident:updated', updated);

    return NextResponse.json({ incident: updated });
  } catch (err) {
    console.error('[PATCH /api/incidents/:id/status]', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
