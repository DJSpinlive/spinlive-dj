import type {
  AvailabilityWindow,
  BlockedSlot,
  Booking,
  BookingAvailability,
} from "@/types/bookings.types";

/** Parses `HH:MM:SS` or `HH:MM` to minutes since local midnight (seconds rounded into minutes). */
export function parseTimeOfDayToMinutes(timeOfDay: string): number {
  const [hh = "0", mm = "0", ss = "0"] = timeOfDay
    .split(":")
    .map((part) => part.trim());
  const h = Number(hh);
  const m = Number(mm);
  const s = Number(ss);
  if (Number.isNaN(h + m + s)) return 0;
  return h * 60 + m + Math.round(s / 60);
}

export type BookingListTab = "upcoming" | "pending" | "past";

const PENDING: Booking["status"][] = [
  "pending_dj_review",
  "awaiting_end_user_confirmation",
];

const PAST_STATUSES: Booking["status"][] = [
  "completed",
  "declined_by_end_user",
  "declined_by_dj",
  "cancelled_by_user",
  "cancelled_by_dj",
  "cancelled_by_admin",
];

export function parseBookingStart(b: Booking): Date {
  const [y, m, d] = b.eventDate.split("-").map(Number);
  const minutes = parseTimeOfDayToMinutes(b.startTime);
  const start = new Date(y, (m ?? 1) - 1, d ?? 1, 0, 0, 0, 0);
  start.setMinutes(minutes);
  return start;
}

export function parseBookingEnd(b: Booking): Date {
  const start = parseBookingStart(b);
  const [y, m, d] = b.eventDate.split("-").map(Number);
  const end = new Date(y, (m ?? 1) - 1, d ?? 1, 0, 0, 0, 0);
  end.setMinutes(parseTimeOfDayToMinutes(b.endTime));
  if (end.getTime() <= start.getTime()) {
    end.setDate(end.getDate() + 1);
  }
  return end;
}

export function bookingListTab(b: Booking, now = new Date()): BookingListTab {
  if (PENDING.includes(b.status)) {
    return "pending";
  }
  if (PAST_STATUSES.includes(b.status)) {
    return "past";
  }
  if (b.status === "confirmed") {
    return parseBookingEnd(b) < now ? "past" : "upcoming";
  }
  return "past";
}

export function humanizeEventType(eventType: string): string {
  const t = eventType.trim();
  if (!t) return "Event";
  return t.replace(/_/g, " ").replace(/\b\w/g, (ch) => ch.toUpperCase());
}

export function formatBookingDateTile(b: Booking): {
  month: string;
  day: string;
} {
  const d = parseBookingStart(b);
  return {
    month: d.toLocaleDateString("en-US", { month: "short" }).toUpperCase(),
    day: d.getDate().toString().padStart(2, "0"),
  };
}

export function formatBookingTimeRange(b: Booking): string {
  const a = parseBookingStart(b);
  const z = parseBookingEnd(b);
  const opts: Intl.DateTimeFormatOptions = {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  };
  return `${a.toLocaleTimeString("en-US", opts)} – ${z.toLocaleTimeString("en-US", opts)}`;
}

export function formatBookingWhenLine(b: Booking): string {
  const d = parseBookingStart(b);
  return d.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

export function formatBookingLocation(b: Booking): string {
  if (b.locationType === "virtual") {
    const v = b.venueName?.trim() || b.venueAddress?.trim();
    return v || "Virtual";
  }
  const name = b.venueName?.trim();
  const addr = b.venueAddress?.trim();
  if (name && addr) return `${name}, ${addr}`;
  return name || addr || "Location TBD";
}

export function formatBookingMoney(
  amount: number | null | undefined,
  currency: string
): string {
  if (amount == null || Number.isNaN(amount)) {
    return "—";
  }
  const code = (currency || "USD").toUpperCase();
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: code,
    }).format(amount);
  } catch {
    return `${code} ${amount.toFixed(2)}`;
  }
}

export type BookingUiStatus =
  | "confirmed"
  | "pending"
  | "completed"
  | "cancelled";

export function bookingUiStatus(b: Booking): BookingUiStatus {
  if (PENDING.includes(b.status)) return "pending";
  if (b.status === "confirmed") return "confirmed";
  if (b.status === "completed") return "completed";
  return "cancelled";
}

export function bookingStatusHeadline(b: Booking): string {
  switch (b.status) {
    case "pending_dj_review":
      return "Awaiting DJ";
    case "awaiting_end_user_confirmation":
      return "Awaiting your confirmation";
    case "confirmed":
      return "Confirmed";
    case "completed":
      return "Completed";
    case "declined_by_end_user":
      return "Declined";
    case "declined_by_dj":
      return "Declined by DJ";
    case "cancelled_by_user":
      return "Cancelled";
    case "cancelled_by_dj":
      return "Cancelled by DJ";
    case "cancelled_by_admin":
      return "Cancelled";
    default:
      return b.status;
  }
}

export function inferLocationType(
  location: string
): "virtual" | "venue" | "hybrid" {
  const l = location.toLowerCase();
  if (
    /https?:\/\//.test(l) ||
    l.includes("zoom") ||
    l.includes("meet.google") ||
    l.includes("teams.microsoft") ||
    l.includes("hybrid")
  ) {
    return "virtual";
  }
  return "venue";
}

/** 12h locale label used for DJ availability slot pills. */
export function formatMinutesFromMidnightPickLabel(
  minutesFromMidnight: number
): string {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  const clamped = Math.min(Math.max(minutesFromMidnight, 0), 24 * 60 - 1);
  d.setMinutes(clamped);
  return d.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
}

/** Half-open comparison: spans `[start, end)`. */
export function timeIntervalsOverlapHalfOpen(
  aStart: number,
  aEnd: number,
  bStart: number,
  bEnd: number
): boolean {
  return aStart < bEnd && bStart < aEnd;
}

interface BusyMinuteInterval {
  start: number;
  end: number;
  kind: "booked" | "blocked";
}

/** Booked listed before blocked — first overlapping reason wins when using `.find()`. */
export function busyIntervalsFromBookedAndBlockedSlots(
  booked: AvailabilityWindow[] | undefined,
  blocked: BlockedSlot[] | undefined
): BusyMinuteInterval[] {
  const out: BusyMinuteInterval[] = [];
  booked?.forEach((w) => {
    const s = parseTimeOfDayToMinutes(w.startTime);
    const e = parseTimeOfDayToMinutes(w.endTime);
    if (e > s) out.push({ start: s, end: e, kind: "booked" });
  });
  blocked?.forEach((w) => {
    const s = parseTimeOfDayToMinutes(w.startTime);
    const e = parseTimeOfDayToMinutes(w.endTime);
    if (e > s) out.push({ start: s, end: e, kind: "blocked" });
  });
  return out;
}

export interface AvailabilitySlotPick {
  startMinutesFromMidnight: number;
  label: string;
  disabled: boolean;
  disabledReason?: "booked" | "blocked";
}

export const DEFAULT_BOOKING_SLOT_START_INTERVAL_MINUTES = 60;

/**
 * Build grid from `BookingAvailability.availableSlots[0]` (window for the whole day).
 * Starts every `slotStartIntervalMinutes`; each candidate is checked against booked/blocked overlaps for `bookingDurationMinutes`.
 */
export function buildAvailabilitySlotPicks(
  availability:
    | Pick<
        BookingAvailability,
        "availableSlots" | "bookedSlots" | "blockedSlots"
      >
    | undefined
    | null,
  options: {
    bookingDurationMinutes: number;
    slotStartIntervalMinutes?: number;
  }
): AvailabilitySlotPick[] {
  const slotStep =
    options.slotStartIntervalMinutes ??
    DEFAULT_BOOKING_SLOT_START_INTERVAL_MINUTES;

  const firstWindow = availability?.availableSlots?.[0];
  if (!firstWindow) return [];

  let rangeEnd = parseTimeOfDayToMinutes(firstWindow.endTime);
  const rangeStart = parseTimeOfDayToMinutes(firstWindow.startTime);
  /* Same-day malformed window fallback */
  if (rangeEnd <= rangeStart) {
    rangeEnd = Math.min(rangeStart + slotStep, 24 * 60);
  }

  const busy = busyIntervalsFromBookedAndBlockedSlots(
    availability.bookedSlots,
    availability.blockedSlots
  );

  const usable = rangeEnd - rangeStart;
  const { bookingDurationMinutes } = options;
  if (usable < bookingDurationMinutes || bookingDurationMinutes < 1) {
    return [];
  }

  const count = Math.floor((usable - bookingDurationMinutes) / slotStep) + 1;

  return Array.from({ length: count }, (_, i) => {
    const bookingStart = rangeStart + i * slotStep;
    const bookingEnd = bookingStart + bookingDurationMinutes;
    const blocking = busy.find((chunk) =>
      timeIntervalsOverlapHalfOpen(
        bookingStart,
        bookingEnd,
        chunk.start,
        chunk.end
      )
    );

    return {
      startMinutesFromMidnight: bookingStart,
      label: formatMinutesFromMidnightPickLabel(bookingStart),
      disabled: Boolean(blocking),
      disabledReason: blocking?.kind,
    };
  });
}

export function buildTimeParts(d: Date): {
  hour: number;
  minute: number;
  second: number;
  nano: number;
} {
  return {
    hour: d.getHours(),
    minute: d.getMinutes(),
    second: d.getSeconds(),
    nano: 0,
  };
}

/** Local time on the given date, `HH:MM:SS` (booking API body). */
export function formatLocalTimeHHMMSS(d: Date): string {
  const pad = (n: number) => n.toString().padStart(2, "0");
  return `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

/** Local `{eventDate ISO}` midnight + minutes from midnight (same pattern as `parseBookingStart`). */
export function bookingLocalStartFromEventIsoAndMinuteOfDay(
  eventDateIso: string,
  minuteOfDay: number
): Date {
  const [y, m, d] = eventDateIso.split("-").map(Number);
  const start = new Date(y, (m ?? 1) - 1, d ?? 1, 0, 0, 0, 0);
  start.setMinutes(minuteOfDay);
  return start;
}

export function addMinutesToLocalDate(date: Date, deltaMinutes: number): Date {
  return new Date(date.getTime() + deltaMinutes * 60_000);
}

export function toBookingEventDateIso(d: Date): string {
  const y = d.getFullYear();
  const m = (d.getMonth() + 1).toString().padStart(2, "0");
  const day = d.getDate().toString().padStart(2, "0");
  return `${y}-${m}-${day}`;
}

const CANCELLABLE: Booking["status"][] = [
  "pending_dj_review",
  "awaiting_end_user_confirmation",
  "confirmed",
];

export function bookingCanCancel(b: Booking): boolean {
  return CANCELLABLE.includes(b.status);
}
