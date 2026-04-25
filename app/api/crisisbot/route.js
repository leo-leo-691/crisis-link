const { NextResponse } = require('next/server');

const CRISISBOT_SYSTEM = `You are CrisisBot, an AI assistant embedded in a hotel emergency management platform. You help hotel staff and managers make decisions during emergency situations. You know about hotel emergency protocols, fire safety, medical first response, security incident management, evacuation procedures, and guest safety. Be concise, authoritative, and action-oriented. Always prioritize life safety. Do not give legal advice. Respond in 2-4 sentences unless more detail is specifically requested.`;

export async function POST(request) {
  try {
    const { getUserFromRequest } = require('@/lib/auth');
    const user = getUserFromRequest(request);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { message, context } = await request.json();
    if (!message) return NextResponse.json({ error: 'message required' }, { status: 400 });

    const contextStr = context ? `Current incident context: ${JSON.stringify(context)}\n\n` : '';
    const fullMessage = `${contextStr}${message}`;

    // Try Claude then Gemini
    if (process.env.ANTHROPIC_API_KEY) {
      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-api-key': process.env.ANTHROPIC_API_KEY, 'anthropic-version': '2023-06-01' },
        body: JSON.stringify({
          model: 'claude-haiku-4-5', max_tokens: 400,
          system: CRISISBOT_SYSTEM,
          messages: [{ role: 'user', content: fullMessage }],
        }),
      });
      if (res.ok) {
        const d = await res.json();
        return NextResponse.json({ reply: d.content[0].text, provider: 'claude' });
      }
    }

    if (process.env.GEMINI_API_KEY) {
      try {
        const { GoogleGenerativeAI } = require('@google/generative-ai');
        const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
        const model = genAI.getGenerativeModel({ model: 'gemini-3-flash-preview' });
        const r = await model.generateContent(`${CRISISBOT_SYSTEM}\n\nUser: ${fullMessage}`);
        return NextResponse.json({ reply: r.response.text(), provider: 'gemini' });
      } catch (geminiErr) {
        // 429 quota / rate-limit — fall through to keyword fallbacks
        console.warn('[CrisisBot] Gemini failed, using fallback:', geminiErr.message?.slice(0, 120));
      }
    }

    // Smart fallback — comprehensive keyword-based responses for all common queries
    const msg = message.toLowerCase();
    const ctx = context || {};

    const smartFallback = (() => {
      // Evacuation questions
      if (/evacuat|exit|escape|leave|assembly|muster/i.test(msg))
        return `Initiate evacuation immediately via the nearest marked emergency exit — do NOT use elevators. Direct guests to the assembly point at the main car park. Account for all persons and report headcount to the duty manager. Assist mobility-impaired guests using the designated refuge areas.`;

      // 911 / emergency services
      if (/911|ambulance|police|fire.?brigade|emergency.?service|call.?for.?help/i.test(msg))
        return `Call 911 (or local equivalent) immediately if there is any risk to life, fire, or serious injury. Give: location (hotel name, zone, room), nature of emergency, number of people affected, and whether anyone is trapped. Stay on the line and send a staff member to the entrance to meet responders.`;

      // First aid / medical
      if (/medical|first.?aid|injur|unconscious|breathing|cpr|bleed|heart|seizure|allerg/i.test(msg))
        return `Do not move the patient unless there is immediate danger. Call 911 and retrieve the nearest AED/first aid kit. Assign one staff member to monitor the patient, keep the area clear, and send someone to meet paramedics at the building entrance. Document the time the incident began.`;

      // Fire
      if (/fire|smoke|flame|burning|alarm/i.test(msg))
        return `Activate the nearest fire alarm pull station. Do NOT use elevators. Evacuate affected floors immediately. Close doors as you leave to slow fire spread. Meet the fire department at the lobby and provide the floor plan. Do not re-enter the building until the all-clear is given.`;

      // Security / threat
      if (/security|threat|weapon|suspect|fight|intruder|assault|violent|lockdown/i.test(msg))
        return `Do not attempt to confront or restrain the individual. Secure and lock the area, move guests and staff to safety. Call police immediately (911). Preserve all CCTV footage. Do not allow anyone to leave until police arrive. Brief officers on arrival with description and last known location.`;

      // SOP / steps / procedure
      if (/sop|step|procedure|protocol|checklist|what.?do|what.?should|first.?thing/i.test(msg))
        return `Standard response steps: (1) Ensure personal safety first. (2) Alert the duty manager immediately. (3) Call 911 if there is any risk to life. (4) Secure and contain the affected area. (5) Account for all guests and staff. (6) Assign a staff member to meet emergency services. (7) Document all actions with timestamps. (8) Do not speak to media — refer to PR manager.`;

      // Communication / notify
      if (/communicat|notify|inform|contact|radio|report/i.test(msg))
        return `Notify the duty manager via radio or phone first. Use clear language: location, type of incident, severity, and what has been done. Do not speculate — report only confirmed facts. All guest-facing communication should be calm and reassuring. Avoid using public address for security incidents.`;

      // Guest safety
      if (/guest|customer|visitor|patron/i.test(msg))
        return `Prioritise guest safety above all. Move guests away from the hazard zone calmly without causing panic. Do not share incident details with guests — use "precautionary measure" language. Offer assistance to elderly, disabled, or distressed guests. Designated safe areas should be stocked with water and first aid supplies.`;

      // Documentation / report
      if (/document|record|report|log|write|evidence/i.test(msg))
        return `Document all actions immediately with timestamps: who, what, when, where. Preserve physical evidence and CCTV footage. Do not alter or clean the scene before authorities arrive. Complete an incident report within 24 hours. All timeline entries in CrisisLink are auto-logged for your audit trail.`;

      // Containment
      if (/contain|isolat|seal|cordon|perimeter/i.test(msg))
        return `Establish a clear perimeter around the incident zone using staff as visual barriers. Prevent unauthorised access — guests and non-essential staff must not enter. If hazardous materials are involved, increase the exclusion zone and contact specialist services. Keep the area sealed until management or emergency services give clearance.`;

      // Context-aware default based on incident type
      const type = (ctx.type || '').toLowerCase();
      if (type.includes('fire') || type.includes('smoke'))
        return `For this fire/smoke incident: activate alarms, evacuate via stairs only, close doors behind you, meet fire services at the lobby. Do not re-enter until clearance is given.`;
      if (type.includes('medical'))
        return `For this medical incident: call 911, do not move the patient, clear the area, retrieve the AED/first aid kit, and send staff to meet paramedics at the entrance.`;
      if (type.includes('security'))
        return `For this security incident: do not confront the individual, call police, secure the area, and preserve CCTV footage.`;

      // Generic default
      return `Immediate priorities: (1) Ensure your own safety. (2) Alert the duty manager. (3) Call 911 if any life is at risk. (4) Secure the affected area. (5) Document all actions with timestamps in CrisisLink. Stay calm — clear communication is critical in every emergency.`;
    })();

    return NextResponse.json({ reply: smartFallback, provider: 'fallback' });

  } catch (err) {
    console.error('[POST /api/crisisbot]', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
