const { NextResponse } = require('next/server');

// PATCH /api/incidents/[id]/tasks/[taskId] — toggle complete
module.exports.PATCH = async function PATCH(request, { params }) {
  try {
    const db = require('@/lib/db');
    const { id, taskId } = params;
    const task = db.prepare('SELECT * FROM incident_tasks WHERE id = ? AND incident_id = ?').get(taskId, id);
    if (!task) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    const newState = task.is_complete ? 0 : 1;
    db.prepare('UPDATE incident_tasks SET is_complete = ? WHERE id = ?').run(newState, taskId);
    const updated = db.prepare('SELECT * FROM incident_tasks WHERE id = ?').get(taskId);
    return NextResponse.json({ task: updated });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
};

module.exports.DELETE = async function DELETE(request, { params }) {
  try {
    const db = require('@/lib/db');
    const { getUserFromRequest } = require('@/lib/auth');
    const user = getUserFromRequest(request);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { taskId } = params;
    db.prepare('DELETE FROM incident_tasks WHERE id = ?').run(taskId);
    return NextResponse.json({ message: 'Deleted' });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
};
