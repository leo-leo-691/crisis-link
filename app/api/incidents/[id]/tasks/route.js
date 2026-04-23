const { NextResponse } = require('next/server');

export async function GET(request, { params }) {
  try {
    const { getUserFromRequest } = require('@/lib/auth');
    const user = getUserFromRequest(request);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const supabase = require('@/lib/supabase');
    const { id } = params;
    const { data: tasks, error } = await supabase
      .from('incident_tasks')
      .select('*')
      .eq('incident_id', id)
      .order('id', { ascending: true });
    if (error) throw error;
    return NextResponse.json({ tasks: tasks || [] });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(request, { params }) {
  try {
    const supabase = require('@/lib/supabase');
    const { getIO } = require('@/lib/socket');
    const { getUserFromRequest } = require('@/lib/auth');
    const user = getUserFromRequest(request);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const { id } = params;
    const { title, priority = 'medium', assigned_to = null } = await request.json();

    if (!title) return NextResponse.json({ error: 'title required' }, { status: 400 });

    const { data: task, error: taskError } = await supabase
      .from('incident_tasks')
      .insert({
        incident_id: id,
        title,
        assigned_to,
        priority,
      })
      .select('*')
      .single();
    if (taskError) throw taskError;

    // Add timeline
    const { error: timeError } = await supabase.from('incident_timeline').insert({
      incident_id: id,
      actor: 'System',
      action: `Task added: "${title}"`,
      created_at: new Date().toISOString(),
    });
    if (timeError) throw timeError;

    const { data: updatedIncident, error: incError } = await supabase
      .from('incidents')
      .select('*')
      .eq('id', id)
      .maybeSingle();
    if (incError) throw incError;

    const io = getIO();
    if (io) {
      io.to(id).emit('incident:task', { incidentId: id, task });
      if (updatedIncident) io.emit('incident:updated', updatedIncident);
    }

    return NextResponse.json({ task }, { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
