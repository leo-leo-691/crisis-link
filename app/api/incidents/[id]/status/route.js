const { NextResponse } = require('next/server');

const VALID_TRANSITIONS = {
  reported: ['acknowledged', 'responding', 'resolved'],
  acknowledged: ['responding', 'contained', 'resolved'],
  responding: ['contained', 'resolved'],
  contained: ['resolved'],
  resolved: [],
};

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

async function emitSafely(callback) {
  try {
    const { getIO } = require('@/lib/socket');
    const io = getIO();
    if (io) {
      await callback(io);
    }
  } catch (socketError) {
    console.error('[PATCH /api/incidents/:id/status] Socket emit failed:', socketError);
  }
}

async function generateAndStoreDebrief(incidentId, incidentSnapshot) {
  try {
    const supabase = require('@/lib/supabase');
    const { generateDebriefReport } = require('@/lib/aiTriage');

    const [{ data: timeline, error: timeError }, { data: tasks, error: tasksError }, { data: messages, error: msgError }] = await Promise.all([
      supabase.from('incident_timeline').select('actor, action, created_at').eq('incident_id', incidentId).order('created_at', { ascending: true }),
      supabase.from('incident_tasks').select('title, priority, is_complete').eq('incident_id', incidentId).order('id', { ascending: true }),
      supabase.from('incident_messages').select('sender_name, message, created_at').eq('incident_id', incidentId).order('created_at', { ascending: true }),
    ]);
    if (timeError) throw timeError;
    if (tasksError) throw tasksError;
    if (msgError) throw msgError;

    const report = await generateDebriefReport(incidentSnapshot, timeline || [], tasks || [], messages || []);

    const { data: updatedIncident, error: updateError } = await supabase
      .from('incidents')
      .update({ debrief_report: JSON.stringify(report), updated_at: new Date().toISOString() })
      .eq('id', incidentId)
      .select(INCIDENT_COLUMNS)
      .maybeSingle();
    if (updateError) throw updateError;

    await emitSafely(async (io) => {
      io.emit('incident:updated', updatedIncident);
    });

    return updatedIncident;
  } catch (error) {
    console.error('[Auto Debrief] Failed to generate/store report:', error.message);
    return incidentSnapshot;
  }
}

export async function PATCH(request, { params }) {
  try {
    const supabase = require('@/lib/supabase');
    const { getUserFromRequest } = require('@/lib/auth');

    const { id } = params;
    const { status } = await request.json();
    const user = getUserFromRequest(request);
    if (!user) return jsonNoStore({ error: 'Unauthorized' }, { status: 401 });

    const { data: incident, error: incError } = await supabase
      .from('incidents')
      .select(INCIDENT_COLUMNS)
      .eq('id', id)
      .maybeSingle();
    if (incError) throw incError;
    if (!incident) return jsonNoStore({ error: 'Not found' }, { status: 404 });

    const allowed = VALID_TRANSITIONS[incident.status] || [];
    if (!allowed.includes(status)) {
      return jsonNoStore({
        error: `Cannot transition from "${incident.status}" to "${status}"`,
        allowed,
      }, { status: 422 });
    }

    const now = new Date().toISOString();
    const resolvedAt = status === 'resolved' ? now : incident.resolved_at;

    const { error: updateError } = await supabase
      .from('incidents')
      .update({ status, updated_at: now, resolved_at: resolvedAt })
      .eq('id', id);
    if (updateError) throw updateError;

    const actorName = user?.name || 'System';
    const { error: timeError } = await supabase.from('incident_timeline').insert({
      incident_id: id,
      actor: actorName,
      action: `Status changed to "${status}"`,
      created_at: now,
    });
    if (timeError) throw timeError;

    const { data: updatedIncident, error: upError } = await supabase
      .from('incidents')
      .select(INCIDENT_COLUMNS)
      .eq('id', id)
      .maybeSingle();
    if (upError) throw upError;

    await emitSafely(async (io) => {
      io.emit('incident:updated', updatedIncident);
    });

    let responseIncident = updatedIncident;
    if (status === 'resolved') {
      responseIncident = await generateAndStoreDebrief(id, updatedIncident);
    }

    return jsonNoStore(responseIncident);
  } catch (err) {
    console.error('[PATCH /api/incidents/:id/status]', err);
    return jsonNoStore({ error: err.message }, { status: 500 });
  }
}
