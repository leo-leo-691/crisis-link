const { NextResponse } = require('next/server');

const VALID_TRANSITIONS = {
  reported:     ['acknowledged', 'responding', 'resolved'],
  acknowledged: ['responding', 'contained', 'resolved'],
  responding:   ['contained', 'resolved'],
  contained:    ['resolved'],
  resolved:     [],
};

module.exports.PATCH = async function PATCH(request, { params }) {
  try {
    const db = require('@/lib/db');
    const { getIO } = require('@/lib/socket');
    const { getUserFromRequest } = require('@/lib/auth');

    const { id } = params;
    const { status } = await request.json();
    const user = getUserFromRequest(request);

    const incident = db.prepare('SELECT * FROM incidents WHERE id = ?').get(id);
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

    db.prepare('UPDATE incidents SET status = ?, updated_at = ?, resolved_at = ? WHERE id = ?')
      .run(status, now, resolvedAt, id);

    // Timeline entry
    const actorName = user?.name || 'System';
    db.prepare('INSERT INTO incident_timeline (incident_id, actor, action, created_at) VALUES (?, ?, ?, ?)')
      .run(id, actorName, `Status changed to "${status}"`, now);

    const updated = db.prepare('SELECT * FROM incidents WHERE id = ?').get(id);
    const io = getIO();
    if (io) io.emit('incident:updated', updated);

    return NextResponse.json({ incident: updated });
  } catch (err) {
    console.error('[PATCH /api/incidents/:id/status]', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
};
