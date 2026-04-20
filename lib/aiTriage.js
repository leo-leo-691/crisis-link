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

async function tryClaudeAnalysis(type, zone, description) {
  if (!process.env.ANTHROPIC_API_KEY) throw new Error('No Claude key');
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': process.env.ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-opus-4-5',
      max_tokens: 600,
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: `Incident type: ${type}. Zone: ${zone}. Description: ${description}` }],
    }),
  });
  if (!res.ok) throw new Error(`Claude HTTP ${res.status}`);
  const data = await res.json();
  const text = data.content[0].text.replace(/```json|```/g, '').trim();
  return { result: JSON.parse(text), provider: 'claude' };
}

async function tryGeminiAnalysis(type, zone, description) {
  if (!process.env.GEMINI_API_KEY) throw new Error('No Gemini key');
  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });
  const prompt = `${SYSTEM_PROMPT}\n\nIncident type: ${type}. Zone: ${zone}. Description: ${description}`;
  const result = await model.generateContent(prompt);
  const text = result.response.text().replace(/```json|```/g, '').trim();
  return { result: JSON.parse(text), provider: 'gemini' };
}

async function tryTranslation(description) {
  // Use Claude/Gemini to detect language and translate
  const prompt = `Detect the language of this text and translate it to English if it is not already English. Return a JSON object with keys: "detected_language" (IETF language tag, e.g. "en", "fr", "es"), "translated" (English translation — same as original if already English). Text: "${description}"`;
  try {
    if (process.env.ANTHROPIC_API_KEY) {
      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-api-key': process.env.ANTHROPIC_API_KEY, 'anthropic-version': '2023-06-01' },
        body: JSON.stringify({ model: 'claude-haiku-4-5', max_tokens: 200, messages: [{ role: 'user', content: prompt }] }),
      });
      const d = await res.json();
      return JSON.parse(d.content[0].text.replace(/```json|```/g, '').trim());
    }
    if (process.env.GEMINI_API_KEY) {
      const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
      const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });
      const r = await model.generateContent(prompt);
      return JSON.parse(r.response.text().replace(/```json|```/g, '').trim());
    }
  } catch (e) { /* silent */ }
  return { detected_language: 'en', translated: description };
}

async function analyzeIncident(type, zone, description) {
  try { return await tryClaudeAnalysis(type, zone, description); } catch (e) {
    console.log('[AI] Claude failed:', e.message, '— trying Gemini');
  }
  try { return await tryGeminiAnalysis(type, zone, description); } catch (e) {
    console.log('[AI] Gemini failed:', e.message, '— using FALLBACK');
  }
  return { result: FALLBACK, provider: 'fallback' };
}

async function getDispatchRecommendation(incidentId, type, zone, activeIncidents, staff) {
  const prompt = `You are a hotel emergency dispatch coordinator. Given this new incident and current staff status, recommend the SINGLE best staff member to dispatch first. Return JSON with: {"recommended_name": "...", "reason": "..."}
  
New Incident: type=${type}, zone=${zone}
Current staff: ${JSON.stringify(staff.map(s => ({ name: s.name, zone: s.zone_assignment })))}
Active incidents: ${activeIncidents.length} currently ongoing`;

  try {
    if (process.env.ANTHROPIC_API_KEY) {
      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-api-key': process.env.ANTHROPIC_API_KEY, 'anthropic-version': '2023-06-01' },
        body: JSON.stringify({ model: 'claude-haiku-4-5', max_tokens: 150, messages: [{ role: 'user', content: prompt }] }),
      });
      const d = await res.json();
      return JSON.parse(d.content[0].text.replace(/```json|```/g, '').trim());
    }
    if (process.env.GEMINI_API_KEY) {
      const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
      const m = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });
      const r = await m.generateContent(prompt);
      return JSON.parse(r.response.text().replace(/```json|```/g, '').trim());
    }
  } catch (e) { /* silent */ }
  // Fallback: pick staff whose zone matches
  const match = staff.find(s => s.zone_assignment && zone.toLowerCase().includes(s.zone_assignment.toLowerCase()));
  return { recommended_name: match ? match.name : staff[0]?.name || 'Marcus Rivera', reason: 'Zone proximity match' };
}

async function generateDebrief(incident, timeline, tasks, messages) {
  const prompt = `You are writing a post-incident debrief for a hotel emergency. Produce a structured debrief report with sections: Executive Summary, Timeline of Events, Response Effectiveness, What Went Well, Areas for Improvement, Recommendations. Use markdown headings.

Incident: ${incident.type} in ${incident.zone}, severity: ${incident.severity}
Description: ${incident.description}
Timeline: ${timeline.map(t => `[${t.created_at}] ${t.actor}: ${t.action}`).join('\n')}
Tasks completed: ${tasks.filter(t => t.is_complete).length}/${tasks.length}
Staff messages: ${messages.length} exchanged`;

  try {
    if (process.env.ANTHROPIC_API_KEY) {
      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-api-key': process.env.ANTHROPIC_API_KEY, 'anthropic-version': '2023-06-01' },
        body: JSON.stringify({ model: 'claude-opus-4-5', max_tokens: 1000, messages: [{ role: 'user', content: prompt }] }),
      });
      const d = await res.json();
      return d.content[0].text;
    }
    if (process.env.GEMINI_API_KEY) {
      const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
      const m = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });
      const r = await m.generateContent(prompt);
      return r.response.text();
    }
  } catch (e) { /* silent */ }
  return `## Post-Incident Debrief\n\n**Incident:** ${incident.type} in ${incident.zone}\n\n**Status:** ${incident.status}\n\nAI debrief unavailable. Please document manually.\n\n**Tasks completed:** ${tasks.filter(t => t.is_complete).length}/${tasks.length}\n\n**Messages exchanged:** ${messages.length}`;
}

async function generateGuestFollowup(incident) {
  const prompt = `Write a professional, empathetic follow-up message from a hotel manager to a guest who was involved in or affected by an emergency incident. Include: acknowledgment of the incident, apology, what actions were taken, and an appropriate compensation offer. Keep it under 150 words.

Incident type: ${incident.type}, Zone: ${incident.zone}, Severity: ${incident.severity}
Guest name: ${incident.reporter_name || 'Valued Guest'}`;

  try {
    if (process.env.ANTHROPIC_API_KEY) {
      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-api-key': process.env.ANTHROPIC_API_KEY, 'anthropic-version': '2023-06-01' },
        body: JSON.stringify({ model: 'claude-haiku-4-5', max_tokens: 250, messages: [{ role: 'user', content: prompt }] }),
      });
      const d = await res.json();
      return d.content[0].text;
    }
    if (process.env.GEMINI_API_KEY) {
      const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
      const m = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });
      const r = await m.generateContent(prompt);
      return r.response.text();
    }
  } catch (e) { /* silent */ }
  return `Dear ${incident.reporter_name || 'Valued Guest'},\n\nWe sincerely apologize for the distressing experience during your stay. Our team responded promptly to the ${incident.type} incident in the ${incident.zone} area. Your safety is our highest priority.\n\nAs a gesture of goodwill, we would like to offer you a complimentary night's stay during your next visit.\n\nWarm regards,\nHotel Management`;
}

module.exports = { analyzeIncident, tryTranslation, getDispatchRecommendation, generateDebrief, generateGuestFollowup };
