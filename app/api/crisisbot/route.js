const { NextResponse } = require('next/server');

const CRISISBOT_SYSTEM = `You are CrisisBot, an AI assistant embedded in a hotel emergency management platform. You help hotel staff and managers make decisions during emergency situations. You know about hotel emergency protocols, fire safety, medical first response, security incident management, evacuation procedures, and guest safety. Be concise, authoritative, and action-oriented. Always prioritize life safety. Do not give legal advice. Respond in 2-4 sentences unless more detail is specifically requested.`;

module.exports.POST = async function POST(request) {
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
      const { GoogleGenerativeAI } = require('@google/generative-ai');
      const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
      const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });
      const r = await model.generateContent(`${CRISISBOT_SYSTEM}\n\nUser: ${fullMessage}`);
      return NextResponse.json({ reply: r.response.text(), provider: 'gemini' });
    }

    // Fallback responses
    const fallbacks = {
      medical: 'Call 911 immediately. Do not move the patient unless there is immediate danger. Clear the area and assign someone to meet paramedics at the entrance.',
      fire: 'Activate the nearest fire alarm pull station. Initiate evacuation of affected floors. Do not use elevators. Meet fire department at the lobby.',
      security: 'Secure the area perimeter. Do not confront the individual. Call local police immediately and preserve CCTV footage.',
      default: 'Assess scene safety first. Notify the duty manager. Contact emergency services if there is any risk to life. Document all actions taken.',
    };
    const key = Object.keys(fallbacks).find(k => message.toLowerCase().includes(k)) || 'default';
    return NextResponse.json({ reply: fallbacks[key], provider: 'fallback' });

  } catch (err) {
    console.error('[POST /api/crisisbot]', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
};
