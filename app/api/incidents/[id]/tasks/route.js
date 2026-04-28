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

async function attachAssigneeName(supabase, task) {
  if (!task?.assigned_to) return task;
  const { data: assignee, error } = await supabase
    .from('users')
    .select('name')
    .eq('id', task.assigned_to)
    .maybeSingle();
  if (error) throw error;
  return {
    ...task,
    assignee_name: assignee?.name || null,
  };
}

export async function GET(request, { params }) {
  try {
    const { getUserFromRequest } = require('@/lib/auth');
    const user = getUserFromRequest(request);
    if (!user) return jsonNoStore({ error: 'Unauthorized' }, { status: 401 });

    const supabase = require('@/lib/supabase');
    const { id } = await params;
    const { data: tasks, error } = await supabase
      .from('incident_tasks')
      .select('id, incident_id, title, priority, assigned_to, is_complete, created_at')
      .eq('incident_id', id)
      .order('id', { ascending: true });
    if (error) throw error;

    // Batch assignee lookup — one query for all assignees, not one per task
    const assigneeIds = [...new Set((tasks || []).map(t => t.assigned_to).filter(Boolean))];
    let assigneeMap = new Map();
    if (assigneeIds.length) {
      const { data: assignees, error: assigneeError } = await supabase
        .from('users')
        .select('id, name')
        .in('id', assigneeIds);
      if (assigneeError) throw assigneeError;
      assigneeMap = new Map((assignees || []).map(a => [a.id, a.name]));
    }

    const enrichedTasks = (tasks || []).map(task => ({
      ...task,
      assignee_name: task.assigned_to ? assigneeMap.get(task.assigned_to) || null : null,
    }));

    return jsonNoStore({ tasks: enrichedTasks });
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

    const { id } = await params;
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
    const enrichedTask = await attachAssigneeName(supabase, task);

    const { error: timeError } = await supabase.from('incident_timeline').insert({
      incident_id: id,
      actor: user?.name || 'System',
      action: `Task added: "${title}"`,
      created_at: new Date().toISOString(),
    });
    if (timeError) throw timeError;

    await emitSafely(async (io) => {
      io.to(id).emit('incident:task', { incidentId: id, task: enrichedTask });
    });

    return jsonNoStore(enrichedTask, { status: 201 });
  } catch (err) {
    return jsonNoStore({ error: err.message }, { status: 500 });
  }
}
