'use client';
import { useState } from 'react';

export default function VenueMap({ zones = [], incidents = [], selectedZone, mode = 'live', onZoneClick }) {
  const [tooltip, setTooltip] = useState(null);

  const activeByZone = {};
  for (const inc of incidents) {
    if (inc.status !== 'resolved') {
      activeByZone[inc.zone] = (activeByZone[inc.zone] || 0) + 1;
    }
  }
  const activeNonDrillByZone = {};
  for (const inc of incidents) {
    if (inc.status !== 'resolved' && !inc.is_drill) {
      activeNonDrillByZone[inc.zone] = (activeNonDrillByZone[inc.zone] || 0) + 1;
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
    critical: { fill: 'rgba(230,57,70,0.25)',  stroke: '#E63946', glow: true, pulse: true },
    high:     { fill: 'rgba(244,162,97,0.25)', stroke: '#F4A261', glow: false, pulse: false },
    medium:   { fill: 'rgba(250,204,21,0.20)', stroke: '#FACC15', glow: false, pulse: false },
    low:      { fill: 'rgba(69,123,157,0.20)', stroke: '#457B9D', glow: false, pulse: false },
  };

  const getHeatmapColor = (count, max) => {
    if (!count) return { fill: 'rgba(255,255,255,0.02)', stroke: 'rgba(255,255,255,0.08)' };
    const opacity = Math.min(0.2 + (count / max) * 0.7, 0.8);
    return {
      fill: `rgba(69, 123, 157, ${opacity})`,
      stroke: `rgba(168, 218, 220, ${opacity + 0.1})`,
      glow: opacity > 0.4
    };
  };

  const maxCount = Math.max(...zones.map(z => z.count || 0), 1);

  return (
    <div className="relative select-none overflow-hidden rounded-xl border border-white/5 shadow-2xl">
      <style jsx>{`
        @keyframes scan {
          0% { transform: translateY(-100%); }
          100% { transform: translateY(100%); }
        }
        .scan-line {
          position: absolute;
          width: 100%;
          height: 2px;
          background: linear-gradient(to right, transparent, rgba(69,123,157,0.2), transparent);
          box-shadow: 0 0 15px rgba(69,123,157,0.1);
          animation: scan 8s linear infinite;
          z-index: 5;
          pointer-events: none;
        }
      `}</style>
      
      <div className="scan-line" />

      <svg
        viewBox="0 0 830 500"
        className="w-full bg-[#070b14]"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
            <path d="M 40 0 L 0 0 0 40" fill="none" stroke="rgba(255,255,255,0.03)" strokeWidth="1"/>
          </pattern>
          <pattern id="dots" width="10" height="10" patternUnits="userSpaceOnUse">
            <circle cx="2" cy="2" r="0.5" fill="rgba(255,255,255,0.05)" />
          </pattern>
          <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="6" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
           <linearGradient id="zoneGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="rgba(255,255,255,0.05)" />
            <stop offset="100%" stopColor="rgba(255,255,255,0)" />
          </linearGradient>
        </defs>

        <rect width="830" height="500" fill="url(#grid)" />
        <rect width="830" height="500" fill="url(#dots)" />

        <text x="35" y="42" fill="white" fontSize="12" fontFamily="Inter, sans-serif" fontWeight="700" letterSpacing="1">
          {mode === 'heatmap' ? 'ANALYTICS HEATMAP' : 'E.O.C. OVERLAY'} <tspan fill="rgba(255,255,255,0.4)" fontWeight="400">v2.4.0</tspan>
        </text>

        {zones.map(zone => {
          const zoneName = zone.name || zone.zone;
          if (!zone.map_x) return null;
          
          let cfg;
          let currentCount = 0;

          if (mode === 'heatmap') {
            currentCount = zone.count || 0;
            cfg = getHeatmapColor(currentCount, maxCount);
          } else {
            const sev = getSeverityForZone(zoneName);
            cfg = sev ? sevColors[sev] : { fill: 'rgba(255,255,255,0.05)', stroke: 'rgba(255,255,255,0.10)' };
            currentCount = activeByZone[zoneName] || 0;
          }

          return (
            <g
              key={zone.id || zoneName}
              onClick={() => onZoneClick?.(zoneName)}
              className="transition-all duration-300"
              style={{ cursor: 'pointer' }}
              onMouseEnter={(e) => {
                setTooltip({ name: zoneName, x: zone.map_x + zone.map_width / 2, y: zone.map_y, count: currentCount });
              }}
              onMouseLeave={() => setTooltip(null)}
            >
              {cfg?.pulse && (
                <rect
                  x={zone.map_x - 4}
                  y={zone.map_y - 4}
                  width={zone.map_width + 8}
                  height={zone.map_height + 8}
                  rx={10}
                  fill="none"
                  stroke={cfg.stroke}
                  strokeWidth="2"
                  className="animate-ping"
                  opacity="0.3"
                  style={{ animationDuration: '2s' }}
                />
              )}

              <rect
                x={zone.map_x}
                y={zone.map_y}
                width={zone.map_width}
                height={zone.map_height}
                rx={8}
                fill={cfg.fill}
                stroke={cfg.stroke}
                strokeWidth={cfg.stroke !== 'rgba(255,255,255,0.10)' ? 2 : 1}
                filter={cfg?.glow ? 'url(#glow)' : undefined}
                className="transition-colors duration-500"
              />

              {mode !== 'heatmap' && (activeNonDrillByZone[zoneName] || 0) > 0 && (
                <g>
                  <circle
                    cx={zone.map_x + (zone.map_width / 2)}
                    cy={zone.map_y + (zone.map_height / 2)}
                    r="8"
                    fill={cfg.stroke}
                  />
                  <circle
                    cx={zone.map_x + (zone.map_width / 2)}
                    cy={zone.map_y + (zone.map_height / 2)}
                    r="8"
                    fill={cfg.stroke}
                    className="animate-ping"
                    opacity="0.5"
                  />
                </g>
              )}
              
              <text
                x={zone.map_x + zone.map_width / 2}
                y={zone.map_y + zone.map_height / 2 - (currentCount > 0 ? 8 : 0)}
                textAnchor="middle"
                dominantBaseline="middle"
                fill={cfg?.stroke && mode !== 'heatmap' ? 'white' : 'rgba(255,255,255,0.4)'}
                fontSize="10"
                fontFamily="Inter, sans-serif"
                fontWeight="700"
                className="uppercase tracking-wide"
              >
                {zoneName}
              </text>

              {currentCount > 0 && (
                <g>
                   <rect
                    x={zone.map_x + zone.map_width / 2 - 25}
                    y={zone.map_y + zone.map_height / 2 + 4}
                    width="50"
                    height="14"
                    rx="4"
                    fill="rgba(0,0,0,0.2)"
                  />
                  <text
                    x={zone.map_x + zone.map_width / 2}
                    y={zone.map_y + zone.map_height / 2 + 11}
                    textAnchor="middle"
                    dominantBaseline="middle"
                    fill={cfg?.stroke || 'white'}
                    fontSize="8"
                    fontWeight="800"
                  >
                    {currentCount} {mode === 'heatmap' ? 'TOTAL' : 'ACTIVE'}
                  </text>
                </g>
              )}
            </g>
          );
        })}

        {tooltip && (
          <g>
            <rect
              x={tooltip.x - 70}
              y={tooltip.y - 45}
              width="140"
              height="30"
              rx="6"
              fill="rgba(13,18,32,0.95)"
              stroke="rgba(255,255,255,0.2)"
              strokeWidth="1"
            />
            <text
              x={tooltip.x}
              y={tooltip.y - 25}
              textAnchor="middle"
              fill="white"
              fontSize="10"
              fontWeight="700"
              className="uppercase"
            >
              {tooltip.name} {tooltip.count > 0 ? `× ${tooltip.count}` : ''}
            </text>
          </g>
        )}
      </svg>
    </div>
  );
}
