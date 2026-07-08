"use client";

import {
  CalendarCheck,
  Check,
  Loader2,
  MapPin,
  StickyNote,
  Users,
  X,
} from "lucide-react";
import { useMemo, useState } from "react";

import {
  EmptyState,
  GlassButton,
  Micro,
  Pill,
  PillTone,
  SectionCard,
} from "@/components/studio/ui";
import { cn } from "@/lib/utils";
import {
  useCancelBookingMutation,
  useCompleteBookingMutation,
  useGetBookingsQuery,
  useSubmitBookingQuoteMutation,
} from "@/store/api";
import { Booking, BookingStatus } from "@/types/bookings.types";

type TabKey = "upcoming" | "pending" | "past" | "cancelled";

const TABS: { key: TabKey; label: string }[] = [
  { key: "upcoming", label: "Upcoming" },
  { key: "pending", label: "Pending Requests" },
  { key: "past", label: "Past Events" },
  { key: "cancelled", label: "Cancelled" },
];

const STATUS_LABEL: Record<BookingStatus, string> = {
  pending_dj_review: "Needs quote",
  awaiting_end_user_confirmation: "Quote sent",
  confirmed: "Confirmed",
  declined_by_end_user: "Declined by fan",
  declined_by_dj: "Declined",
  cancelled_by_user: "Cancelled by fan",
  cancelled_by_dj: "Cancelled by you",
  cancelled_by_admin: "Cancelled by admin",
  completed: "Completed",
};

const STATUS_TONE: Record<BookingStatus, PillTone> = {
  pending_dj_review: "warn",
  awaiting_end_user_confirmation: "info",
  confirmed: "good",
  declined_by_end_user: "bad",
  declined_by_dj: "bad",
  cancelled_by_user: "bad",
  cancelled_by_dj: "bad",
  cancelled_by_admin: "bad",
  completed: "info",
};

function bucket(b: Booking): TabKey {
  switch (b.status) {
    case "pending_dj_review":
    case "awaiting_end_user_confirmation":
      return "pending";
    case "confirmed":
      return "upcoming";
    case "completed":
      return "past";
    default:
      return "cancelled";
  }
}

function amountOf(b: Booking): number {
  return b.finalAmount ?? b.quotedAmount ?? b.budgetAmount ?? 0;
}

function fmtMoney(n: number, currency = "USD"): string {
  return n.toLocaleString(undefined, {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  });
}

function fmtLongDate(iso: string) {
  return new Date(`${iso}T00:00:00`).toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function fmtTime(t: string) {
  const [h = 0, m = 0] = t.split(":").map(Number);
  const d = new Date();
  d.setHours(h, m, 0, 0);
  return d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
}

function KV({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex justify-between border-b border-studio-line py-1.5 text-[12.5px] last:border-b-0">
      <span className="text-studio-ink2">{k}</span>
      <span className="font-bold tabular-nums">{v}</span>
    </div>
  );
}

export default function BookingsView() {
  const [tab, setTab] = useState<TabKey>("upcoming");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [quoteAmount, setQuoteAmount] = useState("");
  const [quoteDeposit, setQuoteDeposit] = useState("");
  const [quoteNote, setQuoteNote] = useState("");
  const [actionError, setActionError] = useState<string | null>(null);

  const {
    data: bookings = [],
    isLoading,
    isError,
    refetch,
  } = useGetBookingsQuery({});
  const [submitQuote, { isLoading: quoting }] = useSubmitBookingQuoteMutation();
  const [completeBooking, { isLoading: completing }] =
    useCompleteBookingMutation();
  const [cancelBooking, { isLoading: cancelling }] = useCancelBookingMutation();

  const counts = useMemo(() => {
    const c: Record<TabKey, number> = {
      upcoming: 0,
      pending: 0,
      past: 0,
      cancelled: 0,
    };
    bookings.forEach((b) => {
      c[bucket(b)] += 1;
    });
    return c;
  }, [bookings]);

  const visible = bookings.filter((b) => bucket(b) === tab);
  const selected = selectedId
    ? (bookings.find((b) => b.id === selectedId) ?? null)
    : null;

  const closeDrawer = () => {
    setSelectedId(null);
    setQuoteAmount("");
    setQuoteDeposit("");
    setQuoteNote("");
    setActionError(null);
  };

  const onQuote = async (b: Booking) => {
    const quotedAmount = Number(quoteAmount);
    if (!quotedAmount || quotedAmount <= 0) {
      setActionError("Enter a quote amount greater than zero.");
      return;
    }
    const depositAmount = Number(quoteDeposit);
    setActionError(null);
    try {
      await submitQuote({
        id: b.id,
        quotedAmount,
        ...(depositAmount > 0 ? { depositAmount } : {}),
        ...(quoteNote.trim() ? { note: quoteNote.trim() } : {}),
      }).unwrap();
      setQuoteAmount("");
      setQuoteDeposit("");
      setQuoteNote("");
    } catch {
      setActionError("Could not send the quote — please try again.");
    }
  };

  const onComplete = async (b: Booking) => {
    setActionError(null);
    try {
      await completeBooking(b.id).unwrap();
    } catch {
      setActionError("Could not mark this booking completed.");
    }
  };

  const onCancel = async (b: Booking) => {
    // eslint-disable-next-line no-alert
    const reason = window.prompt(
      "Why are you cancelling this booking? The fan will see this."
    );
    if (reason === null) return;
    setActionError(null);
    try {
      await cancelBooking({ id: b.id, reason: reason.trim() }).unwrap();
      closeDrawer();
    } catch {
      setActionError("Could not cancel this booking.");
    }
  };

  const busy = quoting || completing || cancelling;

  return (
    <div>
      <div className="mb-5 flex flex-wrap items-end gap-4">
        <div>
          <h1 className="text-[22px] font-bold tracking-tight">Bookings</h1>
          <p className="mt-0.5 text-[13px] text-studio-ink2">
            Manage event requests, quotes and confirmations in one place.
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex w-max gap-1 rounded-2xl border border-studio-line bg-white/[0.03] p-1">
        {TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setTab(t.key)}
            className={cn(
              "flex items-center gap-2 rounded-xl px-3.5 py-1.5 text-[12.5px] font-bold transition-colors",
              tab === t.key
                ? "bg-studio-surface2 text-studio-ink shadow"
                : "text-studio-ink2 hover:text-studio-ink"
            )}
          >
            {t.label}
            <span
              className={cn(
                "rounded-full px-1.5 py-px text-[10.5px] font-extrabold",
                tab === t.key
                  ? "bg-studio-violet/20 text-studio-violetB"
                  : "bg-white/5 text-studio-ink3"
              )}
            >
              {counts[t.key]}
            </span>
          </button>
        ))}
      </div>

      {/* Cards */}
      <div className="mt-4 flex flex-col gap-3">
        {isLoading ? (
          <SectionCard>
            <div className="flex items-center justify-center gap-2 py-9 text-[13px] text-studio-ink2">
              <Loader2 size={16} className="animate-spin" /> Loading bookings…
            </div>
          </SectionCard>
        ) : isError ? (
          <SectionCard>
            <EmptyState
              icon={CalendarCheck}
              title="Couldn't load your bookings"
              detail="Check your connection and try again."
            />
            <div className="text-center">
              <GlassButton onClick={() => refetch()}>Retry</GlassButton>
            </div>
          </SectionCard>
        ) : visible.length === 0 ? (
          <SectionCard>
            <EmptyState
              icon={CalendarCheck}
              title={`No ${TABS.find((t) => t.key === tab)?.label.toLowerCase()} right now`}
              detail="New booking requests will show up here."
            />
          </SectionCard>
        ) : (
          visible.map((b) => {
            const d = new Date(`${b.eventDate}T00:00:00`);
            const amount = amountOf(b);
            return (
              <button
                key={b.id}
                type="button"
                onClick={() => setSelectedId(b.id)}
                className="grid grid-cols-[56px_1.6fr_1fr_1fr_auto] items-center gap-4 rounded-2xl border border-studio-line bg-studio-card p-4 text-left transition-colors hover:border-studio-violet/40 hover:bg-studio-violet/5 max-lg:grid-cols-[56px_1fr_auto]"
              >
                <div className="w-[52px] rounded-xl border border-studio-line2 bg-studio-surface2 py-1.5 text-center">
                  <div className="text-lg font-extrabold leading-tight tabular-nums">
                    {d.toLocaleDateString("en-US", { day: "2-digit" })}
                  </div>
                  <div className="text-[9.5px] font-extrabold tracking-[0.12em] text-studio-pink">
                    {d
                      .toLocaleDateString("en-US", { month: "short" })
                      .toUpperCase()}
                  </div>
                </div>
                <div className="min-w-0">
                  <div className="truncate text-[13.5px] font-bold">
                    {b.eventType}
                    {b.venueName ? ` — ${b.venueName}` : ""}
                  </div>
                  <div className="mt-0.5 text-[11.5px] text-studio-ink2">
                    {b.endUserDisplayName} ·{" "}
                    <span className="text-studio-violetB">
                      {b.guestCount} guests
                    </span>
                  </div>
                </div>
                <div className="max-lg:hidden">
                  <Micro className="mb-0.5">Time</Micro>
                  <div className="text-[12.5px] font-bold tabular-nums">
                    {fmtTime(b.startTime)}{" "}
                    <span className="font-semibold text-studio-ink2">
                      – {fmtTime(b.endTime)}
                    </span>
                  </div>
                </div>
                <div className="max-lg:hidden">
                  <Micro className="mb-0.5">Venue</Micro>
                  <div className="truncate text-[12.5px] font-bold">
                    {b.venueName || b.locationType}
                  </div>
                </div>
                <div className="flex flex-col items-end gap-1.5">
                  <div className="text-base font-extrabold tabular-nums">
                    {amount ? fmtMoney(amount, b.currency) : "—"}
                  </div>
                  <Pill tone={STATUS_TONE[b.status]}>
                    {STATUS_LABEL[b.status]}
                  </Pill>
                </div>
              </button>
            );
          })
        )}
      </div>

      {/* ---------- Details drawer ---------- */}
      <div
        className={cn(
          "fixed inset-0 z-[100] bg-black/60 backdrop-blur-[2px] transition-opacity",
          selected ? "opacity-100" : "pointer-events-none opacity-0"
        )}
        onClick={closeDrawer}
        aria-hidden
      />
      <aside
        className={cn(
          "fixed bottom-0 right-0 top-0 z-[110] flex w-[430px] max-w-[94vw] flex-col border-l border-studio-line2 bg-studio-surface shadow-2xl transition-transform duration-300",
          selected ? "translate-x-0" : "translate-x-[105%]"
        )}
        role="dialog"
        aria-label="Booking details"
      >
        {selected ? (
          <>
            <div className="flex items-start gap-3 border-b border-studio-line p-5">
              <div>
                <Micro className="mb-1">Booking {selected.id}</Micro>
                <h3 className="text-[15px] font-bold leading-snug">
                  {selected.eventType}
                  {selected.venueName ? ` — ${selected.venueName}` : ""}
                </h3>
                <div className="mt-1.5 flex gap-1.5">
                  <Pill tone={STATUS_TONE[selected.status]}>
                    {STATUS_LABEL[selected.status]}
                  </Pill>
                </div>
              </div>
              <button
                type="button"
                aria-label="Close details"
                onClick={closeDrawer}
                className="ml-auto grid h-8 w-8 flex-none place-items-center rounded-lg text-studio-ink2 hover:bg-white/5"
              >
                <X size={16} />
              </button>
            </div>

            <div className="studio-scroll flex-1 space-y-5 overflow-y-auto p-5">
              <section>
                <Micro className="mb-2">Customer</Micro>
                <div className="rounded-xl border border-studio-line bg-white/[0.03] p-3.5 text-[12.5px]">
                  <div className="font-bold">{selected.endUserDisplayName}</div>
                  <div className="mt-1.5 flex items-center gap-2 text-studio-ink2">
                    <Users size={13} /> {selected.guestCount} expected guests
                  </div>
                </div>
              </section>

              <section>
                <Micro className="mb-2">Event</Micro>
                <KV k="Type" v={selected.eventType} />
                <KV k="Date" v={fmtLongDate(selected.eventDate)} />
                <KV
                  k="Time"
                  v={`${fmtTime(selected.startTime)} – ${fmtTime(selected.endTime)}`}
                />
                <KV k="Timezone" v={selected.timezone} />
                <KV k="Location type" v={selected.locationType} />
                {selected.venueName ? (
                  <div className="mt-2 flex items-center gap-2 text-[12.5px] text-studio-ink2">
                    <MapPin size={13} className="text-studio-violetB" />{" "}
                    {selected.venueName}
                    {selected.venueAddress ? `, ${selected.venueAddress}` : ""}
                  </div>
                ) : null}
              </section>

              {selected.genreNotes || selected.specialRequests ? (
                <section>
                  <Micro className="mb-2">Notes from the fan</Micro>
                  {[selected.genreNotes, selected.specialRequests]
                    .filter(Boolean)
                    .map((note) => (
                      <div
                        key={note}
                        className="mb-2 flex gap-2.5 rounded-xl border border-studio-line bg-white/[0.03] p-3.5 text-[12.5px] text-studio-ink2 last:mb-0"
                      >
                        <StickyNote
                          size={14}
                          className="mt-0.5 flex-none text-studio-warn"
                        />
                        {note}
                      </div>
                    ))}
                </section>
              ) : null}

              <section>
                <Micro className="mb-2">Payment Details</Micro>
                <KV
                  k="Fan's budget"
                  v={fmtMoney(selected.budgetAmount, selected.currency)}
                />
                <KV
                  k="Your quote"
                  v={
                    selected.quotedAmount != null
                      ? fmtMoney(selected.quotedAmount, selected.currency)
                      : "Not sent yet"
                  }
                />
                <KV
                  k="Deposit"
                  v={
                    selected.depositAmount != null
                      ? fmtMoney(selected.depositAmount, selected.currency)
                      : "—"
                  }
                />
                <KV
                  k="Final amount"
                  v={
                    selected.finalAmount != null
                      ? fmtMoney(selected.finalAmount, selected.currency)
                      : "—"
                  }
                />
              </section>

              {selected.cancellationReason || selected.lastStatusNote ? (
                <section>
                  <Micro className="mb-2">Status notes</Micro>
                  <div className="rounded-xl border border-studio-line bg-white/[0.03] p-3.5 text-[12.5px] text-studio-ink2">
                    {selected.cancellationReason ?? selected.lastStatusNote}
                  </div>
                </section>
              ) : null}

              {selected.status === "pending_dj_review" ? (
                <section>
                  <Micro className="mb-2">Send a quote</Micro>
                  <div className="space-y-2.5 rounded-xl border border-studio-violet/30 bg-studio-violet/[0.07] p-3.5">
                    <label
                      htmlFor="quote-amount"
                      className="flex flex-col gap-1 text-xs font-bold text-studio-ink2"
                    >
                      Quote amount ({selected.currency})
                      <input
                        id="quote-amount"
                        type="number"
                        min={1}
                        value={quoteAmount}
                        onChange={(e) => setQuoteAmount(e.target.value)}
                        placeholder={String(selected.budgetAmount)}
                        className="rounded-lg border border-studio-line bg-studio-surface px-3 py-2 text-[13px] font-semibold text-studio-ink tabular-nums focus:border-studio-violet focus:outline-none"
                      />
                    </label>
                    <label
                      htmlFor="quote-deposit"
                      className="flex flex-col gap-1 text-xs font-bold text-studio-ink2"
                    >
                      Deposit (optional)
                      <input
                        id="quote-deposit"
                        type="number"
                        min={0}
                        value={quoteDeposit}
                        onChange={(e) => setQuoteDeposit(e.target.value)}
                        className="rounded-lg border border-studio-line bg-studio-surface px-3 py-2 text-[13px] font-semibold text-studio-ink tabular-nums focus:border-studio-violet focus:outline-none"
                      />
                    </label>
                    <label
                      htmlFor="quote-note"
                      className="flex flex-col gap-1 text-xs font-bold text-studio-ink2"
                    >
                      Note to the fan (optional)
                      <textarea
                        id="quote-note"
                        rows={2}
                        maxLength={1000}
                        value={quoteNote}
                        onChange={(e) => setQuoteNote(e.target.value)}
                        className="resize-y rounded-lg border border-studio-line bg-studio-surface px-3 py-2 text-[13px] text-studio-ink focus:border-studio-violet focus:outline-none"
                      />
                    </label>
                  </div>
                </section>
              ) : null}

              {actionError ? (
                <p className="rounded-lg border border-studio-live/35 bg-studio-live/10 p-2.5 text-xs font-semibold text-[#FDA4AF]">
                  {actionError}
                </p>
              ) : null}
            </div>

            <div className="flex gap-2.5 border-t border-studio-line p-4">
              {selected.status === "pending_dj_review" ? (
                <>
                  <GlassButton
                    variant="good"
                    className="flex-1"
                    disabled={busy}
                    onClick={() => onQuote(selected)}
                  >
                    {quoting ? (
                      <Loader2 size={14} className="animate-spin" />
                    ) : (
                      <Check size={14} />
                    )}{" "}
                    Send quote
                  </GlassButton>
                  <GlassButton
                    variant="danger"
                    className="flex-1"
                    disabled={busy}
                    onClick={() => onCancel(selected)}
                  >
                    <X size={14} /> Decline
                  </GlassButton>
                </>
              ) : selected.status === "confirmed" ? (
                <>
                  <GlassButton
                    variant="good"
                    className="flex-1"
                    disabled={busy}
                    onClick={() => onComplete(selected)}
                  >
                    {completing ? (
                      <Loader2 size={14} className="animate-spin" />
                    ) : (
                      <Check size={14} />
                    )}{" "}
                    Mark completed
                  </GlassButton>
                  <GlassButton
                    variant="danger"
                    className="flex-1"
                    disabled={busy}
                    onClick={() => onCancel(selected)}
                  >
                    Cancel booking
                  </GlassButton>
                </>
              ) : selected.status === "awaiting_end_user_confirmation" ? (
                <GlassButton
                  variant="danger"
                  className="flex-1"
                  disabled={busy}
                  onClick={() => onCancel(selected)}
                >
                  Withdraw quote & cancel
                </GlassButton>
              ) : null}
            </div>
          </>
        ) : null}
      </aside>
    </div>
  );
}
