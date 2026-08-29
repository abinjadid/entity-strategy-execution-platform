"use client";

// =============================================================================
// الرسوم البيانية — Recharts بألوان الهوية.
// الألوان الأساسية تحمل السلسلة الرئيسية، والثانوية تدعمها دون أن تنافسها.
// =============================================================================

import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Radar,
  RadarChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

export const SERIES = ["#2a206a", "#1d9af2", "#1cc182", "#852cd0", "#00abaf", "#ffa300", "#594aff", "#5d6167"];

const AXIS = { fontSize: 11.5, fill: "#767286", fontFamily: "inherit" };
const GRID = "#e2e0e8";

const tooltipStyle = {
  contentStyle: {
    borderRadius: 10,
    border: "1px solid #e2e0e8",
    fontSize: 12.5,
    fontFamily: "inherit",
    direction: "rtl" as const,
    padding: "8px 12px",
  },
  labelStyle: { fontWeight: 700, color: "#1a1730", marginBottom: 4 },
  itemStyle: { padding: "1px 0" },
};

export function ChartFrame({
  height = 280,
  children,
}: {
  height?: number;
  children: React.ReactElement;
}) {
  return (
    <div style={{ height }} className="w-full">
      <ResponsiveContainer width="100%" height="100%">
        {children}
      </ResponsiveContainer>
    </div>
  );
}

// ------------------------------------------------- أعمدة: الفعلي مقابل المخطط

export function ActualVsPlannedBar({
  data,
  height = 300,
}: {
  data: Array<{ name: string; actual: number; planned: number; color?: string }>;
  height?: number;
}) {
  return (
    <ChartFrame height={height}>
      <BarChart data={data} margin={{ top: 8, right: 8, left: 8, bottom: 8 }} barGap={4}>
        <CartesianGrid strokeDasharray="3 3" stroke={GRID} vertical={false} />
        <XAxis dataKey="name" tick={AXIS} axisLine={{ stroke: GRID }} tickLine={false} interval={0} height={52} />
        <YAxis tick={AXIS} axisLine={false} tickLine={false} domain={[0, 100]} width={38} unit="%" />
        <Tooltip {...tooltipStyle} formatter={(v) => `${Math.round(Number(v))}%`} />
        <Legend
          wrapperStyle={{ fontSize: 12, paddingTop: 8, fontFamily: "inherit" }}
          formatter={(v) => (v === "actual" ? "الإنجاز الفعلي" : "الإنجاز المخطط")}
        />
        <Bar dataKey="planned" fill="#c3c1cc" radius={[4, 4, 0, 0]} maxBarSize={26} />
        <Bar dataKey="actual" fill="#2a206a" radius={[4, 4, 0, 0]} maxBarSize={26}>
          {data.map((d, i) => (
            <Cell key={i} fill={d.color ?? SERIES[i % SERIES.length]} />
          ))}
        </Bar>
      </BarChart>
    </ChartFrame>
  );
}

// ------------------------------------------------------------ خط زمني للاتجاه

export function TrendChart({
  data,
  height = 280,
  keys,
}: {
  data: Array<Record<string, string | number | null>>;
  height?: number;
  keys: Array<{ key: string; label: string; color: string; dashed?: boolean }>;
}) {
  return (
    <ChartFrame height={height}>
      <LineChart data={data} margin={{ top: 8, right: 12, left: 8, bottom: 4 }}>
        <CartesianGrid strokeDasharray="3 3" stroke={GRID} vertical={false} />
        <XAxis dataKey="label" tick={AXIS} axisLine={{ stroke: GRID }} tickLine={false} />
        <YAxis tick={AXIS} axisLine={false} tickLine={false} width={44} />
        <Tooltip {...tooltipStyle} />
        <Legend
          wrapperStyle={{ fontSize: 12, paddingTop: 8, fontFamily: "inherit" }}
          formatter={(v) => keys.find((k) => k.key === v)?.label ?? v}
        />
        {keys.map((k) => (
          <Line
            key={k.key}
            type="monotone"
            dataKey={k.key}
            stroke={k.color}
            strokeWidth={2.2}
            strokeDasharray={k.dashed ? "5 4" : undefined}
            dot={{ r: 2.5, strokeWidth: 0, fill: k.color }}
            activeDot={{ r: 4.5 }}
            connectNulls
          />
        ))}
      </LineChart>
    </ChartFrame>
  );
}

// ------------------------------------------------------------- مساحة تراكمية

export function AreaTrend({
  data,
  height = 240,
  dataKey,
  color = "#2a206a",
  label,
}: {
  data: Array<Record<string, string | number>>;
  height?: number;
  dataKey: string;
  color?: string;
  label: string;
}) {
  return (
    <ChartFrame height={height}>
      <AreaChart data={data} margin={{ top: 8, right: 12, left: 8, bottom: 4 }}>
        <defs>
          <linearGradient id={`grad-${dataKey}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity={0.28} />
            <stop offset="100%" stopColor={color} stopOpacity={0.02} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke={GRID} vertical={false} />
        <XAxis dataKey="label" tick={AXIS} axisLine={{ stroke: GRID }} tickLine={false} />
        <YAxis tick={AXIS} axisLine={false} tickLine={false} width={44} />
        <Tooltip {...tooltipStyle} formatter={(v) => [`${Math.round(Number(v))}`, label]} />
        <Area
          type="monotone"
          dataKey={dataKey}
          stroke={color}
          strokeWidth={2.2}
          fill={`url(#grad-${dataKey})`}
        />
      </AreaChart>
    </ChartFrame>
  );
}

// ------------------------------------------------------------- رادار النضج

export function MaturityRadar({
  data,
  height = 340,
}: {
  data: Array<{ domain: string; current: number; target: number; previous: number }>;
  height?: number;
}) {
  return (
    <ChartFrame height={height}>
      <RadarChart data={data} outerRadius="72%">
        <PolarGrid stroke={GRID} />
        <PolarAngleAxis dataKey="domain" tick={{ ...AXIS, fontSize: 11 }} />
        <PolarRadiusAxis domain={[0, 5]} tickCount={6} tick={{ ...AXIS, fontSize: 10 }} axisLine={false} />
        <Tooltip {...tooltipStyle} formatter={(v) => Number(v).toFixed(1)} />
        <Legend
          wrapperStyle={{ fontSize: 12, paddingTop: 6, fontFamily: "inherit" }}
          formatter={(v) =>
            v === "current" ? "المستوى الحالي" : v === "target" ? "المستهدف" : "القياس السابق"
          }
        />
        <Radar name="previous" dataKey="previous" stroke="#c3c1cc" fill="#c3c1cc" fillOpacity={0.18} strokeWidth={1.5} />
        <Radar name="target" dataKey="target" stroke="#852cd0" fill="#852cd0" fillOpacity={0.06} strokeWidth={1.8} strokeDasharray="5 4" />
        <Radar name="current" dataKey="current" stroke="#2a206a" fill="#2a206a" fillOpacity={0.2} strokeWidth={2.2} />
      </RadarChart>
    </ChartFrame>
  );
}

// ---------------------------------------------------------- أعمدة أفقية عامة

export function HorizontalBars({
  data,
  height = 300,
  domainMax = 100,
  unit = "%",
}: {
  data: Array<{ name: string; value: number; color?: string }>;
  height?: number;
  domainMax?: number;
  unit?: string;
}) {
  return (
    <ChartFrame height={height}>
      <BarChart
        data={data}
        layout="vertical"
        margin={{ top: 4, right: 16, left: 4, bottom: 4 }}
      >
        <CartesianGrid strokeDasharray="3 3" stroke={GRID} horizontal={false} />
        <XAxis type="number" domain={[0, domainMax]} tick={AXIS} axisLine={false} tickLine={false} unit={unit} />
        <YAxis
          type="category"
          dataKey="name"
          tick={{ ...AXIS, fontSize: 11 }}
          axisLine={false}
          tickLine={false}
          width={150}
        />
        <Tooltip {...tooltipStyle} formatter={(v) => `${Math.round(Number(v))}${unit}`} />
        <Bar dataKey="value" fill="#2a206a" radius={[0, 5, 5, 0]} maxBarSize={20}>
          {data.map((d, i) => (
            <Cell key={i} fill={d.color ?? SERIES[i % SERIES.length]} />
          ))}
        </Bar>
      </BarChart>
    </ChartFrame>
  );
}

// -------------------------------------------------------------- شريط مكدّس

export function StackedStatusBar({
  data,
  height = 260,
  keys,
}: {
  data: Array<Record<string, string | number>>;
  height?: number;
  keys: Array<{ key: string; label: string; color: string }>;
}) {
  return (
    <ChartFrame height={height}>
      <BarChart data={data} margin={{ top: 8, right: 8, left: 8, bottom: 4 }}>
        <CartesianGrid strokeDasharray="3 3" stroke={GRID} vertical={false} />
        <XAxis dataKey="name" tick={{ ...AXIS, fontSize: 11 }} axisLine={{ stroke: GRID }} tickLine={false} interval={0} height={46} />
        <YAxis tick={AXIS} axisLine={false} tickLine={false} width={32} allowDecimals={false} />
        <Tooltip {...tooltipStyle} />
        <Legend
          wrapperStyle={{ fontSize: 12, paddingTop: 8, fontFamily: "inherit" }}
          formatter={(v) => keys.find((k) => k.key === v)?.label ?? v}
        />
        {keys.map((k, i) => (
          <Bar
            key={k.key}
            dataKey={k.key}
            stackId="a"
            fill={k.color}
            maxBarSize={34}
            radius={i === keys.length - 1 ? [4, 4, 0, 0] : undefined}
          />
        ))}
      </BarChart>
    </ChartFrame>
  );
}

// ------------------------------------------------------------ حلقة التوزيع

export function DonutStat({
  segments,
  centerLabel,
  centerValue,
  size = 168,
}: {
  segments: Array<{ label: string; value: number; color: string }>;
  centerLabel: string;
  centerValue: string;
  size?: number;
}) {
  const total = segments.reduce((s, x) => s + x.value, 0) || 1;
  const r = size / 2 - 14;
  const c = 2 * Math.PI * r;
  let offset = 0;

  return (
    <div className="flex items-center gap-5 flex-wrap justify-center">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="shrink-0">
        <g transform={`rotate(-90 ${size / 2} ${size / 2})`}>
          <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#f2f1f6" strokeWidth="14" />
          {segments.map((s, i) => {
            const len = (s.value / total) * c;
            const el = (
              <circle
                key={i}
                cx={size / 2}
                cy={size / 2}
                r={r}
                fill="none"
                stroke={s.color}
                strokeWidth="14"
                strokeDasharray={`${len} ${c - len}`}
                strokeDashoffset={-offset}
                strokeLinecap="butt"
              />
            );
            offset += len;
            return el;
          })}
        </g>
        <text
          x="50%"
          y="46%"
          textAnchor="middle"
          className="fill-ink"
          style={{ fontSize: 25, fontWeight: 700 }}
        >
          {centerValue}
        </text>
        <text
          x="50%"
          y="61%"
          textAnchor="middle"
          className="fill-n500"
          style={{ fontSize: 11.5, fontWeight: 600 }}
        >
          {centerLabel}
        </text>
      </svg>
      <ul className="space-y-2 min-w-[130px]">
        {segments.map((s) => (
          <li key={s.label} className="flex items-center gap-2.5 text-[12.5px]">
            <span className="w-2.5 h-2.5 rounded-sm shrink-0" style={{ background: s.color }} />
            <span className="text-n700 flex-1">{s.label}</span>
            <span className="font-bold text-ink tnum">{s.value}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
