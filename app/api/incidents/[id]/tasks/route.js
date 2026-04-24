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
    console.error('[TASKS API] Socket emit failed:', socketError);
  }
}

export async function GET(request, { params }) {
  try {
    const { getUserFromRequest } = require('@/lib/auth');
    const user = getUserFromRequest(request);
    if (!user) return jsonNoStore({ error: 'Unauthorized' }, { status: 401 });

    const supabase = require('@/lib/supabase');
    const { id } = params;
    const { data: tasks, error } = await supabase
      .from('incident_tasks')
      .select('id, incident_id, title, priority, assigned_to, is_complete, created_at')
      .eq('incident_id', id)
      .order('id', { ascending: true });
    if (error) throw error;
    return jsonNoStore({ tasks: tasks || [] });
  } catch (err) {
    return jsonNoStore({ error: err.message }, { status: 500 });
  }
}

export async function POST(request, { params }) {
  try {
    const supabase = require('@/lib/supabase');
    const { getUserFromRequest } = require('@/lib/auth');
    const user = getUserFromRequest(request);
    if (!user) return jsonNoStore({ error: 'Unauthorized' }, { status: 401 });

    const { id } = params;
    const { title, priority = 'medium', assigned_to = null } = await request.json();
    if (!title) return jsonNoStore({ error: 'title required' }, { status: 400 });

    const { data: task, error: taskError } = await supabase
      .from('incident_tasks')
      .insert({
        incident_id: id,
        title,
        assigned_to,
        priority,
      })
      .select('id, incident_id, title, priority, assigned_to, is_complete, created_at')
      .single();
    if (taskError) throw taskError;

    const { error: timeError } = await supabase.from('incident_timeline').insert({
      incident_id: id,
      actor: user?.name || 'System',
      action: `Task added: "${title}"`,
      created_at: new Date().toISOString(),
    });
    if (timeError) throw timeError;

    await emitSafely(async (io) => {
      io.to(id).emit('incident:task', { incidentId: id, task });
    });

    return jsonNoStore(task, { status: 201 });
  } catch (err) {
    return jsonNoStore({ error: err.message }, { status: 500 });
  }
}
