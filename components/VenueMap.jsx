'use client';
import { useState, useEffect } from 'react';

export default function VenueMap({ incidents = [], zones: initialZones = null, onZoneClick }) {
  const [zones, setZones] = useState(Array.isArray(initialZones) ? initialZones : []);
  const [loading, setLoading] = useState(!Array.isArray(initialZones));
  const [hoveredZone, setHoveredZone] = useState(null);

  // Expose a method to trigger a re-fetch (used by Settings after Add Zone)
  const fetchZones = () => {
    setLoading(true);
    fetch('/api/zones')
      .then(r => r.json())
      .then(data => {
        setZones(Array.isArray(data) ? data : []);
        setLoading(false);
      })
      .catch(err => {
        console.error('Failed to load zones:', err);
        setLoading(false);
      });
  };

  useEffect(() => {
    if (Array.isArray(initialZones)) {
      setZones(initialZones);
      setLoading(false);
      return undefined;
    }
    fetchZones();
  }, [initialZones]);

  // Auto-assign grid coordinates to zones that have none (newly created zones)
  function assignFallbackCoords(zoneList) {
    const COLS = 4;
    const CELL_W = 180;
    const CELL_H = 100;
    const START_X = 20;
    const START_Y = 520; // Move below the hardcoded 500px canvas
    const GAP = 16;
    let idx = 0;
    return zoneList.map(zone => {
      if (zone.map_x != null && zone.map_width != null) return zone;
      const col = idx % COLS;
      const row = Math.floor(idx / COLS);
      idx++;
      return {
        ...zone,
        map_x: START_X + col * (CELL_W + GAP),
        map_y: START_Y + row * (CELL_H + GAP),
        map_width: CELL_W,
        map_height: CELL_H,
        isFallback: true,
      };
    });
  }

  function getZoneSeverity(zoneName) {
    const zoneIncidents = incidents.filter(
      i => i.zone === zoneName && i.status !== 'resolved' && !i.is_drill
    );
    if (zoneIncidents.some(i => i.severity === 'critical')) return 'critical';
    if (zoneIncidents.some(i => i.severity === 'high')) return 'high';
    if (zoneIncidents.some(i => i.severity === 'medium')) return 'medium';
    if (zoneIncidents.some(i => i.severity === 'low')) return 'low';
    return 'none';
  }

  function getZoneFill(severity) {
    const fills = {
      critical: 'rgba(230,57,70,0.35)',
      high: 'rgba(244,162,97,0.35)',
      medium: 'rgba(250,204,21,0.30)',
      low: 'rgba(69,123,157,0.30)',
      none: 'rgba(255,255,255,0.06)'
    };
    return fills[severity] || fills.none;
  }

  function getZoneStroke(severity) {
    const strokes = {
      critical: 'rgba(230,57,70,0.9)',
      high: 'rgba(244,162,97,0.9)',
      medium: 'rgba(250,204,21,0.9)',
      low: 'rgba(69,123,157,0.9)',
      none: 'rgba(255,255,255,0.15)'
    };
    return strokes[severity] || strokes.none;
  }

  function getActiveIncidentsInZone(zoneName) {
    return incidents.filter(
      i => i.zone === zoneName && i.status !== 'resolved' && !i.is_drill
    );
  }

  if (loading) {
    return (
      <div className="w-full h-full flex items-center justify-center">
        <div className="text-white/40 text-sm animate-pulse">Loading venue map...</div>
      </div>
    );
  }

  if (zones.length === 0) {
    return (
      <div className="w-full h-full flex items-center justify-center">
        <div className="text-white/40 text-sm">No zones configured</div>
      </div>
    );
  }

  const renderedZones = assignFallbackCoords(zones);
  
  // Calculate dynamic height to fit new zones at the bottom
  const fallbackCount = renderedZones.filter(z => z.isFallback).length;
  const fallbackRows = Math.ceil(fallbackCount / 4);
  const extraHeight = fallbackRows > 0 ? (fallbackRows * 116) + 40 : 0;
  const totalHeight = 500 + extraHeight;

  return (
    <div className="w-full h-full relative">
      <svg
        viewBox={`0 0 800 ${totalHeight}`}
        className="w-full h-full"
        xmlns="http://www.w3.org/2000/svg"
      >
        <rect width="800" height={totalHeight} fill="#0A0F1E" />

        <defs>
          <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
            <path
              d="M 40 0 L 0 0 0 40"
              fill="none"
              stroke="rgba(255,255,255,0.04)"
              strokeWidth="0.5"
            />
          </pattern>
        </defs>
        <rect width="800" height={totalHeight} fill="url(#grid)" />

        <text
          x="400"
          y="18"
          textAnchor="middle"
          fill="rgba(255,255,255,0.25)"
          fontSize="10"
          fontFamily="monospace"
          letterSpacing="2"
        >
          GRAND HOTEL - LIVE FLOOR PLAN
        </text>

        <text x="20" y="175" fill="rgba(255,255,255,0.20)" fontSize="8" fontFamily="monospace">FLOORS</text>
        <text x="20" y="315" fill="rgba(255,255,255,0.20)" fontSize="8" fontFamily="monospace">AMENITIES</text>
        <text x="20" y="435" fill="rgba(255,255,255,0.20)" fontSize="8" fontFamily="monospace">GROUND</text>

        {renderedZones.map((zone) => {
          const severity = getZoneSeverity(zone.name);
          const fill = getZoneFill(severity);
          const stroke = getZoneStroke(severity);
          const activeIncidents = getActiveIncidentsInZone(zone.name);
          const isHovered = hoveredZone === zone.name;
          const cx = zone.map_x + zone.map_width / 2;
          const cy = zone.map_y + zone.map_height / 2;

          return (
            <g key={zone.id || zone.name}>
              <rect
                x={zone.map_x}
                y={zone.map_y}
                width={zone.map_width}
                height={zone.map_height}
                fill={isHovered ? fill.replace(/[\d.]+\)$/, '0.5)') : fill}
                stroke={stroke}
                strokeWidth={severity !== 'none' ? 1.5 : 0.5}
                rx="6"
                style={{ cursor: 'pointer', transition: 'all 0.2s ease' }}
                onClick={() => onZoneClick && onZoneClick(zone.name)}
                onMouseEnter={() => setHoveredZone(zone.name)}
                onMouseLeave={() => setHoveredZone(null)}
              />

              <text
                x={cx}
                y={cy - (activeIncidents.length > 0 ? 8 : 0)}
                textAnchor="middle"
                dominantBaseline="middle"
                fill="rgba(255,255,255,0.75)"
                fontSize="10"
                fontFamily="monospace"
                style={{ pointerEvents: 'none', userSelect: 'none' }}
              >
                {zone.name}
              </text>

              {activeIncidents.length > 0 && (
                <text
                  x={cx}
                  y={cy + 10}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  fill="rgba(230,57,70,0.9)"
                  fontSize="9"
                  fontFamily="monospace"
                  fontWeight="bold"
                  style={{ pointerEvents: 'none' }}
                >
                  {activeIncidents.length} ACTIVE
                </text>
              )}

              {activeIncidents.length > 0 && (
                <g>
                  <circle
                    className="map-pin"
                    cx={zone.map_x + zone.map_width - 12}
                    cy={zone.map_y + 12}
                    r="6"
                    fill={severity === 'critical' ? '#E63946' : severity === 'high' ? '#F4A261' : '#FACC15'}
                    opacity="0.9"
                  />
                  <circle
                    className="map-pin"
                    cx={zone.map_x + zone.map_width - 12}
                    cy={zone.map_y + 12}
                    r="6"
                    fill={severity === 'critical' ? '#E63946' : severity === 'high' ? '#F4A261' : '#FACC15'}
                    opacity="0.4"
                  >
                    <animate
                      attributeName="r"
                      values="6;14;6"
                      dur="2s"
                      repeatCount="indefinite"
                    />
                    <animate
                      attributeName="opacity"
                      values="0.4;0;0.4"
                      dur="2s"
                      repeatCount="indefinite"
                    />
                  </circle>
                </g>
              )}
            </g>
          );
        })}

        {hoveredZone && (
          <g>
            <rect
              x="10"
              y={totalHeight - 30}
              width="200"
              height="22"
              fill="rgba(0,0,0,0.8)"
              rx="4"
            />
            <text
              x="20"
              y={totalHeight - 15}
              fill="white"
              fontSize="11"
              fontFamily="monospace"
            >
              {hoveredZone} - Click to view incidents
            </text>
          </g>
        )}
      </svg>
    </div>
  );
}
