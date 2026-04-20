const { NextResponse } = require('next/server');

// POST /api/incidents/[id]/followup — generate AI guest follow-up message
module.exports.POST = async function POST(request, { params }) {
  try {
    const db = require('@/lib/db');
    const { generateGuestFollowup } = require('@/lib/aiTriage');
    const { getUserFromRequest } = require('@/lib/auth');

    const user = getUserFromRequest(request);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id } = params;
    const incident = db.prepare('SELECT * FROM incidents WHERE id = ?').get(id);
    if (!incident) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    const message = await generateGuestFollowup(incident);

    db.prepare('INSERT INTO incident_timeline (incident_id, actor, action) VALUES (?, ?, ?)')
      .run(id, user.name, 'Guest follow-up message generated');

    return NextResponse.json({ message, incident_id: id });
  } catch (err) {
    console.error('[POST /api/incidents/:id/followup]', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
};
