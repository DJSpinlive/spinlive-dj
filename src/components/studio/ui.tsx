"use client";

import { LucideIcon } from "lucide-react";
import { ReactNode } from "react";

import { cn } from "@/lib/utils";

/* ---------- Card ---------- */
export function SectionCard({
  className,
  children,
}: {
  className?: string;
  children: ReactNode;
}) {
  return (
    <div
      className={cn(
        "rounded-2xl border border-studio-line bg-studio-card p-[18px] backdrop-blur-sm",
        className
      )}
    >
      {children}
    </div>
  );
}

export function CardTitle({
  children,
  action,
  className,
}: {
  children: ReactNode;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "mb-3.5 flex items-center gap-2 text-[13px] font-bold",
        className
      )}
    >
      {children}
      {action ? <span className="ml-auto">{action}</span> : null}
    </div>
  );
}

export function Micro({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "text-[10.5px] font-bold uppercase tracking-[0.14em] text-studio-ink3",
        className
      )}
    >
      {children}
    </div>
  );
}

/* ---------- Pills ---------- */
const pillStyles = {
  good: "bg-studio-good/15 text-studio-good",
  warn: "bg-studio-warn/15 text-studio-warn",
  bad: "bg-studio-bad/15 text-studio-bad",
  info: "bg-studio-blue/15 text-studio-blue",
  violet: "bg-studio-violet/15 text-studio-violetB",
  muted: "bg-white/5 text-studio-ink2",
  live: "bg-studio-live text-white",
} as const;

export type PillTone = keyof typeof pillStyles;

export function Pill({
  tone = "muted",
  children,
  className,
}: {
  tone?: PillTone;
  children: ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-bold",
        pillStyles[tone],
        className
      )}
    >
      {children}
    </span>
  );
}

/* ---------- KPI card ---------- */
export function KpiCard({
  label,
  value,
  delta,
  deltaUp,
  sub,
  hero,
  extra,
}: {
  label: string;
  value: string;
  delta?: string;
  deltaUp?: boolean;
  sub?: string;
  hero?: boolean;
  extra?: ReactNode;
}) {
  return (
    <div
      className={cn(
        "rounded-2xl border p-4 backdrop-blur-sm",
        hero
          ? "border-studio-violet/30 bg-gradient-to-br from-studio-violet/20 to-studio-pink/[0.08]"
          : "border-studio-line bg-studio-card"
      )}
    >
      <Micro>{label}</Micro>
      <div className="mt-1.5 text-2xl font-extrabold tracking-tight tabular-nums">
        {value}
      </div>
      <div className="mt-0.5 flex items-center gap-1.5 text-[11.5px] font-semibold">
        {delta ? (
          <span className={deltaUp ? "text-studio-good" : "text-studio-bad"}>
            {deltaUp ? "▲" : "▼"} {delta}
          </span>
        ) : null}
        {sub ? <span className="text-studio-ink3">{sub}</span> : null}
        {extra}
      </div>
    </div>
  );
}

/* ---------- Avatar ---------- */
export function InitialsAvatar({
  initials,
  hue = 258,
  size = 34,
  className,
}: {
  initials: string;
  hue?: number;
  size?: number;
  className?: string;
}) {
  return (
    <span
      aria-hidden
      className={cn(
        "grid flex-none place-items-center rounded-full font-extrabold text-white",
        className
      )}
      style={{
        width: size,
        height: size,
        fontSize: size * 0.34,
        background: `linear-gradient(135deg, hsl(${hue} 70% 50%), hsl(${hue + 40} 80% 62%))`,
      }}
    >
      {initials}
    </span>
  );
}

/* ---------- Toggle switch ---------- */
export function Toggle({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (_v: boolean) => void;
  label: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={cn(
        "relative h-[21px] w-[38px] flex-none rounded-full border transition-colors",
        checked
          ? "border-studio-violet bg-studio-violet"
          : "border-studio-line2 bg-studio-surface2"
      )}
    >
      <span
        className={cn(
          "absolute left-[2px] top-[2px] h-[15px] w-[15px] rounded-full transition-transform",
          checked ? "translate-x-[17px] bg-white" : "bg-studio-ink2"
        )}
      />
    </button>
  );
}

/* ---------- Empty state ---------- */
export function EmptyState({
  icon: Icon,
  title,
  detail,
}: {
  icon: LucideIcon;
  title: string;
  detail?: string;
}) {
  return (
    <div className="py-9 text-center text-studio-ink3">
      <span className="mx-auto mb-2.5 grid h-11 w-11 place-items-center rounded-full bg-white/5">
        <Icon size={18} />
      </span>
      <p className="text-[13px] font-semibold text-studio-ink2">{title}</p>
      {detail ? <p className="mt-0.5 text-xs">{detail}</p> : null}
    </div>
  );
}

/* ---------- Buttons ----------
 * Shared variant system (matches the app-wide button spec):
 * primary  — solid #8b5cf6 → hover #7c4ddb
 * gradient — CTA gradient #8a63ff→#6f56f3 → hover #9b7bff→#7b66ff
 * default  — secondary/outline: #051122 bg, #142544 border → hover #2e4d88
 */
export function GlassButton({
  children,
  onClick,
  className,
  variant = "default",
  disabled,
}: {
  children: ReactNode;
  onClick?: () => void;
  className?: string;
  variant?: "default" | "primary" | "gradient" | "danger" | "good";
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2 text-[13px] font-bold transition-all disabled:cursor-not-allowed disabled:opacity-60",
        variant === "default" &&
          "border border-studio-btnBorder bg-studio-btnBg text-studio-btnText hover:border-studio-btnBorderHover",
        variant === "primary" &&
          "bg-studio-violet text-white shadow-[0_4px_16px_rgba(139,92,246,0.35)] hover:bg-studio-violetHover",
        variant === "gradient" &&
          "bg-studio-grad text-white shadow-[0_4px_16px_rgba(139,92,246,0.35)] hover:bg-studio-grad-hover",
        variant === "danger" &&
          "border border-studio-live/35 bg-studio-live/15 text-[#FDA4AF] hover:bg-studio-live/25",
        variant === "good" &&
          "border border-studio-good/30 bg-studio-good/10 text-studio-good hover:bg-studio-good/20",
        className
      )}
    >
      {children}
    </button>
  );
}
