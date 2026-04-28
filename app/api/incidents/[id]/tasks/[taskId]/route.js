const { NextResponse } = require('next/server');

export const dynamic = 'force-dynamic';

function jsonNoStore(payload, init = {}) {
  return NextResponse.json(payload, {
    ...init,
    headers: {
      'Cache-Control': 'no-store',
      ...(init.headers || {}),
    },
  });
}

async function emitSafely(callback) {
  try {
    const { getIO } = require('@/lib/socket');
    const io = getIO();
    if (io) {
      await callback(io);
    }
  } catch (socketError) {
    console.error('[TASK TOGGLE API] Socket emit failed:', socketError);
  }
}

export async function PATCH(request, { params }) {
  try {
    const supabase = require('@/lib/supabase');
    const { getUserFromRequest } = require('@/lib/auth');
    const user = getUserFromRequest(request);
    if (!user) return jsonNoStore({ error: 'Unauthorized' }, { status: 401 });

    const { id, taskId } = await params;
    
    // Parse body for action if present
    let action = 'toggle';
    try {
      const bodyText = await request.text();
      if (bodyText) {
        const body = JSON.parse(bodyText);
        if (body.action) action = body.action;
      }
    } catch (e) {
      // ignore
    }

    const { data: existing, error: fetchError } = await supabase
      .from('incident_tasks')
      .select('id, title, is_complete, incident_id, assigned_to')
      .eq('id', taskId)
      .maybeSingle();
    if (fetchError) throw fetchError;
    // Validate the task belongs to the right incident (case-insensitive)
    if (!existing || existing.incident_id?.toLowerCase() !== id?.toLowerCase()) {
      return jsonNoStore({ error: 'Not found' }, { status: 404 });
    }

    let updatePayload = {};
    let timelineAction = '';

    if (action === 'assign') {
      updatePayload = { assigned_to: user.id };
      timelineAction = `Assigned task to self: "${existing.title}"`;
    } else {
      updatePayload = { is_complete: !existing.is_complete };
      timelineAction = `${!existing.is_complete ? 'Completed' : 'Reopened'} task: "${existing.title}"`;
    }

    const { data: task, error: updateError } = await supabase
      .from('incident_tasks')
      .update(updatePayload)
      .eq('id', taskId)
      .eq('incident_id', id)
      .select('id, incident_id, title, priority, assigned_to, is_complete, created_at')
      .single();
    if (updateError) throw updateError;

    const { error: timeError } = await supabase.from('incident_timeline').insert({
      incident_id: id,
      actor: user?.name || 'System',
      action: timelineAction,
      created_at: new Date().toISOString(),
    });
    if (timeError) throw timeError;

    await emitSafely(async (io) => {
      io.to(id).emit('incident:task', { incidentId: id, task });
    });

    return jsonNoStore(task);
  } catch (err) {
    return jsonNoStore({ error: err.message }, { status: 500 });
  }
}

export async function DELETE(request, { params }) {
  try {
    const supabase = require('@/lib/supabase');
    const { getUserFromRequest } = require('@/lib/auth');
    const user = getUserFromRequest(request);
    if (!user) return jsonNoStore({ error: 'Unauthorized' }, { status: 401 });

    const { taskId } = await params;
    const { error } = await supabase.from('incident_tasks').delete().eq('id', taskId);
    if (error) throw error;
    return jsonNoStore({ message: 'Deleted' });
  } catch (err) {
    return jsonNoStore({ error: err.message }, { status: 500 });
  }
}
