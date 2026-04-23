const { NextResponse } = require('next/server');

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

// POST /api/demo/trigger — inject a simulated incident for demo autopilot
export async function POST(request) {
  try {
    const supabase = require('@/lib/supabase');
    const { analyzeIncident } = require('@/lib/aiTriage');
    const { getIO } = require('@/lib/socket');
    const { SOP_TASKS } = require('@/lib/sopTasks');

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

    const { result: triage, provider } = await analyzeIncident(type, zone, desc);

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
      .select('*')
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

    const io = getIO();
    if (io) {
      io.emit('incident:new', incident);
      io.emit('incident:updated', incident);
      const { count } = await supabase
        .from('incidents')
        .select('id', { count: 'exact', head: true })
        .neq('status', 'resolved');
      io.emit('live_count', { count: count || 0 });
    }

    return NextResponse.json({ incident, provider }, { status: 201 });
  } catch (err) {
    console.error('[POST /api/demo/trigger]', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
