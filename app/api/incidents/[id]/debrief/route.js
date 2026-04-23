const { NextResponse } = require('next/server');

// POST /api/incidents/[id]/debrief — generate AI debrief report
export async function POST(request, { params }) {
  try {
    const supabase = require('@/lib/supabase');
    const { generateDebrief } = require('@/lib/aiTriage');
    const { getUserFromRequest } = require('@/lib/auth');

    const user = getUserFromRequest(request);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id } = params;
    const [
      { data: incident, error: incError },
      { data: tasks, error: tasksError },
      { data: messages, error: msgError },
      { data: timeline, error: timeError },
    ] = await Promise.all([
      supabase.from('incidents').select('*').eq('id', id).maybeSingle(),
      supabase.from('incident_tasks').select('*').eq('incident_id', id),
      supabase.from('incident_messages').select('*').eq('incident_id', id),
      supabase.from('incident_timeline').select('*').eq('incident_id', id).order('created_at', { ascending: true }),
    ]);

    if (incError) throw incError;
    if (tasksError) throw tasksError;
    if (msgError) throw msgError;
    if (timeError) throw timeError;

    if (!incident) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    const reportMarkdown = await generateDebrief(incident, timeline || [], tasks || [], messages || []);

    // Timeline entry
    const { error: insertError } = await supabase.from('incident_timeline').insert({
      incident_id: id,
      actor: user.name,
      action: 'AI debrief report generated',
      created_at: new Date().toISOString(),
    });
    if (insertError) throw insertError;

    return NextResponse.json({ report: reportMarkdown, incident_id: id });
  } catch (err) {
    console.error('[POST /api/incidents/:id/debrief]', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
