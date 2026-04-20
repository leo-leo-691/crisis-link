const { NextResponse } = require('next/server');

// PATCH /api/incidents/[id]/tasks/[taskId] — toggle complete
export async function PATCH(request, { params }) {
  try {
    const db = require('@/lib/db');
    const { id, taskId } = params;

    // Toggle logic in SQL using RETURNING
    const result = await db.query(
      'UPDATE incident_tasks SET is_complete = NOT is_complete WHERE id = $1 AND incident_id = $2 RETURNING *',
      [taskId, id]
    );
    
    if (result.rows.length === 0) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json({ task: result.rows[0] });
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
