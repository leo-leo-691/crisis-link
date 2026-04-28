'use client';
import { useEffect } from 'react';

// Safe markdown renderer — builds a React element tree without innerHTML
function MarkdownLine({ line, idx }) {
  // Headings
  if (/^## (.+)/.test(line)) {
    return <h2 key={idx} className="text-base font-bold text-white mt-4 mb-2">{line.slice(3)}</h2>;
  }
  if (/^### (.+)/.test(line)) {
    return <h3 key={idx} className="text-sm font-semibold text-white/90 mt-3 mb-1">{line.slice(4)}</h3>;
  }
  if (/^# (.+)/.test(line)) {
    return <h1 key={idx} className="text-lg font-bold text-white mt-4 mb-2">{line.slice(2)}</h1>;
  }
  // Bullet list
  if (/^[-*] (.+)/.test(line)) {
    return <li key={idx} className="ml-4 list-disc text-white/80">{renderInline(line.slice(2))}</li>;
  }
  // Numbered list
  if (/^\d+\. (.+)/.test(line)) {
    return <li key={idx} className="ml-4 list-decimal text-white/80">{renderInline(line.replace(/^\d+\. /, ''))}</li>;
  }
  // Blank line
  if (!line.trim()) return <br key={idx} />;
  // Normal paragraph
  return <p key={idx} className="text-white/80">{renderInline(line)}</p>;
}

// Render inline bold/italic safely — returns an array of React nodes
function renderInline(text) {
  const parts = [];
  // Split on **bold** or *italic*
  const regex = /(\*\*(.+?)\*\*|\*(.+?)\*)/g;
  let last = 0;
  let match;
  while ((match = regex.exec(text)) !== null) {
    if (match.index > last) parts.push(text.slice(last, match.index));
    if (match[0].startsWith('**')) {
      parts.push(<strong key={match.index} className="text-white font-semibold">{match[2]}</strong>);
    } else {
      parts.push(<em key={match.index} className="text-white/80 italic">{match[3]}</em>);
    }
    last = match.index + match[0].length;
  }
  if (last < text.length) parts.push(text.slice(last));
  return parts;
}

export default function DebriefModal({ report, incidentId, onClose }) {
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

  const lines = (typeof report === 'string' ? report : String(report ?? '')).split('\n');

  return (
    <div className="fixed inset-0 z-[9990] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm fade-in">
      <div className="glass-dark w-full max-w-2xl max-h-[80vh] flex flex-col rounded-2xl overflow-hidden shadow-2xl">
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
        {/* Content — safe rendering, no dangerouslySetInnerHTML */}
        <div className="flex-1 overflow-y-auto p-6">
          {report ? (
            <div className="text-sm space-y-1 leading-relaxed">
              {lines.map((line, idx) => <MarkdownLine key={idx} line={line} idx={idx} />)}
            </div>
          ) : (
            <p className="text-sm text-red-400">⚠️ Debrief generation failed. Please try again.</p>
          )}
        </div>
      </div>
    </div>
  );
}
