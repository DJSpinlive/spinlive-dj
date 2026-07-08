"use client";

import type { ReactNode } from "react";
import { useId } from "react";

import { cn } from "@/lib/utils";

export type ToggleTone = "default" | "muted";

const TRACK: Record<ToggleTone, { off: string; on: string }> = {
  default: {
    off: "bg-[#1a2338]",
    on: "bg-[#8b5cf6]",
  },
  muted: {
    off: "bg-[#3a3f4d]",
    on: "bg-[#8b5cf6]",
  },
};

export interface ToggleProps {
  checked: boolean;
  onCheckedChange?: (_checked: boolean) => void;
  tone?: ToggleTone;
  disabled?: boolean;
  id?: string;
  labelledBy?: string;
  /** Used when there is no external label element (`labelledBy`) */
  name?: string;
  className?: string;
}

/** Compact (~40×28) switch; knob travel scales with `%` widths. */
export function Toggle({
  checked,
  onCheckedChange,
  tone = "default",
  disabled,
  id,
  labelledBy,
  name,
  className,
}: ToggleProps) {
  const fallbackId = useId();
  const inputId = (id ?? fallbackId).replace(/:/g, "");
  const fallbackName =
    labelledBy === undefined ? (name ?? "Toggle setting") : undefined;

  return (
    <label
      htmlFor={inputId}
      className={cn(
        "relative inline-flex h-7 w-10 min-w-[2.5rem] shrink-0 cursor-pointer items-center rounded-full",
        disabled && "cursor-not-allowed opacity-55",
        className
      )}
    >
      {fallbackName ? <span className="sr-only">{fallbackName}</span> : null}

      <input
        id={inputId}
        type="checkbox"
        role="switch"
        aria-checked={checked}
        aria-labelledby={labelledBy}
        aria-label={labelledBy === undefined ? name : undefined}
        checked={checked}
        disabled={disabled}
        onChange={(event) => {
          if (disabled) return;
          onCheckedChange?.(event.target.checked);
        }}
        className={cn(
          "peer absolute inset-0 z-[1] m-0 h-full w-full cursor-[inherit] appearance-none rounded-full outline-none opacity-0",
          disabled && "cursor-not-allowed"
        )}
      />

      <span
        aria-hidden
        className={cn(
          "pointer-events-none absolute inset-0 rounded-full transition-colors peer-focus-visible:ring-2 peer-focus-visible:ring-[#8b5cf6]/80 peer-focus-visible:ring-offset-2 peer-focus-visible:ring-offset-[#0d1117]",
          checked ? TRACK[tone].on : TRACK[tone].off
        )}
      />

      <span
        aria-hidden
        className={cn(
          "pointer-events-none absolute top-1/2 left-1 size-5 -translate-y-1/2 rounded-full bg-white shadow-[0_1px_2px_rgb(0_0_0/0.35)] transition-[left] duration-200 ease-[cubic-bezier(0.16,1,0.3,1)] motion-reduce:transition-none",
          checked ? "left-[calc(100%-24px)]" : ""
        )}
      />
    </label>
  );
}

export interface ToggleSettingRowProps {
  title: string;
  subtitle?: ReactNode;
  checked: boolean;
  onCheckedChange?: (_checked: boolean) => void;
  tone?: ToggleTone;
  disabled?: boolean;
  withDivider?: boolean;
  toggleId?: string;
  className?: string;
}

/**
 * Label + optional description with a switch. On narrow viewports the control moves under the text so long copy does not crowd the pill.
 */
export function ToggleSettingRow({
  title,
  subtitle,
  checked,
  onCheckedChange,
  tone = "default",
  disabled,
  withDivider,
  toggleId,
  className,
}: ToggleSettingRowProps) {
  const autoId = useId();
  const id = toggleId ?? autoId.replace(/:/g, "");
  const labelId = `${id}-heading`;

  return (
    <div
      className={cn(
        "flex min-h-[58px] flex-col gap-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:gap-6 sm:py-3",
        withDivider && "border-t border-[#1e2536]",
        className
      )}
    >
      <div className="min-w-0 flex-1">
        <p id={labelId} className="font-bold text-[#f5f7ff] sm:text-[15px]">
          {title}
        </p>
        {subtitle ? (
          <div className="mt-1 max-w-prose text-sm leading-relaxed text-[#8e97c4] sm:text-[13px] sm:leading-snug">
            {subtitle}
          </div>
        ) : null}
      </div>
      <div className="-m-1 flex shrink-0 justify-end self-center p-1">
        <Toggle
          id={id}
          tone={tone}
          disabled={disabled}
          labelledBy={labelId}
          checked={checked}
          onCheckedChange={onCheckedChange}
        />
      </div>
    </div>
  );
}
