'use client';

const fillCountMap = { low: 1, medium: 2, high: 3, critical: 5 };
const colorMap = { low: '#457B9D', medium: '#FACC15', high: '#F4A261', critical: '#E63946' };

export default function SeverityMeter({ severity }) {
  const fillCount = fillCountMap[severity] || 1;
  const color = colorMap[severity] || '#457B9D';

  return (
    <div className="flex items-center gap-1">
      {Array.from({ length: 5 }).map((_, idx) => (
        <div
          key={idx}
          className="w-4 h-2 rounded-sm"
          style={{ background: idx < fillCount ? color : 'rgba(255,255,255,0.15)' }}
        />
      ))}
    </div>
  );
}
