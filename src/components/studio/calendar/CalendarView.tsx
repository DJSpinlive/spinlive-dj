"use client";

import {
  Ban,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Repeat,
  Trash2,
} from "lucide-react";
import { Fragment, useMemo, useState } from "react";

import {
  CardTitle,
  GlassButton,
  Micro,
  SectionCard,
  Toggle,
} from "@/components/studio/ui";
import { cn } from "@/lib/utils";
import {
  useBlockAvailabilitySlotMutation,
  useGetDjAvailabilityRangeQuery,
  useGetUserQuery,
  useRemoveAvailabilityBlockMutation,
  useUpdateAvailabilityMutation,
} from "@/store/api";
import { BookingAvailability } from "@/types/bookings.types";

type ViewMode = "month" | "week";
type CellKind = "booked" | "available" | "blocked";

const EV_STYLES: Record<CellKind, string> = {
  booked: "bg-studio-violet/15 border-studio-violet text-studio-violetB",
  available: "bg-studio-good/10 border-studio-good text-studio-good",
  blocked: "bg-white/5 border-studio-ink3 text-studio-ink3",
};

const LEGEND: { key: CellKind; label: string; swatch: string }[] = [
  { key: "available", label: "Available", swatch: "bg-studio-good" },
  { key: "booked", label: "Booked", swatch: "bg-studio-violet" },
  { key: "blocked", label: "Blocked", swatch: "bg-studio-ink3" },
];

const WEEKDAYS = [
  "sunday",
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
] as const;

const inputCls =
  "rounded-lg border border-studio-line bg-studio-surface px-2.5 py-1.5 text-[12.5px] text-studio-ink focus:border-studio-violet focus:outline-none";

function toIso(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function fmtHm(t: string): string {
  const [h = 0, m = 0] = t.split(":").map(Number);
  const d = new Date();
  d.setHours(h, m, 0, 0);
  return d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
}

function startOfWeek(d: Date): Date {
  const out = new Date(d);
  out.setDate(d.getDate() - d.getDay());
  return out;
}

/** Overlap between a slot ("HH:MM:SS") and a 2-hour grid row starting at `rowHour`. */
function overlapsRow(startTime: string, endTime: string, rowHour: number) {
  const s = Number(startTime.slice(0, 2));
  let e = Number(endTime.slice(0, 2));
  if (e <= s) e += 24; // crosses midnight
  return s < rowHour + 2 && e > rowHour;
}

interface RecurringRow {
  day: (typeof WEEKDAYS)[number];
  on: boolean;
  start: string; // "HH:MM"
  end: string; // "HH:MM"
}

const DEFAULT_RECURRING: RecurringRow[] = WEEKDAYS.map((day) => ({
  day,
  on: false,
  start: "20:00",
  end: "23:59",
}));

export default function CalendarView() {
  const [mode, setMode] = useState<ViewMode>("month");
  const [cursor, setCursor] = useState(() => new Date());
  const [recurring, setRecurring] = useState<RecurringRow[]>(DEFAULT_RECURRING);
  const [blockDate, setBlockDate] = useState(() => toIso(new Date()));
  const [blockStart, setBlockStart] = useState("20:00");
  const [blockEnd, setBlockEnd] = useState("23:59");
  const [blockReason, setBlockReason] = useState("");
  const [notice, setNotice] = useState<string | null>(null);

  const { data: user } = useGetUserQuery();

  const range = useMemo(() => {
    if (mode === "month") {
      const first = new Date(cursor.getFullYear(), cursor.getMonth(), 1);
      const last = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0);
      return { startDate: toIso(first), endDate: toIso(last) };
    }
    const first = startOfWeek(cursor);
    const last = new Date(first);
    last.setDate(first.getDate() + 6);
    return { startDate: toIso(first), endDate: toIso(last) };
  }, [mode, cursor]);

  const {
    data: days = [],
    isLoading,
    isFetching,
  } = useGetDjAvailabilityRangeQuery(
    { djId: user?.id ?? "", ...range },
    { skip: !user?.id }
  );

  const [blockSlot, { isLoading: blocking }] =
    useBlockAvailabilitySlotMutation();
  const [removeBlock, { isLoading: removing }] =
    useRemoveAvailabilityBlockMutation();
  const [updateAvailability, { isLoading: savingRecurring }] =
    useUpdateAvailabilityMutation();

  const byDate = useMemo(() => {
    const m = new Map<string, BookingAvailability>();
    days.forEach((d) => m.set(d.date, d));
    return m;
  }, [days]);

  const shift = (dir: 1 | -1) => {
    setCursor((c) => {
      const next = new Date(c);
      if (mode === "month") next.setMonth(c.getMonth() + dir, 1);
      else next.setDate(c.getDate() + dir * 7);
      return next;
    });
  };

  const onBlock = async () => {
    setNotice(null);
    try {
      await blockSlot({
        date: blockDate,
        startTime: `${blockStart}:00`,
        endTime: `${blockEnd}:00`,
        ...(blockReason.trim() ? { reason: blockReason.trim() } : {}),
      }).unwrap();
      setBlockReason("");
      setNotice("Time slot blocked.");
    } catch {
      setNotice("Could not block that slot — check it doesn't clash.");
    }
  };

  const onSaveRecurring = async () => {
    setNotice(null);
    try {
      await updateAvailability({
        slots: recurring
          .filter((r) => r.on)
          .map((r) => ({
            day: r.day,
            startTime: `${r.start}:00`,
            endTime: `${r.end}:00`,
          })),
      }).unwrap();
      setNotice("Recurring availability saved.");
    } catch {
      setNotice("Could not save recurring availability.");
    }
  };

  /* ---- month grid ---- */
  const firstDow = new Date(
    cursor.getFullYear(),
    cursor.getMonth(),
    1
  ).getDay();
  const daysInMonth = new Date(
    cursor.getFullYear(),
    cursor.getMonth() + 1,
    0
  ).getDate();
  const todayIso = toIso(new Date());

  const cells: { key: string; iso: string | null; day: number | null }[] = [
    ...Array.from({ length: firstDow }, (_, i) => ({
      key: `lead-${i}`,
      iso: null,
      day: null,
    })),
    ...Array.from({ length: daysInMonth }, (_, i) => {
      const d = new Date(cursor.getFullYear(), cursor.getMonth(), i + 1);
      return { key: `day-${i + 1}`, iso: toIso(d), day: i + 1 };
    }),
  ];
  while (cells.length % 7 !== 0) {
    cells.push({ key: `trail-${cells.length}`, iso: null, day: null });
  }

  /* ---- week grid ---- */
  const weekStart = startOfWeek(cursor);
  const weekDays = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart);
    d.setDate(weekStart.getDate() + i);
    return d;
  });
  const ROW_HOURS = [14, 16, 18, 20, 22, 0];

  const monthLabel = cursor.toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });
  const weekLabel = `${weekDays[0].toLocaleDateString("en-US", { month: "short", day: "numeric" })} – ${weekDays[6].toLocaleDateString("en-US", { month: "short", day: "numeric" })}`;

  return (
    <div>
      <div className="mb-5 flex flex-wrap items-center gap-3.5">
        <div>
          <h1 className="text-[22px] font-bold tracking-tight">Calendar</h1>
          <p className="mt-0.5 text-[13px] text-studio-ink2">
            Your schedule and availability at a glance.
          </p>
        </div>
        <div className="ml-auto flex items-center gap-3">
          {isFetching && !isLoading ? (
            <Loader2 size={15} className="animate-spin text-studio-ink3" />
          ) : null}
          <div className="flex items-center gap-1">
            <button
              type="button"
              aria-label="Previous period"
              onClick={() => shift(-1)}
              className="grid h-8 w-8 place-items-center rounded-lg border border-studio-line bg-white/5 text-studio-ink2 hover:text-studio-ink"
            >
              <ChevronLeft size={15} />
            </button>
            <span className="w-44 text-center text-[15px] font-bold">
              {mode === "month" ? monthLabel : weekLabel}
            </span>
            <button
              type="button"
              aria-label="Next period"
              onClick={() => shift(1)}
              className="grid h-8 w-8 place-items-center rounded-lg border border-studio-line bg-white/5 text-studio-ink2 hover:text-studio-ink"
            >
              <ChevronRight size={15} />
            </button>
          </div>
          <div className="flex gap-1 rounded-2xl border border-studio-line bg-white/[0.03] p-1">
            {(["week", "month"] as ViewMode[]).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setMode(m)}
                className={cn(
                  "rounded-xl px-3.5 py-1.5 text-[12.5px] font-bold capitalize",
                  mode === m
                    ? "bg-studio-surface2 shadow"
                    : "text-studio-ink2 hover:text-studio-ink"
                )}
              >
                {m}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="mb-3 flex flex-wrap gap-4">
        {LEGEND.map((l) => (
          <span
            key={l.key}
            className="flex items-center gap-1.5 text-[11.5px] font-semibold text-studio-ink2"
          >
            <span className={cn("h-2.5 w-2.5 rounded-sm", l.swatch)} />{" "}
            {l.label}
          </span>
        ))}
      </div>

      {isLoading ? (
        <SectionCard>
          <div className="flex items-center justify-center gap-2 py-16 text-[13px] text-studio-ink2">
            <Loader2 size={16} className="animate-spin" /> Loading your
            calendar…
          </div>
        </SectionCard>
      ) : mode === "month" ? (
        <div className="grid grid-cols-7 gap-px overflow-hidden rounded-2xl border border-studio-line bg-studio-line">
          {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
            <div
              key={d}
              className="bg-studio-surface p-2 text-center text-[10.5px] font-extrabold uppercase tracking-widest text-studio-ink3"
            >
              {d}
            </div>
          ))}
          {cells.map(({ key, iso, day }) => {
            const info = iso ? byDate.get(iso) : undefined;
            const blocked = info?.blockedSlots ?? [];
            const booked = info?.bookedSlots ?? [];
            return (
              <button
                type="button"
                key={key}
                disabled={!iso}
                onClick={() => iso && setBlockDate(iso)}
                className={cn(
                  "min-h-[96px] bg-studio-surface p-2 text-left text-[11.5px]",
                  iso && "hover:bg-white/[0.03]",
                  blocked.length > 0 && booked.length === 0 && "bg-[#0A0E15]"
                )}
              >
                {day !== null ? (
                  <>
                    <span
                      className={cn(
                        "font-bold text-studio-ink2",
                        iso === todayIso &&
                          "inline-grid h-[22px] w-[22px] place-items-center rounded-full bg-studio-violet text-white"
                      )}
                    >
                      {day}
                    </span>
                    {booked.map((s) => (
                      <div
                        key={`b-${s.startTime}`}
                        className={cn(
                          "mt-1 truncate rounded-md border-l-[3px] px-1.5 py-0.5 text-[10.5px] font-bold",
                          EV_STYLES.booked
                        )}
                      >
                        {fmtHm(s.startTime)} · Booked
                      </div>
                    ))}
                    {blocked.map((s) => (
                      <div
                        key={`x-${s.id}`}
                        className={cn(
                          "mt-1 truncate rounded-md border-l-[3px] px-1.5 py-0.5 text-[10.5px] font-bold",
                          EV_STYLES.blocked
                        )}
                        title={s.reason}
                      >
                        {fmtHm(s.startTime)} · {s.reason || "Blocked"}
                      </div>
                    ))}
                  </>
                ) : null}
              </button>
            );
          })}
        </div>
      ) : (
        <div className="grid grid-cols-[52px_repeat(7,1fr)] gap-px overflow-hidden rounded-2xl border border-studio-line bg-studio-line">
          <div className="bg-studio-surface" />
          {weekDays.map((d) => (
            <div
              key={d.toISOString()}
              className="bg-studio-surface p-2 text-center"
            >
              <div className="text-[9px] font-extrabold uppercase tracking-widest text-studio-ink3">
                {d.toLocaleDateString("en-US", { weekday: "short" })}
              </div>
              <div
                className={cn(
                  "text-[15px] font-extrabold tabular-nums",
                  toIso(d) === todayIso && "text-studio-violetB"
                )}
              >
                {d.getDate()}
              </div>
            </div>
          ))}
          {ROW_HOURS.map((rowHour) => (
            <Fragment key={rowHour}>
              <div className="bg-studio-surface px-1.5 py-1 text-right text-[10px] tabular-nums text-studio-ink3">
                {rowHour === 0
                  ? "12 AM"
                  : rowHour < 12
                    ? `${rowHour} AM`
                    : `${rowHour === 12 ? 12 : rowHour - 12} PM`}
              </div>
              {weekDays.map((d) => {
                const info = byDate.get(toIso(d));
                const booked = (info?.bookedSlots ?? []).find((s) =>
                  overlapsRow(s.startTime, s.endTime, rowHour || 24)
                );
                const blocked = (info?.blockedSlots ?? []).find((s) =>
                  overlapsRow(s.startTime, s.endTime, rowHour || 24)
                );
                const ev = booked
                  ? { kind: "booked" as const, label: "Booked" }
                  : blocked
                    ? {
                        kind: "blocked" as const,
                        label: blocked.reason || "Blocked",
                      }
                    : null;
                return (
                  <div
                    key={`${rowHour}-${d.toISOString()}`}
                    className="relative min-h-[46px] bg-studio-surface"
                  >
                    {ev ? (
                      <div
                        className={cn(
                          "absolute inset-0.5 overflow-hidden rounded-lg border-l-[3px] px-2 py-1 text-[10.5px] font-bold",
                          EV_STYLES[ev.kind]
                        )}
                      >
                        {ev.label}
                      </div>
                    ) : null}
                  </div>
                );
              })}
            </Fragment>
          ))}
        </div>
      )}

      {notice ? (
        <p className="mt-3 text-[12.5px] font-semibold text-studio-ink2">
          {notice}
        </p>
      ) : null}

      <div className="mt-4 grid grid-cols-2 items-start gap-4 max-lg:grid-cols-1">
        {/* Block a slot */}
        <SectionCard>
          <CardTitle>
            <Ban size={14} className="text-studio-violetB" /> Block a Time Slot
          </CardTitle>
          <Micro className="mb-3">
            Fans can&apos;t request bookings inside blocked slots. Click a day
            on the calendar to prefill the date.
          </Micro>
          <div className="flex flex-wrap items-end gap-2.5">
            <label
              htmlFor="block-date"
              className="flex flex-col gap-1 text-xs font-bold text-studio-ink2"
            >
              Date
              <input
                id="block-date"
                type="date"
                value={blockDate}
                onChange={(e) => setBlockDate(e.target.value)}
                className={inputCls}
              />
            </label>
            <label
              htmlFor="block-start"
              className="flex flex-col gap-1 text-xs font-bold text-studio-ink2"
            >
              From
              <input
                id="block-start"
                type="time"
                value={blockStart}
                onChange={(e) => setBlockStart(e.target.value)}
                className={inputCls}
              />
            </label>
            <label
              htmlFor="block-end"
              className="flex flex-col gap-1 text-xs font-bold text-studio-ink2"
            >
              To
              <input
                id="block-end"
                type="time"
                value={blockEnd}
                onChange={(e) => setBlockEnd(e.target.value)}
                className={inputCls}
              />
            </label>
            <label
              htmlFor="block-reason"
              className="flex min-w-40 flex-1 flex-col gap-1 text-xs font-bold text-studio-ink2"
            >
              Reason (optional)
              <input
                id="block-reason"
                value={blockReason}
                onChange={(e) => setBlockReason(e.target.value)}
                maxLength={500}
                placeholder="Vacation, day off…"
                className={inputCls}
              />
            </label>
            <GlassButton
              variant="primary"
              disabled={blocking || !user}
              onClick={onBlock}
            >
              {blocking ? <Loader2 size={14} className="animate-spin" /> : null}
              Block
            </GlassButton>
          </div>

          {/* Existing blocks in the visible range */}
          {days.some((d) => d.blockedSlots.length > 0) ? (
            <div className="mt-4">
              <Micro className="mb-2">Blocked in this view</Micro>
              {days
                .filter((d) => d.blockedSlots.length > 0)
                .flatMap((d) =>
                  d.blockedSlots.map((s) => (
                    <div
                      key={s.id}
                      className="flex items-center gap-2.5 border-b border-studio-line py-2 text-[12.5px] last:border-b-0"
                    >
                      <span className="font-bold tabular-nums">{d.date}</span>
                      <span className="text-studio-ink2 tabular-nums">
                        {fmtHm(s.startTime)} – {fmtHm(s.endTime)}
                      </span>
                      {s.reason ? (
                        <span className="truncate text-studio-ink3">
                          {s.reason}
                        </span>
                      ) : null}
                      <button
                        type="button"
                        aria-label="Remove block"
                        disabled={removing}
                        onClick={() => removeBlock(s.id)}
                        className="ml-auto grid h-7 w-7 place-items-center rounded-lg text-studio-ink3 hover:bg-white/5 hover:text-studio-bad disabled:opacity-50"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  ))
                )}
            </div>
          ) : null}
        </SectionCard>

        {/* Recurring availability */}
        <SectionCard>
          <CardTitle
            action={
              <GlassButton
                variant="primary"
                className="!px-3 !py-1.5 text-xs"
                disabled={savingRecurring}
                onClick={onSaveRecurring}
              >
                {savingRecurring ? (
                  <Loader2 size={13} className="animate-spin" />
                ) : null}
                Save
              </GlassButton>
            }
          >
            <Repeat size={14} className="text-studio-violetB" /> Recurring
            Availability
          </CardTitle>
          {recurring.map((r, i) => (
            <div
              key={r.day}
              className="flex items-center gap-3 border-b border-studio-line py-2 last:border-b-0"
            >
              <span className="w-[88px] text-[12.5px] font-bold capitalize">
                {r.day}
              </span>
              {r.on ? (
                <span className="flex flex-1 items-center gap-1.5 text-xs tabular-nums text-studio-ink2">
                  <input
                    type="time"
                    value={r.start}
                    aria-label={`${r.day} start time`}
                    onChange={(e) =>
                      setRecurring((rs) =>
                        rs.map((x, j) =>
                          j === i ? { ...x, start: e.target.value } : x
                        )
                      )
                    }
                    className={inputCls}
                  />
                  –
                  <input
                    type="time"
                    value={r.end}
                    aria-label={`${r.day} end time`}
                    onChange={(e) =>
                      setRecurring((rs) =>
                        rs.map((x, j) =>
                          j === i ? { ...x, end: e.target.value } : x
                        )
                      )
                    }
                    className={inputCls}
                  />
                </span>
              ) : (
                <span className="flex-1 text-xs text-studio-ink3">
                  Not available
                </span>
              )}
              <Toggle
                checked={r.on}
                label={`Toggle availability on ${r.day}`}
                onChange={(v) =>
                  setRecurring((rs) =>
                    rs.map((x, j) => (j === i ? { ...x, on: v } : x))
                  )
                }
              />
            </div>
          ))}
        </SectionCard>
      </div>
    </div>
  );
}
