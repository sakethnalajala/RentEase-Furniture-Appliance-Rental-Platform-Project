'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { motion } from 'framer-motion';

// Lightweight in-house charts (no external chart lib) built per the dataviz method:
// one axis, sequential single-hue for magnitude, fixed never-cycled categorical order for
// identity, thin marks, rounded data-ends, a hover tooltip, and a legend for anything with
// 2+ series. Every palette below was run through the dataviz skill's validate_palette.js
// against this app's actual light (#ffffff) / dark (#05070f) surfaces before use.

// Status identity — fixed, validated for both surfaces:
//   light: rose #f43f5e -> brand #6366f1 -> emerald #10b981 -> accent #f97316
//   dark:  rose #f43f5e -> brand #6366f1 -> emerald #059669 -> accent #ea580c
const STATUS_GROUPS = {
  cancelled: { label: 'Cancelled', light: '#f43f5e', dark: '#f43f5e' },
  active: { label: 'Active / In progress', light: '#6366f1', dark: '#6366f1' },
  completed: { label: 'Completed', light: '#10b981', dark: '#059669' },
  pending: { label: 'Pending', light: '#f97316', dark: '#ea580c' },
};

// Generic categorical identity (city/category breakdowns — deliberately NOT the status colors
// above, since the skill reserves status hues for state and warns against reusing them as
// series colors). Fixed order, validated: light passes with a contrast WARN (mitigated here by
// always showing direct labels/legend, per the relief rule); dark passes clean.
//   light: sky #0ea5e9 -> violet #8b5cf6 -> amber #f59e0b -> teal #14b8a6
//   dark:  sky #0284c7 -> violet #7c3aed -> amber #d97706 -> teal #0d9488
export const CATEGORICAL_COLORS = [
  { label: 'Sky', light: '#0ea5e9', dark: '#0284c7' },
  { label: 'Violet', light: '#8b5cf6', dark: '#7c3aed' },
  { label: 'Amber', light: '#f59e0b', dark: '#d97706' },
  { label: 'Teal', light: '#14b8a6', dark: '#0d9488' },
];

// Reads the actual active theme class off <html> so charts drawn with raw hex (SVG/canvas
// can't use Tailwind's `dark:` utilities) still pick the right step — same signal
// tailwind.config.js's darkMode selector uses (.dark / .theme-glass / .theme-midnight all
// count as "dark" for contrast purposes).
function useIsDarkSurface() {
  const [isDark, setIsDark] = useState(false);
  useEffect(() => {
    const root = document.documentElement;
    const check = () =>
      setIsDark(
        root.classList.contains('dark') ||
          root.classList.contains('theme-glass') ||
          root.classList.contains('theme-midnight')
      );
    check();
    const observer = new MutationObserver(check);
    observer.observe(root, { attributes: true, attributeFilter: ['class'] });
    return () => observer.disconnect();
  }, []);
  return isDark;
}

function easeOutCubic(t) {
  return 1 - (1 - t) ** 3;
}

// Animated count-up for KPI numbers — re-triggers whenever `value` changes (e.g. a filter
// swap), not just on mount.
export function useCountUp(value, duration = 1000) {
  const [display, setDisplay] = useState(0);
  const fromRef = useRef(0);

  useEffect(() => {
    const from = fromRef.current;
    const to = Number(value) || 0;
    if (from === to) return undefined;
    let raf;
    const start = performance.now();
    const tick = (now) => {
      const progress = Math.min(1, (now - start) / duration);
      const current = from + (to - from) * easeOutCubic(progress);
      setDisplay(current);
      if (progress < 1) {
        raf = requestAnimationFrame(tick);
      } else {
        fromRef.current = to;
      }
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  return display;
}

export function CountUpNumber({ value, decimals = 0, prefix = '', suffix = '', duration = 1000 }) {
  const display = useCountUp(value, duration);
  return (
    <>
      {prefix}
      {display.toLocaleString('en-IN', { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}
      {suffix}
    </>
  );
}

export function MagnitudeBarChart({ data, valueSuffix = '', formatValue }) {
  const max = Math.max(...data.map((d) => d.value), 1);

  return (
    <div className="space-y-3">
      {data.map((d) => {
        const pct = Math.max(4, Math.round((d.value / max) * 100));
        return (
          <div key={d.label} className="group">
            <div className="mb-1 flex items-center justify-between text-xs">
              <span className="truncate font-medium text-slate-600 dark:text-slate-300">{d.label}</span>
              <span className="shrink-0 font-semibold text-slate-900 dark:text-white">
                {formatValue ? formatValue(d.value) : d.value.toLocaleString('en-IN')}
                {valueSuffix}
              </span>
            </div>
            <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-white/10">
              <div
                className="h-full rounded-full bg-gradient-to-r from-brand-500 to-brand-400 transition-[width] duration-500"
                style={{ width: `${pct}%` }}
                title={`${d.label}: ${formatValue ? formatValue(d.value) : d.value}`}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

export function StatusBreakdownChart({ counts }) {
  const total = Object.values(counts).reduce((a, b) => a + b, 0) || 1;
  const entries = Object.entries(STATUS_GROUPS).map(([key, meta]) => ({
    key,
    ...meta,
    value: counts[key] || 0,
    pct: Math.round(((counts[key] || 0) / total) * 100),
  }));

  return (
    <div>
      <div className="flex h-3 w-full overflow-hidden rounded-full">
        {entries.map((e) => (
          <div
            key={e.key}
            className="h-full first:rounded-l-full last:rounded-r-full"
            style={{ width: `${Math.max(e.pct, e.value > 0 ? 2 : 0)}%`, backgroundColor: e.light }}
            title={`${e.label}: ${e.value} (${e.pct}%)`}
          />
        ))}
      </div>
      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {entries.map((e) => (
          <div key={e.key} className="flex items-center gap-2">
            <span
              className="h-2.5 w-2.5 shrink-0 rounded-full dark:hidden"
              style={{ backgroundColor: e.light }}
            />
            <span
              className="hidden h-2.5 w-2.5 shrink-0 rounded-full dark:inline-block"
              style={{ backgroundColor: e.dark }}
            />
            <div className="min-w-0">
              <p className="truncate text-xs font-medium text-slate-600 dark:text-slate-300">{e.label}</p>
              <p className="text-xs font-semibold text-slate-900 dark:text-white">
                {e.value} <span className="font-normal text-slate-400">({e.pct}%)</span>
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// Generic vertical bar chart — used for Weekly Orders, Monthly Orders, Monthly Revenue,
// Revenue Comparison, Rental Duration Analysis, etc. Single hue (magnitude), one axis.
export function WeeklyTrendChart({ weeks, formatValue }) {
  const max = Math.max(...weeks.map((w) => w.value), 1);

  return (
    <div className="flex h-40 items-end gap-2">
      {weeks.map((w) => {
        const pct = Math.max(6, Math.round((w.value / max) * 100));
        return (
          <div key={w.label} className="group flex flex-1 flex-col items-center gap-1.5">
            <span className="text-[11px] font-semibold text-slate-700 opacity-0 transition-opacity group-hover:opacity-100 dark:text-slate-200">
              {formatValue ? formatValue(w.value) : w.value}
            </span>
            <div className="flex h-32 w-full items-end">
              <motion.div
                initial={{ height: 0 }}
                animate={{ height: `${pct}%` }}
                transition={{ duration: 0.6, ease: 'easeOut' }}
                className="w-full rounded-t-md bg-gradient-to-t from-brand-600 to-accent-500"
                title={`${w.label}: ${formatValue ? formatValue(w.value) : w.value}`}
              />
            </div>
            <span className="text-[10px] text-slate-400">{w.label}</span>
          </div>
        );
      })}
    </div>
  );
}

// Single-series line chart with an optional area fill — Revenue Line Chart, Orders Trend,
// Inventory Growth, Customer Growth, Yearly Revenue. One axis, one sequential hue, animated
// draw-in, hover crosshair + tooltip (the interactive layer the skill asks for by default).
export function LineAreaChart({ data, height = 220, area = true, formatValue, hue = '#6366f1' }) {
  const [hoverIndex, setHoverIndex] = useState(null);
  const svgRef = useRef(null);
  const width = 600; // viewBox units — scales responsively via the SVG's own width:100%
  const padding = { top: 16, right: 12, bottom: 24, left: 12 };
  const plotW = width - padding.left - padding.right;
  const plotH = height - padding.top - padding.bottom;

  const max = Math.max(...data.map((d) => d.value), 1);
  const min = Math.min(...data.map((d) => d.value), 0);
  const range = max - min || 1;

  const points = data.map((d, i) => ({
    x: padding.left + (i / Math.max(1, data.length - 1)) * plotW,
    y: padding.top + plotH - ((d.value - min) / range) * plotH,
    ...d,
  }));

  const linePath = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
  const areaPath = `${linePath} L ${points[points.length - 1].x} ${padding.top + plotH} L ${points[0].x} ${padding.top + plotH} Z`;

  const handleMove = (e) => {
    const rect = svgRef.current.getBoundingClientRect();
    const relX = ((e.clientX - rect.left) / rect.width) * width;
    let closest = 0;
    let closestDist = Infinity;
    points.forEach((p, i) => {
      const d = Math.abs(p.x - relX);
      if (d < closestDist) {
        closestDist = d;
        closest = i;
      }
    });
    setHoverIndex(closest);
  };

  const hovered = hoverIndex !== null ? points[hoverIndex] : null;
  const gradientId = useMemo(() => `lineArea-${Math.random().toString(36).slice(2, 9)}`, []);
  const labelStep = Math.ceil(data.length / 6);

  return (
    <div className="relative">
      <svg
        ref={svgRef}
        viewBox={`0 0 ${width} ${height}`}
        className="w-full touch-none"
        onMouseMove={handleMove}
        onMouseLeave={() => setHoverIndex(null)}
      >
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={hue} stopOpacity="0.35" />
            <stop offset="100%" stopColor={hue} stopOpacity="0" />
          </linearGradient>
        </defs>

        {/* Recessive gridlines */}
        {[0.25, 0.5, 0.75].map((f) => (
          <line
            key={f}
            x1={padding.left}
            x2={width - padding.right}
            y1={padding.top + plotH * f}
            y2={padding.top + plotH * f}
            className="stroke-slate-200 dark:stroke-white/10"
            strokeWidth="1"
          />
        ))}

        {area && (
          <motion.path
            d={areaPath}
            fill={`url(#${gradientId})`}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.8 }}
          />
        )}

        <motion.path
          d={linePath}
          fill="none"
          stroke={hue}
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 1, ease: 'easeInOut' }}
        />

        {hovered && (
          <>
            <line
              x1={hovered.x}
              x2={hovered.x}
              y1={padding.top}
              y2={padding.top + plotH}
              className="stroke-slate-300 dark:stroke-white/20"
              strokeWidth="1"
              strokeDasharray="3 3"
            />
            <circle cx={hovered.x} cy={hovered.y} r="5" fill={hue} className="stroke-white dark:stroke-slate-900" strokeWidth="2" />
          </>
        )}

        {points.map((p, i) =>
          i % labelStep === 0 ? (
            <text key={p.label} x={p.x} y={height - 4} textAnchor="middle" className="fill-slate-400 text-[9px]">
              {p.label}
            </text>
          ) : null
        )}
      </svg>

      {hovered && (
        <div
          className="pointer-events-none absolute -translate-x-1/2 -translate-y-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs shadow-lg dark:border-white/10 dark:bg-slate-900"
          style={{ left: `${(hovered.x / width) * 100}%`, top: `${(hovered.y / height) * 100 - 4}%` }}
        >
          <p className="font-semibold text-slate-900 dark:text-white">
            {formatValue ? formatValue(hovered.value) : hovered.value.toLocaleString('en-IN')}
          </p>
          <p className="text-[10px] text-slate-400">{hovered.label}</p>
        </div>
      )}
    </div>
  );
}

// Pie AND doughnut are the same ring-segment math with one difference (stroke width) — donut
// leaves a hole, pie fills to center. Categorical color, legend, hover tooltip.
export function PieDonutChart({ data, donut = true, size = 200 }) {
  const isDark = useIsDarkSurface();
  const [hoverIndex, setHoverIndex] = useState(null);
  const rawTotal = data.reduce((sum, d) => sum + d.value, 0);
  const total = rawTotal || 1; // avoids /0 in the segment math below without faking a nonzero display total
  const radius = size / 2;
  const strokeWidth = donut ? radius * 0.42 : radius;
  const innerRadius = radius - strokeWidth / 2;
  const circumference = 2 * Math.PI * innerRadius;

  let cumulative = 0;
  const segments = data.map((d, i) => {
    const pct = d.value / total;
    const segment = {
      ...d,
      pct,
      color: CATEGORICAL_COLORS[i % CATEGORICAL_COLORS.length][isDark ? 'dark' : 'light'],
      dasharray: `${pct * circumference} ${circumference - pct * circumference}`,
      dashoffset: -cumulative * circumference,
    };
    cumulative += pct;
    return segment;
  });

  return (
    <div className="flex flex-col items-center gap-5 sm:flex-row sm:items-center">
      <div className="relative shrink-0" style={{ width: size, height: size }}>
        <svg viewBox={`0 0 ${size} ${size}`} className="-rotate-90">
          {!donut && <circle cx={radius} cy={radius} r={innerRadius} className="fill-slate-100 dark:fill-white/5" />}
          {segments.map((s, i) => (
            <motion.circle
              key={s.label}
              cx={radius}
              cy={radius}
              r={innerRadius}
              fill="none"
              stroke={s.color}
              strokeWidth={strokeWidth}
              strokeDasharray={s.dasharray}
              initial={{ strokeDashoffset: 0, opacity: 0 }}
              animate={{ strokeDashoffset: s.dashoffset, opacity: hoverIndex === null || hoverIndex === i ? 1 : 0.35 }}
              transition={{ duration: 0.8, delay: i * 0.08 }}
              onMouseEnter={() => setHoverIndex(i)}
              onMouseLeave={() => setHoverIndex(null)}
              className="cursor-pointer transition-opacity"
            />
          ))}
        </svg>
        {donut && (
          <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
            <p className="font-display text-xl font-bold text-slate-900 dark:text-white">
              {hoverIndex !== null ? `${Math.round(segments[hoverIndex].pct * 100)}%` : rawTotal.toLocaleString('en-IN')}
            </p>
            <p className="text-[10px] text-slate-400">{hoverIndex !== null ? segments[hoverIndex].label : 'Total'}</p>
          </div>
        )}
      </div>

      <div className="grid flex-1 grid-cols-1 gap-2 sm:grid-cols-2">
        {segments.map((s, i) => (
          <button
            key={s.label}
            type="button"
            onMouseEnter={() => setHoverIndex(i)}
            onMouseLeave={() => setHoverIndex(null)}
            className={`flex items-center gap-2 rounded-lg px-2 py-1.5 text-left transition-colors ${
              hoverIndex === i ? 'bg-slate-100 dark:bg-white/10' : ''
            }`}
          >
            <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: s.color }} />
            <div className="min-w-0">
              <p className="truncate text-xs font-medium text-slate-600 dark:text-slate-300">{s.label}</p>
              <p className="text-xs font-semibold text-slate-900 dark:text-white">
                {s.value.toLocaleString('en-IN')} <span className="font-normal text-slate-400">({Math.round(s.pct * 100)}%)</span>
              </p>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

// Circular gauge for a single 0-100 style metric (Vendor Performance Score, Conversion Rate,
// Inventory Utilization). Sequential hue, animated fill, count-up center label.
export function ProgressRing({ value, max = 100, label, size = 150, suffix = '%', hue = '#6366f1' }) {
  const pct = Math.max(0, Math.min(1, value / max));
  const radius = size / 2;
  const strokeWidth = size * 0.11;
  const innerRadius = radius - strokeWidth / 2;
  const circumference = 2 * Math.PI * innerRadius;
  const animated = useCountUp(value);

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative" style={{ width: size, height: size }}>
        <svg viewBox={`0 0 ${size} ${size}`} className="-rotate-90">
          <circle cx={radius} cy={radius} r={innerRadius} fill="none" strokeWidth={strokeWidth} className="stroke-slate-100 dark:stroke-white/10" />
          <motion.circle
            cx={radius}
            cy={radius}
            r={innerRadius}
            fill="none"
            stroke={hue}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeDasharray={circumference}
            initial={{ strokeDashoffset: circumference }}
            animate={{ strokeDashoffset: circumference * (1 - pct) }}
            transition={{ duration: 1, ease: 'easeOut' }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <p className="font-display text-2xl font-bold text-slate-900 dark:text-white">
            {Math.round(animated)}
            {suffix}
          </p>
        </div>
      </div>
      {label && <p className="text-center text-xs font-medium text-slate-500 dark:text-slate-400">{label}</p>}
    </div>
  );
}
