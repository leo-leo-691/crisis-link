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

  // CATEGORY AUTO-ASSIGNMENT
  function getCategory(name) {
    const n = name.toLowerCase();
    if (n.includes('floor') || n.includes('level') || n.includes('roof')) return 'FLOORS';
    if (['lobby', 'front desk', 'restaurant', 'kitchen', 'bar', 'lounge', 'parking'].some(k => n.includes(k))) return 'GROUND';
    return 'AMENITIES';
  }

  // AUTO-LAYOUT ALGORITHM
  function generateAutoLayout(zoneList) {
    const CELL_W = 160;
    const CELL_H = 90;
    const GAP_X = 16;
    const GAP_Y = 16;
    const START_X = 55;
    const COLS = 4;

    // Natural sort so "Floor 10" comes after "Floor 2"
    const sorted = [...zoneList].sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }));

    const groups = {
      FLOORS: [],
      AMENITIES: [],
      GROUND: []
    };

    sorted.forEach(z => {
      groups[getCategory(z.name)].push(z);
    });

    let currentY = 50;
    const renderData = [];

    ['FLOORS', 'AMENITIES', 'GROUND'].forEach(cat => {
      const items = groups[cat];
      if (items.length === 0) return;

      const rows = Math.ceil(items.length / COLS);
      const groupHeight = rows * CELL_H + (rows - 1) * GAP_Y;

      // Add Category Label on the left
      renderData.push({
        type: 'label',
        id: `label-${cat}`,
        text: cat,
        x: 20,
        y: currentY + (groupHeight / 2)
      });

      items.forEach((zone, idx) => {
        const col = idx % COLS;
        const row = Math.floor(idx / COLS);
        renderData.push({
          type: 'zone',
          id: zone.id || zone.name,
          data: {
            ...zone,
            map_x: START_X + col * (CELL_W + GAP_X),
            map_y: currentY + row * (CELL_H + GAP_Y),
            map_width: CELL_W,
            map_height: CELL_H
          }
        });
      });

      currentY += groupHeight + 40; // 40px gap between sections
    });

    return { renderData, requiredHeight: Math.max(500, currentY + 20) };
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

  const { renderData, requiredHeight } = generateAutoLayout(zones);

  return (
    <div className="w-full h-full relative">
      <svg
        viewBox={`0 0 800 ${requiredHeight}`}
        className="w-full h-full"
        xmlns="http://www.w3.org/2000/svg"
      >
        <rect width="800" height={requiredHeight} fill="#0A0F1E" />

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
        <rect width="800" height={requiredHeight} fill="url(#grid)" />

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

        {renderData.map((item) => {
          if (item.type === 'label') {
            return (
              <text
                key={item.id}
                x={item.x}
                y={item.y}
                transform={`rotate(-90 ${item.x} ${item.y})`}
                textAnchor="middle"
                fill="rgba(255,255,255,0.20)"
                fontSize="10"
                fontFamily="monospace"
                letterSpacing="2"
              >
                {item.text}
              </text>
            );
          }

          if (item.type === 'zone') {
            const zone = item.data;
            const severity = getZoneSeverity(zone.name);
            const fill = getZoneFill(severity);
            const stroke = getZoneStroke(severity);
            const activeIncidents = getActiveIncidentsInZone(zone.name);
            const isHovered = hoveredZone === zone.name;
            const cx = zone.map_x + zone.map_width / 2;
            const cy = zone.map_y + zone.map_height / 2;

            return (
              <g key={item.id}>
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
          }
          return null;
        })}

        {hoveredZone && (
          <g>
            <rect
              x="10"
              y={requiredHeight - 30}
              width="200"
              height="22"
              fill="rgba(0,0,0,0.8)"
              rx="4"
            />
            <text
              x="20"
              y={requiredHeight - 15}
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
