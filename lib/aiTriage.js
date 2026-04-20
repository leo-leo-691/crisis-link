const { GoogleGenerativeAI } = require('@google/generative-ai');

const SYSTEM_PROMPT = `You are an emergency triage AI for a hospitality venue. Analyze the incident and return ONLY a valid JSON object — no markdown, no code fences, no explanation. The JSON must have exactly these keys:
- severity: one of "low", "medium", "high", "critical"
- confidence: integer 0-100
- recommended_actions: array of 3-5 action strings (imperative, specific)
- suggested_staff_roles: array of role name strings
- estimated_response_time_minutes: integer
- brief_summary: one sentence string
- evacuation_route: string describing the safest exit route from the affected zone (or null if not applicable)`;

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
};

const getModel = () => {
  if (!process.env.GEMINI_API_KEY) throw new Error('No Gemini API key found');
  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  // Using gemini-2.0-flash for ultra-fast response times
  return genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });
};

async function analyzeIncident(type, zone, description) {
  try {
    const model = getModel();
    const prompt = `${SYSTEM_PROMPT}\n\nIncident type: ${type}. Zone: ${zone}. Description: ${description}`;
    const result = await model.generateContent(prompt);
    const text = result.response.text().replace(/```json|```/g, '').trim();
    return { result: JSON.parse(text), provider: 'gemini-2.0-flash' };
  } catch (e) {
    console.error('[AI] Gemini Triage failed:', e.message);
    return { result: FALLBACK, provider: 'fallback' };
  }
}

async function tryTranslation(description) {
  const prompt = `Detect language and translate to English if needed. Return JSON: {"detected_language": "...", "translated": "..."}. Text: "${description}"`;
  try {
    const model = getModel();
    const result = await model.generateContent(prompt);
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
    const result = await model.generateContent(prompt);
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
