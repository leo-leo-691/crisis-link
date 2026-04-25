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

async function generateDebriefReport(incident, timeline = [], tasks = [], messages = []) {
  const completedTasks = tasks.filter((task) => task.is_complete).length;
  const resolutionMinutes = incident?.resolved_at && incident?.created_at
    ? Math.max(1, Math.round((new Date(incident.resolved_at).getTime() - new Date(incident.created_at).getTime()) / 60000))
    : Math.max(1, Math.round((Date.now() - new Date(incident?.created_at || Date.now()).getTime()) / 60000));

  // First try Gemini to generate a rich AI-written markdown debrief
  try {
    if (process.env.GEMINI_API_KEY) {
      const { GoogleGenerativeAI } = require('@google/generative-ai');
      const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
      const model = genAI.getGenerativeModel({ model: 'gemini-3-flash-preview' });
      const prompt = `You are an emergency response analyst. Write a professional post-incident debrief report in Markdown format for the following hotel incident. Use ## headings for sections: Executive Summary, What Went Well, Areas for Improvement, Root Cause Analysis, Recommendations, Training Recommendations, Metrics. Keep it concise and professional.

Incident: ${incident?.type || 'Unknown'} in ${incident?.zone || 'Unknown zone'}
Severity: ${incident?.severity || 'Unknown'}
Status: ${incident?.status || 'Unknown'}
Description: ${incident?.description || 'No description'}
Resolution time: ~${resolutionMinutes} minutes
Timeline entries: ${timeline.length}
Messages sent: ${messages.length}
Tasks completed: ${completedTasks}/${tasks.length}`;
      const result = await model.generateContent(prompt);
      const text = result.response.text().trim();
      if (text && text.length > 50) return text;
    }
  } catch (e) {
    console.log('Gemini debrief failed, using structured fallback:', e.message);
  }

  // Structured markdown fallback (no AI dependency)
  const completedTaskNote = completedTasks > 0
    ? `- ${completedTasks} of ${tasks.length} response tasks were completed during the incident.`
    : '- Core response tasks were available immediately after the incident was created.';

  return `# Post-Incident Debrief Report

## Executive Summary
${String(incident?.type || 'Incident').toUpperCase()} in **${incident?.zone || 'Unknown zone'}** was handled through CrisisLink and resolved in approximately **${resolutionMinutes} minutes**.

## What Went Well
- The incident was logged and tracked in a single workflow.
- Response actions were visible to the whole operations team in real time.
${completedTaskNote}
- All timeline events and communications were captured for audit purposes.

## Areas for Improvement
- Confirm acknowledgements as early as possible to reduce escalation risk.
- Ensure every operational update is logged in chat or timeline for audit continuity.
- Capture any guest-facing follow-up notes before final resolution.

## Root Cause Analysis
${incident?.description
  ? `Primary trigger recorded: ${incident.description}. Further review should validate staffing, environmental, and process factors in the affected zone.`
  : 'The recorded incident details should be reviewed alongside staff statements and venue conditions to confirm the underlying cause.'}

## Recommendations
1. Review the SOP completion trail with on-duty staff.
2. Verify responder assignment coverage for the affected zone.
3. Document any delays between report, acknowledgement, and containment.
4. Schedule a short after-action review for continuous improvement.

## Training Recommendations
- Run a focused tabletop exercise for this incident category.
- Refresh frontline staff on escalation and guest communication protocols.

## Metrics
- **Timeline entries:** ${timeline.length}
- **Messages sent:** ${messages.length}
- **Tasks completed:** ${completedTasks}/${tasks.length}
- **Resolution time:** ~${resolutionMinutes} minutes
`;
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
