const { NextResponse } = require('next/server');

const VALID_TRANSITIONS = {
  reported:     ['acknowledged', 'responding', 'resolved'],
  acknowledged: ['responding', 'contained', 'resolved'],
  responding:   ['contained', 'resolved'],
  contained:    ['resolved'],
  resolved:     [],
};

const DEBRIEF_SYSTEM_PROMPT = 'You are a hospitality safety analyst. Return ONLY valid JSON with these exact keys: executive_summary (string, 2 sentences), what_went_well (array of 3 strings), areas_for_improvement (array of 3 strings), root_cause_analysis (string, one paragraph), recommendations (array of 4 strings), training_recommendations (array of 2 strings)';

async function generateAndStoreDebrief(incidentId, incidentSnapshot) {
  try {
    const supabase = require('@/lib/supabase');
    const { GoogleGenerativeAI } = require('@google/generative-ai');
    const { getIO } = require('@/lib/socket');

    if (!process.env.GEMINI_API_KEY) return;

    const [{ data: timeline, error: timeError }, { data: tasks, error: tasksError }] = await Promise.all([
      supabase.from('incident_timeline').select('id').eq('incident_id', incidentId),
      supabase.from('incident_tasks').select('is_complete').eq('incident_id', incidentId),
    ]);
    if (timeError) throw timeError;
    if (tasksError) throw tasksError;

    const timelineCount = (timeline || []).length;
    const tasksCompletedCount = (tasks || []).filter((task) => task.is_complete).length;
    const resolutionTimeMinutes = Math.max(
      1,
      Math.round((Date.now() - new Date(incidentSnapshot.created_at).getTime()) / 60000)
    );

    const prompt = `${DEBRIEF_SYSTEM_PROMPT}

Incident type: ${incidentSnapshot.type}
Zone: ${incidentSnapshot.zone}
Description: ${incidentSnapshot.description || 'N/A'}
Resolution time in minutes: ${resolutionTimeMinutes}
Timeline entries count: ${timelineCount}
Tasks completed count: ${tasksCompletedCount}`;

    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });
    const result = await model.generateContent(prompt);
    const raw = result.response.text().replace(/```json|```/g, '').trim();
    const parsed = JSON.parse(raw);

    const { data: updatedWithDebrief, error: updateError } = await supabase
      .from('incidents')
      .update({ debrief_report: JSON.stringify(parsed), updated_at: new Date().toISOString() })
      .eq('id', incidentId)
      .select('*')
      .maybeSingle();
    if (updateError) throw updateError;
    const io = getIO();
    if (io && updatedWithDebrief) io.emit('incident:updated', updatedWithDebrief);
  } catch (error) {
    console.error('[Auto Debrief] Failed to generate/store report:', error.message);
  }
}

export async function PATCH(request, { params }) {
  try {
    const supabase = require('@/lib/supabase');
    const { getIO } = require('@/lib/socket');
    const { getUserFromRequest } = require('@/lib/auth');

    const { id } = params;
    const { status } = await request.json();
    const user = getUserFromRequest(request);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { data: incident, error: incError } = await supabase
      .from('incidents')
      .select('*')
      .eq('id', id)
      .maybeSingle();
    if (incError) throw incError;
    if (!incident) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    const allowed = VALID_TRANSITIONS[incident.status] || [];
    if (!allowed.includes(status)) {
      return NextResponse.json({
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

    // Timeline entry
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
      .select('*')
      .eq('id', id)
      .maybeSingle();
    if (upError) throw upError;
    const io = getIO();
    if (io) io.emit('incident:updated', updatedIncident);

    if (status === 'resolved') {
      // Fire-and-forget generation to keep status update fast.
      generateAndStoreDebrief(id, updatedIncident);
    }

    return NextResponse.json({ incident: updatedIncident });
  } catch (err) {
    console.error('[PATCH /api/incidents/:id/status]', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
