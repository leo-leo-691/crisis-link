const { NextResponse } = require('next/server');
const { getUserFromRequest } = require('@/lib/auth');

export const dynamic = 'force-dynamic';

const INCIDENT_COLUMNS = [
  'id',
  'type',
  'severity',
  'status',
  'zone',
  'room_number',
  'reporter_name',
  'reporter_type',
  'description',
  'description_translated',
  'detected_language',
  'ai_triage',
  'ai_provider',
  'evacuation_route',
  'recommended_responder',
  'debrief_report',
  'resolved_at',
  'is_drill',
  'created_at',
  'updated_at',
].join(', ');

function jsonNoStore(payload, init = {}) {
  return NextResponse.json(payload, {
    ...init,
    headers: {
      'Cache-Control': 'no-store',
      ...(init.headers || {}),
    },
  });
}

export async function GET(request, { params }) {
  try {
    const supabase = require('@/lib/supabase');
    const { id } = params;

    const [
      { data: incident, error: incError },
      { data: tasks, error: tasksError },
      { data: messages, error: msgError },
      { data: timeline, error: timeError },
    ] = await Promise.all([
      supabase.from('incidents').select(INCIDENT_COLUMNS).eq('id', id).maybeSingle(),
      supabase.from('incident_tasks').select('id, incident_id, title, priority, assigned_to, is_complete, created_at').eq('incident_id', id).order('id', { ascending: true }),
      supabase.from('incident_messages').select('id, incident_id, user_id, sender_name, message, created_at').eq('incident_id', id).order('created_at', { ascending: true }),
      supabase.from('incident_timeline').select('id, incident_id, actor, action, created_at').eq('incident_id', id).order('created_at', { ascending: true }),
    ]);

    if (incError) throw incError;
    if (tasksError) throw tasksError;
    if (msgError) throw msgError;
    if (timeError) throw timeError;
    if (!incident) return jsonNoStore({ error: 'Not found' }, { status: 404 });

    return jsonNoStore({
      incident,
      tasks: tasks || [],
      messages: messages || [],
      timeline: timeline || [],
    });
  } catch (err) {
    console.error('[GET /api/incidents/:id]', err);
    return jsonNoStore({ error: err.message }, { status: 500 });
  }
}

export async function DELETE(request, { params }) {
  try {
    const user = getUserFromRequest(request);
    if (!user || user.role !== 'admin') return jsonNoStore({ error: 'Forbidden' }, { status: 403 });

    const supabase = require('@/lib/supabase');
    const { id } = params;

    const [
      { error: tasksError },
      { error: msgError },
      { error: timeError },
      { error: incError },
    ] = await Promise.all([
      supabase.from('incident_tasks').delete().eq('incident_id', id),
      supabase.from('incident_messages').delete().eq('incident_id', id),
      supabase.from('incident_timeline').delete().eq('incident_id', id),
      supabase.from('incidents').delete().eq('id', id),
    ]);

    if (tasksError) throw tasksError;
    if (msgError) throw msgError;
    if (timeError) throw timeError;
    if (incError) throw incError;

    return jsonNoStore({ message: 'Deleted' });
  } catch (err) {
    return jsonNoStore({ error: err.message }, { status: 500 });
  }
}
