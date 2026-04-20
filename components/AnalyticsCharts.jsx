'use client';
import {
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  ResponsiveContainer, Tooltip,
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  LineChart, Line,
} from 'recharts';

const COLORS = {
  fire:       '#E63946',
  medical:    '#F4A261',
  security:   '#457B9D',
  flood:      '#48CAE4',
  evacuation: '#9B59B6',
  other:      '#95A5A6',
};

export function IncidentsByTypeChart({ data = [] }) {
  const radarData = data.map(d => ({ type: d.type, value: d.count }));
  return (
    <ResponsiveContainer width="100%" height={260}>
      <RadarChart data={radarData} cx="50%" cy="50%" outerRadius="70%">
        <PolarGrid stroke="rgba(255,255,255,0.08)" />
        <PolarAngleAxis dataKey="type" tick={{ fill: '#8B9CB6', fontSize: 11 }} />
        <PolarRadiusAxis tick={{ fill: '#8B9CB6', fontSize: 9 }} angle={30} domain={[0, 'auto']} />
        <Radar name="Incidents" dataKey="value" stroke="#457B9D" fill="#457B9D" fillOpacity={0.25} strokeWidth={2} />
        <Tooltip
          contentStyle={{ background: '#1E2640', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8 }}
          labelStyle={{ color: 'white', fontWeight: 600 }}
          itemStyle={{ color: '#8B9CB6' }}
        />
      </RadarChart>
    </ResponsiveContainer>
  );
}

export function ZoneBarChart({ data = [] }) {
  return (
    <ResponsiveContainer width="100%" height={240}>
      <BarChart data={data} layout="vertical" margin={{ left: 8, right: 16 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" horizontal={false} />
        <XAxis type="number" tick={{ fill: '#8B9CB6', fontSize: 10 }} />
        <YAxis type="category" dataKey="zone" width={100} tick={{ fill: '#8B9CB6', fontSize: 10 }} />
        <Tooltip
          contentStyle={{ background: '#1E2640', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8 }}
          itemStyle={{ color: '#8B9CB6' }}
        />
        <Bar dataKey="count" fill="#457B9D" radius={[0, 4, 4, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

export function TrendLineChart({ data = [] }) {
  return (
    <ResponsiveContainer width="100%" height={200}>
      <LineChart data={data} margin={{ left: 0, right: 8 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
        <XAxis dataKey="day" tick={{ fill: '#8B9CB6', fontSize: 10 }} />
        <YAxis tick={{ fill: '#8B9CB6', fontSize: 10 }} />
        <Tooltip
          contentStyle={{ background: '#1E2640', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8 }}
          itemStyle={{ color: '#8B9CB6' }}
        />
        <Line type="monotone" dataKey="count" stroke="#E63946" strokeWidth={2.5} dot={{ fill: '#E63946', r: 3 }} />
      </LineChart>
    </ResponsiveContainer>
  );
}

export function HourlyBarChart({ data = [] }) {
  return (
    <ResponsiveContainer width="100%" height={200}>
      <BarChart data={data} margin={{ left: 0, right: 8 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
        <XAxis dataKey="hour" tick={{ fill: '#8B9CB6', fontSize: 9 }} tickFormatter={h => `${h}:00`} />
        <YAxis tick={{ fill: '#8B9CB6', fontSize: 9 }} />
        <Tooltip
          contentStyle={{ background: '#1E2640', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8 }}
          itemStyle={{ color: '#8B9CB6' }}
          labelFormatter={h => `${h}:00`}
        />
        <Bar dataKey="count" fill="#F4A261" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
