const { NextResponse } = require('next/server');

// POST /api/incidents/[id]/followup — generate AI guest follow-up message
export async function POST(request, { params }) {
  try {
    const db = require('@/lib/db');
    const { generateGuestFollowup } = require('@/lib/aiTriage');
    const { getUserFromRequest } = require('@/lib/auth');

    const user = getUserFromRequest(request);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id } = params;
    const res = await db.query('SELECT * FROM incidents WHERE id = $1', [id]);
    const incident = res.rows[0];
    if (!incident) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    const message = await generateGuestFollowup(incident);

    await db.query('INSERT INTO incident_timeline (incident_id, actor, action) VALUES ($1, $2, $3)', [
      id, user.name, 'Guest follow-up message generated'
    ]);

    return NextResponse.json({ message, incident_id: id });
  } catch (err) {
    console.error('[POST /api/incidents/:id/followup]', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
