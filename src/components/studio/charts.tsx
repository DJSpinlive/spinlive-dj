"use client";

import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import {
  earningsBySource,
  monthlyComparison,
  revenueTrend,
  weeklyEarnings,
} from "@/lib/studio/data";

/* Validated categorical palette (dark surface #0D1117, worst adjacent CVD ΔE 18.1) */
export const SERIES = ["#8b5cf6", "#0284c7", "#ec4899", "#d97706"] as const;
const GRID = "rgba(255,255,255,0.06)";
const AXIS = "#666B85";

const fmtUsd = (v: number) => `$${v.toLocaleString()}`;

interface TooltipPayloadItem {
  name?: string;
  value?: number | string;
  color?: string;
}

function DarkTooltip({
  active,
  payload,
  label,
  prefix = "$",
}: {
  active?: boolean;
  payload?: TooltipPayloadItem[];
  label?: string | number;
  prefix?: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-studio-line2 bg-studio-surface3 px-3 py-2 text-xs shadow-xl">
      {label !== undefined ? (
        <div className="text-studio-ink2">{label}</div>
      ) : null}
      {payload.map((p) => (
        <div
          key={p.name}
          className="flex items-center gap-2 font-extrabold tabular-nums"
        >
          {p.color ? (
            <span
              className="h-2 w-2 rounded-sm"
              style={{ background: p.color }}
            />
          ) : null}
          {payload.length > 1 ? (
            <span className="font-semibold text-studio-ink2">{p.name}</span>
          ) : null}
          {prefix}
          {Number(p.value).toLocaleString()}
        </div>
      ))}
    </div>
  );
}

const axisTick = { fill: AXIS, fontSize: 11 };

/* ---------- Dashboard: weekly earnings ---------- */
export function WeeklyEarningsChart() {
  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart
        data={weeklyEarnings}
        margin={{ top: 8, right: 4, left: -14, bottom: 0 }}
      >
        <CartesianGrid stroke={GRID} vertical={false} />
        <XAxis
          dataKey="day"
          tickLine={false}
          axisLine={false}
          tick={axisTick}
        />
        <YAxis
          tickLine={false}
          axisLine={false}
          tick={axisTick}
          tickFormatter={(v: number) => (v === 0 ? "0" : `$${v / 1000}k`)}
        />
        <Tooltip
          content={<DarkTooltip />}
          cursor={{ fill: "rgba(255,255,255,0.04)" }}
        />
        <Bar
          dataKey="amount"
          name="Earnings"
          fill={SERIES[0]}
          radius={[4, 4, 0, 0]}
          maxBarSize={34}
        />
      </BarChart>
    </ResponsiveContainer>
  );
}

/* ---------- Earnings: revenue trend ---------- */
export function RevenueTrendChart() {
  return (
    <ResponsiveContainer width="100%" height={240}>
      <AreaChart
        data={revenueTrend}
        margin={{ top: 8, right: 4, left: -8, bottom: 0 }}
      >
        <defs>
          <linearGradient id="revFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={SERIES[0]} stopOpacity={0.35} />
            <stop offset="100%" stopColor={SERIES[0]} stopOpacity={0.02} />
          </linearGradient>
        </defs>
        <CartesianGrid stroke={GRID} vertical={false} />
        <XAxis
          dataKey="month"
          tickLine={false}
          axisLine={false}
          tick={axisTick}
        />
        <YAxis
          tickLine={false}
          axisLine={false}
          tick={axisTick}
          tickFormatter={(v: number) => (v === 0 ? "0" : `$${v / 1000}k`)}
        />
        <Tooltip
          content={<DarkTooltip />}
          cursor={{ stroke: "rgba(255,255,255,0.2)", strokeDasharray: "3 3" }}
        />
        <Area
          type="monotone"
          dataKey="revenue"
          name="Revenue"
          stroke={SERIES[0]}
          strokeWidth={2}
          fill="url(#revFill)"
          activeDot={{ r: 4, strokeWidth: 2, stroke: "#0D1117" }}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}

/* ---------- Earnings: by source donut ---------- */
export function SourceDonut() {
  const total = earningsBySource.reduce((s, d) => s + d.value, 0);
  return (
    <div className="flex items-center gap-5">
      <div className="relative h-[150px] w-[150px] flex-none">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={earningsBySource}
              dataKey="value"
              nameKey="name"
              innerRadius={48}
              outerRadius={70}
              paddingAngle={3}
              strokeWidth={0}
            >
              {earningsBySource.map((d, i) => (
                <Cell key={d.name} fill={SERIES[i]} />
              ))}
            </Pie>
            <Tooltip content={<DarkTooltip />} />
          </PieChart>
        </ResponsiveContainer>
        <div className="pointer-events-none absolute inset-0 grid place-items-center text-center">
          <div>
            <div className="text-[10px] font-bold uppercase tracking-widest text-studio-ink3">
              Total
            </div>
            <div className="text-base font-extrabold tabular-nums">
              {fmtUsd(total)}
            </div>
          </div>
        </div>
      </div>
      <div className="flex flex-1 flex-col gap-2.5">
        {earningsBySource.map((d, i) => (
          <div key={d.name} className="flex items-center gap-2.5 text-[12.5px]">
            <span
              className="h-2.5 w-2.5 flex-none rounded-sm"
              style={{ background: SERIES[i] }}
            />
            <span className="font-semibold">{d.name}</span>
            <span className="ml-auto font-extrabold tabular-nums">
              {Math.round((d.value / total) * 100)}%
            </span>
            <span className="w-16 text-right tabular-nums text-studio-ink2">
              {fmtUsd(d.value)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ---------- Earnings: monthly comparison ---------- */
export function MonthlyComparisonChart() {
  return (
    <div>
      <ResponsiveContainer width="100%" height={210}>
        <BarChart
          data={monthlyComparison}
          margin={{ top: 8, right: 4, left: -14, bottom: 0 }}
          barGap={2}
        >
          <CartesianGrid stroke={GRID} vertical={false} />
          <XAxis
            dataKey="month"
            tickLine={false}
            axisLine={false}
            tick={axisTick}
          />
          <YAxis
            tickLine={false}
            axisLine={false}
            tick={axisTick}
            tickFormatter={(v: number) => (v === 0 ? "0" : `$${v / 1000}k`)}
          />
          <Tooltip
            content={<DarkTooltip />}
            cursor={{ fill: "rgba(255,255,255,0.04)" }}
          />
          <Bar
            dataKey="thisYear"
            name="2026"
            fill={SERIES[0]}
            radius={[4, 4, 0, 0]}
            maxBarSize={18}
          />
          <Bar
            dataKey="lastYear"
            name="2025"
            fill={SERIES[1]}
            radius={[4, 4, 0, 0]}
            maxBarSize={18}
          />
        </BarChart>
      </ResponsiveContainer>
      <div className="mt-2 flex gap-4 text-xs font-semibold text-studio-ink2">
        <span className="flex items-center gap-1.5">
          <span
            className="h-2.5 w-2.5 rounded-sm"
            style={{ background: SERIES[0] }}
          />{" "}
          2026
        </span>
        <span className="flex items-center gap-1.5">
          <span
            className="h-2.5 w-2.5 rounded-sm"
            style={{ background: SERIES[1] }}
          />{" "}
          2025
        </span>
      </div>
    </div>
  );
}

/* ---------- Go Live: live viewers sparkline ---------- */
export function LiveViewersSpark({
  data,
}: {
  data: { t: number; viewers: number }[];
}) {
  return (
    <ResponsiveContainer width="100%" height={90}>
      <AreaChart data={data} margin={{ top: 4, right: 0, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id="sparkFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={SERIES[2]} stopOpacity={0.4} />
            <stop offset="100%" stopColor={SERIES[2]} stopOpacity={0.02} />
          </linearGradient>
        </defs>
        <Tooltip content={<DarkTooltip prefix="" />} cursor={false} />
        <Area
          type="monotone"
          dataKey="viewers"
          name="Viewers"
          stroke={SERIES[2]}
          strokeWidth={2}
          fill="url(#sparkFill)"
          isAnimationActive={false}
          dot={false}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
