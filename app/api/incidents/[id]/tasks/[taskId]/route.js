const { NextResponse } = require('next/server');

// PATCH /api/incidents/[id]/tasks/[taskId] — toggle complete
export async function PATCH(request, { params }) {
  try {
    const db = require('@/lib/db');
    const { getIO } = require('@/lib/socket');
    const { id, taskId } = params;

    // Toggle logic in SQL using RETURNING
    const result = await db.query(
      'UPDATE incident_tasks SET is_complete = NOT is_complete WHERE id = $1 AND incident_id = $2 RETURNING *',
      [taskId, id]
    );
    
    if (result.rows.length === 0) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    const task = result.rows[0];
    const updatedIncidentRes = await db.query('SELECT * FROM incidents WHERE id = $1', [id]);
    const updatedIncident = updatedIncidentRes.rows[0];
    const io = getIO();
    if (io) {
      io.to(id).emit('incident:task', { incidentId: id, task });
      if (updatedIncident) io.emit('incident:updated', updatedIncident);
    }

    return NextResponse.json({ task });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE(request, { params }) {
  try {
    const db = require('@/lib/db');
    const { getUserFromRequest } = require('@/lib/auth');
    const user = getUserFromRequest(request);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { taskId } = params;
    await db.query('DELETE FROM incident_tasks WHERE id = $1', [taskId]);
    return NextResponse.json({ message: 'Deleted' });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
