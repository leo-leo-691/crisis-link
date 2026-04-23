const { GoogleGenerativeAI } = require('@google/generative-ai');

const SYSTEM_PROMPT = `You are an emergency triage AI for a hospitality venue. Analyze the incident and return ONLY a valid JSON object — no markdown, no code fences, no explanation. The JSON must have exactly these keys:
- severity: one of "low", "medium", "high", "critical"
- confidence: integer 0-100
- recommended_actions: array of 3-5 action strings (imperative, specific)
- suggested_staff_roles: array of role name strings
- estimated_response_time_minutes: integer
- brief_summary: one sentence string
- evacuation_route: one sentence string describing the safest exit route from the affected zone
- sop: array of exactly 8 objects, each object must include: step (integer 1-8), title (string), instruction (string), responsible_role (string), time_limit_minutes (integer)
- do_not_do: array of exactly 3 strings of things staff must NOT do in this emergency`;

const FALLBACK = {
  severity: 'high',
  confidence: 70,
  recommended_actions: [
    'Assess scene safety immediately',
    'Contact emergency services if required',
    'Notify venue manager on duty',
    'Secure the affected area',
    'Document all response actions',
  ],
  suggested_staff_roles: ['Security', 'First Aid', 'Manager'],
  estimated_response_time_minutes: 5,
  brief_summary: 'AI analysis unavailable — manual triage required by on-site team.',
  evacuation_route: 'Use nearest clearly marked emergency exit.',
  sop: [
    { step: 1, title: 'Assess immediate danger', instruction: 'Confirm active hazards and secure responder safety before entry.', responsible_role: 'Security Lead', time_limit_minutes: 2 },
    { step: 2, title: 'Raise internal alert', instruction: 'Notify duty manager and on-shift emergency team through incident channel.', responsible_role: 'Front Desk Supervisor', time_limit_minutes: 1 },
    { step: 3, title: 'Isolate affected zone', instruction: 'Restrict access and redirect guests from the incident perimeter.', responsible_role: 'Security Team', time_limit_minutes: 3 },
    { step: 4, title: 'Initiate first response', instruction: 'Provide first aid/fire suppression actions according to incident type.', responsible_role: 'First Aid Officer', time_limit_minutes: 5 },
    { step: 5, title: 'Contact emergency services', instruction: 'Call external responders if severity or risk exceeds on-site control.', responsible_role: 'Duty Manager', time_limit_minutes: 2 },
    { step: 6, title: 'Coordinate evacuation', instruction: 'Guide occupants through designated exits and verify area clearance.', responsible_role: 'Evacuation Marshal', time_limit_minutes: 8 },
    { step: 7, title: 'Stabilize and monitor', instruction: 'Maintain perimeter control and track status until risk is contained.', responsible_role: 'Operations Manager', time_limit_minutes: 10 },
    { step: 8, title: 'Document actions', instruction: 'Record timeline, decisions, and outcomes for debrief and compliance.', responsible_role: 'Incident Scribe', time_limit_minutes: 10 },
  ],
  do_not_do: [
    'Do not enter the affected zone without confirming scene safety.',
    'Do not move injured persons unless there is immediate life-threatening danger.',
    'Do not share unverified information with guests or media.',
  ],
};

const getModel = () => {
  if (!process.env.GEMINI_API_KEY) throw new Error('No Gemini API key found');
  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  // Using gemini-2.0-flash for ultra-fast response times
  return genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });
};

const TIMEOUT_MS = 2000;

const withTimeout = (promise, ms) => {
  return Promise.race([
    promise,
    new Promise((_, reject) => setTimeout(() => reject(new Error('AI Request Timeout')), ms))
  ]);
};

async function analyzeIncident(type, zone, description) {
  try {
    const model = getModel();
    const prompt = `${SYSTEM_PROMPT}\n\nIncident type: ${type}. Zone: ${zone}. Description: ${description}`;
    const result = await withTimeout(model.generateContent(prompt), TIMEOUT_MS);
    const text = result.response.text().replace(/```json|```/g, '').trim();
    return { result: JSON.parse(text), provider: 'gemini-2.0-flash' };
  } catch (e) {
    console.error('[AI] Gemini Triage failed/timed out:', e.message);
    return { result: FALLBACK, provider: 'fallback' };
  }
}

async function tryTranslation(description) {
  const prompt = `Detect language and translate to English if needed. Return JSON: {"detected_language": "...", "translated": "..."}. Text: "${description}"`;
  try {
    const model = getModel();
    const result = await withTimeout(model.generateContent(prompt), TIMEOUT_MS);
    const text = result.response.text().replace(/```json|```/g, '').trim();
    return JSON.parse(text);
  } catch (e) {
    return { detected_language: 'en', translated: description };
  }
}

async function getDispatchRecommendation(incidentId, type, zone, activeIncidents, staff) {
  const prompt = `Hotel dispatch recommendation. Recommend ONE staff member. Return JSON: {"recommended_name": "...", "reason": "..."}
  New Incident: ${type} in ${zone}
  Current staff: ${JSON.stringify(staff.map(s => ({ name: s.name, zone: s.zone_assignment })))}
  Active incidents: ${activeIncidents.length}`;

  try {
    const model = getModel();
    const result = await withTimeout(model.generateContent(prompt), TIMEOUT_MS);
    const text = result.response.text().replace(/```json|```/g, '').trim();
    return JSON.parse(text);
  } catch (e) {
    const match = staff.find(s => s.zone_assignment && zone.toLowerCase().includes(s.zone_assignment.toLowerCase()));
    return { recommended_name: match ? match.name : staff[0]?.name || 'Marcus Rivera', reason: 'Zone match fallback' };
  }
}

async function generateDebrief(incident, timeline, tasks, messages) {
  const prompt = `Post-incident debrief report. Use markdown headings. 
  Incident: ${incident.type} in ${incident.zone}
  Timeline: ${timeline.map(t => t.action).join(', ')}`;

  try {
    const model = getModel();
    const result = await model.generateContent(prompt);
    return result.response.text();
  } catch (e) {
    return `AI debrief unavailable for incident ${incident.id}.`;
  }
}

async function generateGuestFollowup(incident) {
  const prompt = `Write an empathetic follow-up to ${incident.reporter_name || 'Guest'} regarding the ${incident.type} in ${incident.zone}. Under 100 words.`;
  try {
    const model = getModel();
    const result = await model.generateContent(prompt);
    return result.response.text();
  } catch (e) {
    return `Dear Guest, we apologize for the ${incident.type} incident. We hope you are well.`;
  }
}

module.exports = { analyzeIncident, tryTranslation, getDispatchRecommendation, generateDebrief, generateGuestFollowup };
