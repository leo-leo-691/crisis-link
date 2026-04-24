'use client';
import { useEffect, useRef } from 'react';

// Syntax highlight markdown text for rendering in <pre> blocks
function renderMarkdown(text) {
  // Guard: coerce to string so .replace() never throws on undefined/null
  const safe = typeof text === 'string' ? text : String(text ?? '');
  return safe
    .replace(/^## (.*)/gm, '<h2 class="text-base font-bold text-white mt-4 mb-2">$1</h2>')
    .replace(/^### (.*)/gm, '<h3 class="text-sm font-semibold text-white/90 mt-3 mb-1">$1</h3>')
    .replace(/^# (.*)/gm, '<h1 class="text-lg font-bold text-white mt-4 mb-2">$1</h1>')
    .replace(/\*\*(.*?)\*\*/g, '<strong class="text-white font-semibold">$1</strong>')
    .replace(/\*(.*?)\*/g,   '<em class="text-white/80 italic">$1</em>')
    .replace(/^- (.*)/gm,   '<li class="ml-4 list-disc text-white/80">$1</li>')
    .replace(/^\d+\. (.*)/gm, '<li class="ml-4 list-decimal text-white/80">$1</li>');
}

export default function DebriefModal({ report, incidentId, onClose }) {
  const ref = useRef(null);

  useEffect(() => {
    const handleKey = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [onClose]);

  const handleDownload = () => {
    const blob = new Blob([report], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `debrief-${incidentId}-${Date.now()}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-[9990] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm fade-in">
      <div ref={ref} className="glass-dark w-full max-w-2xl max-h-[80vh] flex flex-col rounded-2xl overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10">
          <div>
            <h2 className="font-bold text-white">📋 AI Post-Incident Debrief</h2>
            <p className="text-xs text-muted mt-0.5">Incident #{incidentId}</p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleDownload}
              className="px-3 py-1.5 text-xs bg-steelblue/30 hover:bg-steelblue/50 border border-steelblue/40 rounded-lg text-white transition-colors"
            >
              ⬇️ Download .md
            </button>
            <button
              onClick={onClose}
              className="px-3 py-1.5 text-xs bg-white/8 hover:bg-white/14 rounded-lg text-muted hover:text-white transition-colors"
            >
              ✕ Close
            </button>
          </div>
        </div>
        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {report ? (
            <div
              className="text-sm text-white/80 space-y-1 leading-relaxed"
              dangerouslySetInnerHTML={{ __html: renderMarkdown(report) }}
            />
          ) : (
            <p className="text-sm text-red-400">⚠️ Debrief generation failed. Please try again.</p>
          )}
        </div>
      </div>
    </div>
  );
}
