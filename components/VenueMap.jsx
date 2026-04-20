'use client';
import { useEffect, useRef, useState } from 'react';

export default function VenueMap({ zones = [], incidents = [], selectedZone, onZoneClick }) {
  const [tooltip, setTooltip] = useState(null);

  const activeByZone = {};
  for (const inc of incidents) {
    if (inc.status !== 'resolved') {
      activeByZone[inc.zone] = (activeByZone[inc.zone] || 0) + 1;
    }
  }

  const getSeverityForZone = (zoneName) => {
    const zoneIncs = incidents.filter(i => i.zone === zoneName && i.status !== 'resolved');
    if (!zoneIncs.length) return null;
    if (zoneIncs.some(i => i.severity === 'critical')) return 'critical';
    if (zoneIncs.some(i => i.severity === 'high')) return 'high';
    if (zoneIncs.some(i => i.severity === 'medium')) return 'medium';
    return 'low';
  };

  const sevColors = {
    critical: { fill: 'rgba(230,57,70,0.4)',  stroke: '#E63946', glow: true },
    high:     { fill: 'rgba(244,162,97,0.3)', stroke: '#F4A261', glow: false },
    medium:   { fill: 'rgba(250,204,21,0.25)',stroke: '#FACC15', glow: false },
    low:      { fill: 'rgba(45,198,83,0.2)',  stroke: '#2DC653', glow: false },
  };

  return (
    <div className="relative select-none">
      <svg
        viewBox="0 0 830 500"
        className="w-full rounded-xl border border-white/10"
        style={{ background: 'linear-gradient(135deg, #0d1220 0%, #141929 100%)' }}
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Background grid */}
        <defs>
          <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
            <path d="M 40 0 L 0 0 0 40" fill="none" stroke="rgba(255,255,255,0.03)" strokeWidth="1"/>
          </pattern>
          <filter id="glow">
            <feGaussianBlur stdDeviation="4" result="coloredBlur"/>
            <feMerge><feMergeNode in="coloredBlur"/><feMergeNode in="SourceGraphic"/></feMerge>
          </filter>
        </defs>
        <rect width="830" height="500" fill="url(#grid)" />

        {/* Floor label */}
        <text x="20" y="30" fill="rgba(255,255,255,0.2)" fontSize="11" fontFamily="Inter, sans-serif" fontWeight="600">
          Grand Hotel — Emergency Overlay
        </text>

        {/* Floor sections */}
        <text x="20" y="130" fill="rgba(255,255,255,0.2)" fontSize="9" fontFamily="monospace">ROOMS</text>
        <text x="20" y="250" fill="rgba(255,255,255,0.2)" fontSize="9" fontFamily="monospace">AMENITIES</text>
        <text x="20" y="370" fill="rgba(255,255,255,0.2)" fontSize="9" fontFamily="monospace">GROUND</text>

        {zones.map(zone => {
          if (!zone.map_x) return null;
          const sev = getSeverityForZone(zone.name);
          const cfg = sev ? sevColors[sev] : null;
          const isSelected = selectedZone === zone.name;
          const count = activeByZone[zone.name] || 0;

          return (
            <g
              key={zone.id}
              onClick={() => onZoneClick?.(zone.name)}
              style={{ cursor: 'pointer' }}
              onMouseEnter={(e) => {
                const rect = e.currentTarget.closest('svg').getBoundingClientRect();
                setTooltip({ name: zone.name, x: zone.map_x + zone.map_width / 2, y: zone.map_y, count, sev });
              }}
              onMouseLeave={() => setTooltip(null)}
            >
              <rect
                x={zone.map_x}
                y={zone.map_y}
                width={zone.map_width}
                height={zone.map_height}
                rx={6}
                fill={cfg ? cfg.fill : (isSelected ? 'rgba(69,123,157,0.2)' : 'rgba(255,255,255,0.03)')}
                stroke={cfg ? cfg.stroke : (isSelected ? '#457B9D' : 'rgba(255,255,255,0.1)')}
                strokeWidth={isSelected ? 2 : 1}
                filter={cfg?.glow ? 'url(#glow)' : undefined}
              />
              {/* Zone name */}
              <text
                x={zone.map_x + zone.map_width / 2}
                y={zone.map_y + zone.map_height / 2 - (count > 0 ? 6 : 0)}
                textAnchor="middle"
                dominantBaseline="middle"
                fill={sev ? (sev === 'critical' ? '#FF8080' : '#FACC15') : 'rgba(255,255,255,0.7)'}
                fontSize={zone.map_width > 100 ? '10' : '8'}
                fontFamily="Inter, sans-serif"
                fontWeight="500"
              >
                {zone.name}
              </text>
              {/* Active incident count */}
              {count > 0 && (
                <>
                  <text
                    x={zone.map_x + zone.map_width / 2}
                    y={zone.map_y + zone.map_height / 2 + 8}
                    textAnchor="middle"
                    dominantBaseline="middle"
                    fill="rgba(255,255,255,0.5)"
                    fontSize="8"
                    fontFamily="Inter, sans-serif"
                  >
                    {count} active
                  </text>
                  {/* Pulsing dot for critical */}
                  {sev === 'critical' && (
                    <circle
                      cx={zone.map_x + zone.map_width - 8}
                      cy={zone.map_y + 8}
                      r="4"
                      fill="#E63946"
                      opacity="0.9"
                    />
                  )}
                </>
              )}
            </g>
          );
        })}

        {/* Tooltip */}
        {tooltip && (
          <g>
            <rect
              x={tooltip.x - 60}
              y={tooltip.y - 36}
              width="120"
              height="26"
              rx="4"
              fill="rgba(20,25,41,0.95)"
              stroke="rgba(255,255,255,0.15)"
              strokeWidth="1"
            />
            <text
              x={tooltip.x}
              y={tooltip.y - 23}
              textAnchor="middle"
              fill="white"
              fontSize="9"
              fontFamily="Inter, sans-serif"
              fontWeight="600"
            >
              {tooltip.name} {tooltip.count > 0 ? `— ${tooltip.count} active` : '— clear'}
            </text>
          </g>
        )}

        {/* Legend */}
        {[
          { sev: 'critical', label: 'Critical', color: '#E63946' },
          { sev: 'high',     label: 'High',     color: '#F4A261' },
          { sev: 'medium',   label: 'Medium',   color: '#FACC15' },
          { sev: 'low',      label: 'Low',      color: '#2DC653' },
        ].map((l, i) => (
          <g key={l.sev} transform={`translate(${20 + i * 90}, 460)`}>
            <rect width="12" height="12" rx="2" fill={l.color} opacity="0.4" />
            <rect width="12" height="12" rx="2" fill="none" stroke={l.color} strokeWidth="1.5" />
            <text x="16" y="10" fill="rgba(255,255,255,0.6)" fontSize="9" fontFamily="Inter, sans-serif">{l.label}</text>
          </g>
        ))}
      </svg>
    </div>
  );
}
