const { NextResponse } = require('next/server');
export const dynamic = 'force-dynamic';

// POST /api/incidents/[id]/debrief — generate AI debrief report
export async function POST(request, { params }) {
  try {
    const supabase = require('@/lib/supabase');
    const { generateDebrief } = require('@/lib/aiTriage');
    const { getUserFromRequest } = require('@/lib/auth');

    const user = getUserFromRequest(request);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id } = await params;
    const [
      { data: incident, error: incError },
      { data: tasks, error: tasksError },
      { data: messages, error: msgError },
      { data: timeline, error: timeError },
    ] = await Promise.all([
      supabase.from('incidents').select('id, type, severity, status, zone, room_number, reporter_name, reporter_type, description, ai_provider, evacuation_route, recommended_responder, is_drill, created_at, updated_at, resolved_at').eq('id', id).maybeSingle(),
      supabase.from('incident_tasks').select('id, title, priority, assigned_to, is_complete, created_at').eq('incident_id', id),
      supabase.from('incident_messages').select('id, sender_name, message, created_at').eq('incident_id', id),
      supabase.from('incident_timeline').select('id, actor, action, created_at').eq('incident_id', id).order('created_at', { ascending: true }),
    ]);

    if (incError) throw incError;
    if (tasksError) throw tasksError;
    if (msgError) throw msgError;
    if (timeError) throw timeError;

    if (!incident) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    const report = await generateDebrief(incident, timeline || [], tasks || [], messages || []);

    const { data: updatedIncident, error: updateError } = await supabase
      .from('incidents')
      .update({ debrief_report: report, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select('id, debrief_report, updated_at')
      .maybeSingle();
    if (updateError) throw updateError;

    // Timeline entry
    const { error: insertError } = await supabase.from('incident_timeline').insert({
      incident_id: id,
      actor: user.name,
      action: 'AI debrief report generated',
      created_at: new Date().toISOString(),
    });
    if (insertError) throw insertError;

    try {
      const { getIO } = require('@/lib/socket');
      const io = getIO();
      if (io && updatedIncident) io.emit('incident:updated', updatedIncident);
    } catch (socketError) {
      console.error('[POST /api/incidents/:id/debrief] Socket emit failed:', socketError);
    }

    return NextResponse.json({ report, incident_id: id, incident: updatedIncident }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (err) {
    console.error('[POST /api/incidents/:id/debrief]', err);
    return NextResponse.json({ error: err.message }, { status: 500, headers: { 'Cache-Control': 'no-store' } });
  }
}
