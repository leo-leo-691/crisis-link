const { GoogleGenerativeAI } = require('@google/generative-ai');

const FALLBACK = {
  severity: 'high',
  confidence: 70,
  recommended_actions: [
    'Assess scene safety immediately',
    'Contact emergency services if required',
    'Notify venue manager on duty',
    'Secure the affected area',
    'Document all response actions'
  ],
  suggested_staff_roles: ['Security', 'First Aid', 'Manager'],
  estimated_response_time_minutes: 5,
  brief_summary: 'AI analysis unavailable — manual triage required by on-site team.',
  sop: [
    { step: 1, title: 'Assess Scene', instruction: 'Ensure the area is safe before approaching.', responsible_role: 'Security', time_limit_minutes: 1 },
    { step: 2, title: 'Call for Help', instruction: 'Contact emergency services immediately.', responsible_role: 'Manager', time_limit_minutes: 1 },
    { step: 3, title: 'Notify Management', instruction: 'Alert the duty manager and senior staff.', responsible_role: 'Front Desk', time_limit_minutes: 2 },
    { step: 4, title: 'Secure Area', instruction: 'Clear guests from the affected zone.', responsible_role: 'Security', time_limit_minutes: 3 },
    { step: 5, title: 'First Aid', instruction: 'Administer first aid if trained and safe to do so.', responsible_role: 'First Aid', time_limit_minutes: 3 },
    { step: 6, title: 'Document', instruction: 'Record all actions taken with timestamps.', responsible_role: 'Manager', time_limit_minutes: 5 },
    { step: 7, title: 'Coordinate Responders', instruction: 'Meet emergency services at venue entrance and brief them.', responsible_role: 'Security', time_limit_minutes: 5 },
    { step: 8, title: 'Post-Incident', instruction: 'Preserve the scene for investigation and file incident report.', responsible_role: 'Manager', time_limit_minutes: 10 }
  ],
  evacuation_route: 'Use the nearest marked emergency exit and proceed to the assembly point at the main car park.',
  do_not_do: [
    'Do not move injured persons unless there is immediate danger',
    'Do not allow unauthorised staff into the affected area',
    'Do not speak to media or guests about the incident details'
  ]
};

const SYSTEM_PROMPT = `You are an emergency triage AI for a hospitality venue. Analyze the incident and return ONLY a valid JSON object with no markdown formatting, no explanation, and no code fences. The JSON must have these exact keys:
- severity: one of low, medium, high, critical
- confidence: integer 0-100
- brief_summary: one sentence string
- estimated_response_time_minutes: integer
- suggested_staff_roles: array of role name strings
- recommended_actions: array of 3-5 immediate action strings
- sop: array of exactly 8 objects each with keys: step (integer 1-8), title (short string), instruction (detailed string), responsible_role (string), time_limit_minutes (integer)
- evacuation_route: one sentence describing safest exit from the affected zone
- do_not_do: array of exactly 3 strings of things staff must NOT do in this emergency`;

async function analyzeIncident(type, zone, description) {
  try {
    if (!process.env.GEMINI_API_KEY) throw new Error('No Gemini key');
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: 'gemini-3-flash-preview' });
    const prompt = `${SYSTEM_PROMPT}\n\nIncident type: ${type}. Zone: ${zone}. Description: ${description}`;
    const result = await model.generateContent(prompt);
    const text = result.response.text().replace(/```json|```/g, '').trim();
    const parsed = JSON.parse(text);
    return { result: parsed, provider: 'gemini' };
  } catch(e) {
    console.error('[AI Triage] Gemini analysis failed:', e.message);
    return { result: FALLBACK, provider: 'fallback' };
  }
}

function buildDebriefObject(incident, timeline = [], tasks = [], messages = []) {
  const completedTasks = tasks.filter((task) => task.is_complete).length;
  const resolutionMinutes = incident?.resolved_at && incident?.created_at
    ? Math.max(1, Math.round((new Date(incident.resolved_at).getTime() - new Date(incident.created_at).getTime()) / 60000))
    : Math.max(1, Math.round((Date.now() - new Date(incident?.created_at || Date.now()).getTime()) / 60000));

  const executiveSummary = `${String(incident?.type || 'Incident').toUpperCase()} in ${incident?.zone || 'Unknown zone'} was handled through CrisisLink and resolved in approximately ${resolutionMinutes} minutes.`;
  const whatWentWell = [
    'The incident was logged and tracked in a single workflow.',
    'Response actions were visible to the operations team in real time.',
    completedTasks > 0
      ? `${completedTasks} of ${tasks.length} response tasks were completed during the incident.`
      : 'Core response tasks were available immediately after the incident was created.',
    'Timeline events and communications were captured for audit purposes.',
  ];
  const areasForImprovement = [
    'Confirm acknowledgements as early as possible to reduce escalation risk.',
    'Ensure operational updates are logged in chat or timeline for audit continuity.',
    'Capture guest-facing follow-up notes before final resolution.',
  ];
  const rootCauseAnalysis = incident?.description
    ? `Primary trigger recorded: ${incident.description}. Further review should validate staffing, environmental, and process factors in the affected zone.`
    : 'The recorded incident details should be reviewed alongside staff statements and venue conditions to confirm the underlying cause.';
  const recommendations = [
    'Review the SOP completion trail with on-duty staff.',
    'Verify responder assignment coverage for the affected zone.',
    'Document any delays between report, acknowledgement, and containment.',
    'Schedule a short after-action review for continuous improvement.',
  ];
  const trainingRecommendations = [
    'Run a focused tabletop exercise for this incident category.',
    'Refresh frontline staff on escalation and guest communication protocols.',
  ];

  return {
    executive_summary: executiveSummary,
    what_went_well: whatWentWell,
    areas_for_improvement: areasForImprovement,
    root_cause_analysis: rootCauseAnalysis,
    recommendations: recommendations,
    training_recommendations: trainingRecommendations,
    metrics: {
      timeline_entries: timeline.length,
      messages_sent: messages.length,
      tasks_completed: completedTasks,
      total_tasks: tasks.length,
      resolution_time_minutes: resolutionMinutes,
    },
  };
}

function normalizeDebriefObject(candidate, fallback) {
  if (!candidate || typeof candidate !== 'object' || Array.isArray(candidate)) return fallback;
  return {
    executive_summary: candidate.executive_summary || fallback.executive_summary,
    what_went_well: Array.isArray(candidate.what_went_well) && candidate.what_went_well.length
      ? candidate.what_went_well
      : fallback.what_went_well,
    areas_for_improvement: Array.isArray(candidate.areas_for_improvement) && candidate.areas_for_improvement.length
      ? candidate.areas_for_improvement
      : fallback.areas_for_improvement,
    root_cause_analysis: candidate.root_cause_analysis || fallback.root_cause_analysis,
    recommendations: Array.isArray(candidate.recommendations) && candidate.recommendations.length
      ? candidate.recommendations
      : fallback.recommendations,
    training_recommendations: Array.isArray(candidate.training_recommendations) && candidate.training_recommendations.length
      ? candidate.training_recommendations
      : fallback.training_recommendations,
    metrics: {
      ...(fallback.metrics || {}),
      ...((candidate.metrics && typeof candidate.metrics === 'object' && !Array.isArray(candidate.metrics)) ? candidate.metrics : {}),
    },
  };
}

async function generateDebriefReport(incident, timeline = [], tasks = [], messages = []) {
  const fallback = buildDebriefObject(incident, timeline, tasks, messages);

  // First try Gemini to generate a structured AI-written debrief
  try {
    if (process.env.GEMINI_API_KEY) {
      const { GoogleGenerativeAI } = require('@google/generative-ai');
      const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
      const model = genAI.getGenerativeModel({ model: 'gemini-3-flash-preview' });
      const prompt = `You are an emergency response analyst. Return ONLY valid JSON with these exact keys:
- executive_summary: string
- what_went_well: array of 3-5 strings
- areas_for_improvement: array of 3-5 strings
- root_cause_analysis: string
- recommendations: array of 3-5 strings
- training_recommendations: array of 2-4 strings
- metrics: object with numeric keys timeline_entries, messages_sent, tasks_completed, total_tasks, resolution_time_minutes

Incident: ${incident?.type || 'Unknown'} in ${incident?.zone || 'Unknown zone'}
Severity: ${incident?.severity || 'Unknown'}
Status: ${incident?.status || 'Unknown'}
Description: ${incident?.description || 'No description'}
Resolution time: ~${resolutionMinutes} minutes
Timeline entries: ${timeline.length}
Messages sent: ${messages.length}
Tasks completed: ${completedTasks}/${tasks.length}`;
      const result = await model.generateContent(prompt);
      const text = result.response.text().replace(/```json|```/g, '').trim();
      const parsed = JSON.parse(text);
      return JSON.stringify(normalizeDebriefObject(parsed, fallback));
    }
  } catch (e) {
    console.log('Gemini debrief failed, using structured fallback:', e.message);
  }

  return JSON.stringify(fallback);
}

async function generateGuestFollowup(incident) {
  return `Hello,\n\nWe are following up regarding the ${incident?.type || 'incident'} reported in ${incident?.zone || 'the venue'}. Our team has taken action and the case is being monitored through CrisisLink. If you need additional assistance, please contact the front desk so we can support you immediately.\n\nThank you,\nGrand Hotel Response Team`;
}

module.exports = {
  analyzeIncident,
  generateDebrief: generateDebriefReport,
  generateDebriefReport,
  generateGuestFollowup,
};
