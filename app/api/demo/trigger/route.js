const { NextResponse } = require('next/server');
export const dynamic = 'force-dynamic';

const INCIDENT_TYPES = ['fire', 'medical', 'security', 'flood', 'evacuation', 'other'];
const SEVERITIES = ['low', 'medium', 'high', 'critical'];
const ZONES = ['Lobby', 'Restaurant', 'Kitchen', 'Pool Area', 'Gym', 'Floor 2', 'Conference Room A', 'Parking', 'Spa'];
const DESCRIPTIONS = {
  fire: ['Smoke detected in guest corridor', 'Trash can fire near east stairwell', 'Alarm triggered in laundry room'],
  medical: ['Guest collapsed near pool', 'Allergic reaction at restaurant table 8', 'Guest fell in bathroom, possible fracture'],
  security: ['Unauthorized entry attempt at staff entrance', 'Loud altercation in lobby area', 'Suspicious package near front desk'],
  flood: ['Pipe burst in 3rd floor bathroom', 'Water pool in elevator lobby', 'Roof leak in conference room A'],
  evacuation: ['Building-wide evacuation drill', 'Suspicious odor reported in HVAC system'],
  other: ['Power outage in east wing', 'Elevator stuck between floors'],
};
const REPORTERS = ['James Miller', 'Sarah B.', 'Anonymous Guest', 'Room 412', 'Restaurant Staff'];

function buildDemoTriage(type, zone, description, SOP_TASKS, getMockAIResponse) {
  const mock = getMockAIResponse(`${type} ${zone} ${description}`);
  const severity = String(mock?.severity || 'high').toLowerCase();
  const taskTitles = (SOP_TASKS[type] || SOP_TASKS.other || []).slice(0, 8);

  return {
    provider: 'mock',
    result: {
      severity,
      confidence: mock?.confidence || 88,
      brief_summary: `Simulated ${type} incident in ${zone}.`,
      estimated_response_time_minutes: severity === 'critical' ? 3 : severity === 'high' ? 5 : 7,
      suggested_staff_roles: ['Security', 'First Aid', 'Manager'],
      recommended_actions: (mock?.actions || [
        'Assess the scene immediately',
        'Notify the on-duty manager',
        'Coordinate responders and secure the area',
      ]).slice(0, 5),
      sop: taskTitles.map((title, index) => ({
        step: index + 1,
        title,
        instruction: title,
        responsible_role: index < 2 ? 'Security' : index < 5 ? 'First Aid' : 'Manager',
        time_limit_minutes: Math.min(8, index + 1),
      })),
      evacuation_route: mock?.evacuation || 'Use the nearest marked emergency exit and proceed to the assembly point at the main car park.',
      do_not_do: [
        'Do not panic guests with unverified information.',
        'Do not enter an unsafe area without backup.',
        'Do not delay escalation if conditions worsen.',
      ],
    },
  };
}

// POST /api/demo/trigger — inject a simulated incident for demo autopilot
export async function POST(request) {
  try {
    const { getUserFromRequest } = require('@/lib/auth');
    const user = getUserFromRequest(request);
    if (!user || user.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const supabase = require('@/lib/supabase');
    const { getIO } = require('@/lib/socket');
    const { SOP_TASKS } = require('@/lib/sopTasks');
    const { getMockAIResponse } = require('@/lib/mockAI');

    const type     = INCIDENT_TYPES[Math.floor(Math.random() * INCIDENT_TYPES.length)];
    const zone     = ZONES[Math.floor(Math.random() * ZONES.length)];
    const severity = SEVERITIES[Math.floor(Math.random() * SEVERITIES.length)];
    const descs    = DESCRIPTIONS[type] || DESCRIPTIONS.other;
    const desc     = descs[Math.floor(Math.random() * descs.length)];
    const reporter = REPORTERS[Math.floor(Math.random() * REPORTERS.length)];

    const d = new Date();
    const date = d.toISOString().slice(0, 10).replace(/-/g, '');
    const rand = Math.floor(Math.random() * 9999).toString().padStart(4, '0');
    const id = `DEMO-${date}-${rand}`;
    const now = new Date().toISOString();

    const { result: triage, provider } = buildDemoTriage(type, zone, desc, SOP_TASKS, getMockAIResponse);

    const { data: incident, error: incError } = await supabase
      .from('incidents')
      .insert({
        id,
        type,
        severity: triage?.severity || severity,
        status: 'reported',
        zone,
        reporter_name: reporter,
        reporter_type: 'guest',
        description: desc,
        ai_triage: triage || null,
        ai_provider: provider,
        evacuation_route: triage?.evacuation_route || null,
        is_drill: true,
        created_at: now,
        updated_at: now,
      })
      .select('id, type, severity, status, zone, room_number, reporter_name, reporter_type, description, description_translated, detected_language, ai_triage, ai_provider, evacuation_route, recommended_responder, is_drill, created_at, updated_at, resolved_at')
      .single();
    if (incError) throw incError;

    // Seed SOP tasks in parallel
    const tasks = SOP_TASKS[type] || SOP_TASKS.other;
    const { error: taskError } = await supabase
      .from('incident_tasks')
      .insert(tasks.map((t) => ({ incident_id: id, title: t, priority: 'high' })));
    if (taskError) throw taskError;

    const { error: timeError } = await supabase.from('incident_timeline').insert({
      incident_id: id,
      actor: reporter,
      action: `[DEMO] Incident reported: ${desc.slice(0, 60)}`,
      created_at: now,
    });
    if (timeError) throw timeError;

    try {
      const io = getIO();
      if (io) {
        io.emit('incident:new', incident);
        io.emit('incident:updated', incident);
        const { count } = await supabase
          .from('incidents')
          .select('id', { count: 'exact', head: true })
          .neq('status', 'resolved')
          .eq('is_drill', false);
        io.emit('live_count', { count: count || 0 });
      }
    } catch (socketError) {
      console.error('[POST /api/demo/trigger] Socket emit failed:', socketError);
    }

    return NextResponse.json({ incident, provider }, { status: 201 });
  } catch (err) {
    console.error('[POST /api/demo/trigger]', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
