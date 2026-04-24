'use client';
import { useState, useEffect, useRef } from 'react';
import useAuthStore from '@/lib/stores/authStore';

export default function CrisisBot({ incidentContext }) {
  const [messages, setMessages] = useState([
    { role: 'bot', text: '👋 I\'m CrisisBot. Ask me anything about emergency protocols, evacuation procedures, or how to handle this incident.' }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const token       = useAuthStore(s => s.token);
  const messagesEnd = useRef(null);

  useEffect(() => {
    messagesEnd.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const send = async (text) => {
    const msg = text || input.trim();
    if (!msg || loading) return;
    setInput('');
    setMessages(prev => [...prev, { role: 'user', text: msg }]);
    setLoading(true);
    try {
      const res = await fetch('/api/crisisbot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ message: msg, context: incidentContext }),
      });
      const data = await res.json();
      setMessages(prev => [...prev, { role: 'bot', text: data.reply || data.error, provider: data.provider }]);
    } catch (e) {
      setMessages(prev => [...prev, { role: 'bot', text: '⚠️ Unable to reach CrisisBot. Check your connection.' }]);
    } finally {
      setLoading(false);
    }
  };

  const QUICK_PROMPTS = [
    'What should I do first?',
    'How do I evacuate safely?',
    'When should I call 911?',
    'What are the SOP steps?',
  ];

  return (
    <div className="glass flex flex-col h-full min-h-[400px]">
      {/* Header */}
      <div className="flex items-center gap-2 px-4 py-3 border-b border-white/10">
        <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
        <span className="font-semibold text-sm">CrisisBot</span>
        <span className="text-xs text-muted font-mono ml-auto">AI-Powered</span>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.map((m, i) => (
          <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`
              max-w-[85%] px-3 py-2 rounded-xl text-sm leading-relaxed
              ${m.role === 'user'
                ? 'bg-steelblue text-white rounded-br-sm'
                : 'bg-white/8 text-white/90 border border-white/10 rounded-bl-sm'
              }
            `}>
              {m.text}
              {m.provider && (
                <span className="block mt-1 text-[10px] text-white/30">
                  via {m.provider === 'fallback' ? 'Smart Fallback' : m.provider}
                </span>
              )}
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex justify-start">
            <div className="bg-white/8 border border-white/10 px-3 py-2 rounded-xl rounded-bl-sm">
              <div className="flex gap-1">
                {[0, 150, 300].map(d => (
                  <div key={d} className="w-1.5 h-1.5 rounded-full bg-muted animate-bounce" style={{ animationDelay: `${d}ms` }} />
                ))}
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEnd} />
      </div>

      {/* Quick prompts */}
      <div className="px-4 pb-2 flex flex-wrap gap-1.5">
        {QUICK_PROMPTS.map(q => (
          <button
            key={q}
            onClick={() => send(q)}
            className="text-xs px-2 py-1 bg-white/6 hover:bg-white/12 border border-white/10 rounded-full text-muted hover:text-white transition-all"
          >
            {q}
          </button>
        ))}
      </div>

      {/* Input */}
      <div className="px-4 pb-4 flex gap-2">
        <input
          className="input-dark flex-1 text-sm"
          placeholder="Ask CrisisBot anything..."
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && send()}
          disabled={loading}
        />
        <button
          onClick={() => send()}
          disabled={loading || !input.trim()}
          className="px-4 py-2 bg-steelblue hover:bg-blue-500 disabled:opacity-40 disabled:cursor-not-allowed rounded-lg text-sm font-semibold transition-colors"
        >
          →
        </button>
      </div>
    </div>
  );
}
