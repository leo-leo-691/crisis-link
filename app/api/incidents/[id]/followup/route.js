const { NextResponse } = require('next/server');
export const dynamic = 'force-dynamic';

// POST /api/incidents/[id]/followup — generate AI guest follow-up message
export async function POST(request, { params }) {
  try {
    const supabase = require('@/lib/supabase');
    const { generateGuestFollowup } = require('@/lib/aiTriage');
    const { getUserFromRequest } = require('@/lib/auth');

    const user = getUserFromRequest(request);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id } = await params;
    const { data: incident, error: incError } = await supabase
      .from('incidents')
      .select('id, type, severity, status, zone, reporter_name, description, created_at, resolved_at')
      .eq('id', id)
      .maybeSingle();
    if (incError) throw incError;
    if (!incident) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    const message = await generateGuestFollowup(incident);

    const { error: timeError } = await supabase.from('incident_timeline').insert({
      incident_id: id,
      actor: user.name,
      action: 'Guest follow-up message generated',
      created_at: new Date().toISOString(),
    });
    if (timeError) throw timeError;

    return NextResponse.json({ message, incident_id: id }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (err) {
    console.error('[POST /api/incidents/:id/followup]', err);
    return NextResponse.json({ error: err.message }, { status: 500, headers: { 'Cache-Control': 'no-store' } });
  }
}
