const { NextResponse } = require('next/server');

// PATCH /api/incidents/[id]/tasks/[taskId] — toggle complete
export async function PATCH(request, { params }) {
  try {
    const supabase = require('@/lib/supabase');
    const { getIO } = require('@/lib/socket');
    const { id, taskId } = params;

    const { data: existing, error: fetchError } = await supabase
      .from('incident_tasks')
      .select('id, is_complete')
      .eq('id', taskId)
      .eq('incident_id', id)
      .maybeSingle();
    if (fetchError) throw fetchError;
    if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    const { data: task, error: updateError } = await supabase
      .from('incident_tasks')
      .update({ is_complete: !existing.is_complete })
      .eq('id', taskId)
      .eq('incident_id', id)
      .select('*')
      .single();
    if (updateError) throw updateError;

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

    return NextResponse.json({ task });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE(request, { params }) {
  try {
    const supabase = require('@/lib/supabase');
    const { getUserFromRequest } = require('@/lib/auth');
    const user = getUserFromRequest(request);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { taskId } = params;
    const { error } = await supabase.from('incident_tasks').delete().eq('id', taskId);
    if (error) throw error;
    return NextResponse.json({ message: 'Deleted' });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
