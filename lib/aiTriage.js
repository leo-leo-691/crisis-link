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
    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });
    const prompt = `${SYSTEM_PROMPT}\n\nIncident type: ${type}. Zone: ${zone}. Description: ${description}`;
    const result = await model.generateContent(prompt);
    const text = result.response.text().replace(/```json|```/g, '').trim();
    const parsed = JSON.parse(text);
    return { result: parsed, provider: 'gemini' };
  } catch(e) {
    console.log('Gemini triage failed, using fallback:', e.message);
    return { result: FALLBACK, provider: 'fallback' };
  }
}

module.exports = { analyzeIncident };
