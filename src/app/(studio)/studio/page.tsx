"use client";

import {
  Calendar,
  CalendarCheck,
  DollarSign,
  Heart,
  Radio,
  User,
  Wallet,
} from "lucide-react";
import Link from "next/link";
import { useMemo } from "react";

import { WeeklyEarningsChart } from "@/components/studio/charts";
import {
  CardTitle,
  EmptyState,
  KpiCard,
  Micro,
  Pill,
  SectionCard,
} from "@/components/studio/ui";
import { useGetBookingsQuery, useGetUserQuery } from "@/store/api";
import { Booking } from "@/types/bookings.types";

const perf = [
  { label: "Avg. viewers", pct: 72, value: "861", color: "bg-studio-violet" },
  { label: "Avg. watch time", pct: 58, value: "24m", color: "bg-studio-blue" },
  { label: "Requests filled", pct: 86, value: "86%", color: "bg-studio-pink" },
  {
    label: "Chat msgs / stream",
    pct: 64,
    value: "2.3K",
    color: "bg-studio-good",
  },
];

const ACTIVE_STATUSES: Booking["status"][] = [
  "pending_dj_review",
  "awaiting_end_user_confirmation",
  "confirmed",
];

function bookingAmount(b: Booking): number {
  return b.finalAmount ?? b.quotedAmount ?? b.budgetAmount ?? 0;
}

function fmtMoney(n: number): string {
  return `$${n.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
}

function fmtDate(iso: string) {
  const d = new Date(`${iso}T00:00:00`);
  return {
    day: d.toLocaleDateString("en-US", { day: "2-digit" }),
    month: d.toLocaleDateString("en-US", { month: "short" }).toUpperCase(),
  };
}

function fmtTime(t: string) {
  const [h = 0, m = 0] = t.split(":").map(Number);
  const d = new Date();
  d.setHours(h, m, 0, 0);
  return d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
}

function isoToday(): string {
  return new Date().toISOString().slice(0, 10);
}

export default function DashboardPage() {
  const { data: user } = useGetUserQuery();
  const { data: bookings = [], isLoading: bookingsLoading } =
    useGetBookingsQuery({});

  const today = isoToday();
  const stats = useMemo(() => {
    const active = bookings.filter((b) => ACTIVE_STATUSES.includes(b.status));
    const todays = active.filter((b) => b.eventDate === today);
    const upcoming = active
      .filter((b) => b.eventDate >= today)
      .sort((a, b) => a.eventDate.localeCompare(b.eventDate));
    const pendingCount = active.filter(
      (b) => b.status === "pending_dj_review"
    ).length;
    const completedRevenue = bookings
      .filter((b) => b.status === "completed")
      .reduce((sum, b) => sum + bookingAmount(b), 0);
    return { todays, upcoming, pendingCount, completedRevenue };
  }, [bookings, today]);

  const displayName = user?.display_name ?? user?.username ?? "DJ";
  const followers = user?.followers_count ?? user?.follower_count ?? 0;
  const todayLabel = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
  const nextToday = stats.todays[0];

  return (
    <div>
      {/* Header */}
      <div className="mb-5 flex flex-wrap items-end gap-4">
        <div>
          <h1 className="text-[22px] font-bold tracking-tight">
            Good evening, {displayName} 🎧
          </h1>
          <p className="mt-0.5 text-[13px] text-studio-ink2">
            {todayLabel} · You have{" "}
            <b className="text-studio-ink">
              {stats.todays.length} booking
              {stats.todays.length === 1 ? "" : "s"}
            </b>{" "}
            today
            {nextToday
              ? ` and a ${nextToday.eventType} at ${nextToday.venueName || "your venue"} at ${fmtTime(nextToday.startTime)}.`
              : "."}
          </p>
        </div>
        <div className="ml-auto flex items-center gap-2.5">
          <Link
            href="/studio/calendar"
            className="inline-flex items-center gap-2 rounded-xl border border-studio-btnBorder bg-studio-btnBg px-4 py-2 text-[13px] font-bold text-studio-btnText hover:border-studio-btnBorderHover"
          >
            <Calendar size={15} /> Manage Calendar
          </Link>
          <Link
            href="/studio/go-live"
            className="inline-flex items-center gap-2 rounded-xl bg-studio-grad px-4 py-2 text-[13px] font-bold text-white shadow-[0_4px_16px_rgba(139,92,246,0.35)] hover:bg-studio-grad-hover"
          >
            <Radio size={15} /> Go Live
          </Link>
        </div>
      </div>

      {/* KPIs */}
      <div className="mb-4 grid grid-cols-5 gap-3.5 max-xl:grid-cols-3 max-md:grid-cols-2">
        <KpiCard
          hero
          label="Completed Revenue"
          value={fmtMoney(stats.completedRevenue)}
          sub="from completed bookings"
        />
        <KpiCard
          label="Today's Bookings"
          value={String(stats.todays.length)}
          extra={
            stats.pendingCount > 0 ? (
              <Pill tone="warn">{stats.pendingCount} pending</Pill>
            ) : undefined
          }
        />
        <KpiCard
          label="Upcoming Events"
          value={String(stats.upcoming.length)}
          sub="confirmed & pending"
        />
        <KpiCard label="Followers" value={followers.toLocaleString()} />
        <KpiCard
          label="Rating"
          value={user?.rating_count ? `${user.rating_avg.toFixed(1)}★` : "—"}
          sub={
            user?.rating_count
              ? `${user.rating_count} review${user.rating_count === 1 ? "" : "s"}`
              : "no reviews yet"
          }
        />
      </div>

      <div className="grid grid-cols-[1fr_380px] items-start gap-4 max-xl:grid-cols-1">
        {/* Left column */}
        <div className="flex flex-col gap-4">
          <SectionCard>
            <CardTitle
              action={
                <Link
                  href="/studio/earnings"
                  className="text-xs font-semibold text-studio-link hover:text-studio-linkHover hover:underline"
                >
                  View earnings
                </Link>
              }
            >
              Weekly Earnings
            </CardTitle>
            <WeeklyEarningsChart />
          </SectionCard>

          <SectionCard>
            <CardTitle
              action={
                <Link
                  href="/studio/bookings"
                  className="text-xs font-semibold text-studio-link hover:text-studio-linkHover hover:underline"
                >
                  All bookings
                </Link>
              }
            >
              Upcoming Bookings
            </CardTitle>
            <div className="flex flex-col gap-2.5">
              {bookingsLoading ? (
                <div className="py-6 text-center text-xs text-studio-ink3">
                  Loading bookings…
                </div>
              ) : stats.upcoming.length === 0 ? (
                <EmptyState
                  icon={CalendarCheck}
                  title="No upcoming bookings"
                  detail="New requests from fans will show up here."
                />
              ) : (
                stats.upcoming.slice(0, 3).map((b) => {
                  const { day, month } = fmtDate(b.eventDate);
                  const amount = bookingAmount(b);
                  return (
                    <div
                      key={b.id}
                      className="flex items-center gap-3 rounded-xl border border-studio-line bg-white/[0.03] p-3"
                    >
                      <div className="w-[46px] flex-none rounded-lg border border-studio-line2 bg-studio-surface2 py-1 text-center">
                        <div className="text-[17px] font-extrabold leading-tight tabular-nums">
                          {day}
                        </div>
                        <div className="text-[9.5px] font-extrabold tracking-[0.12em] text-studio-pink">
                          {month}
                        </div>
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-[13px] font-bold">
                          {b.eventType}
                          {b.venueName ? ` — ${b.venueName}` : ""}
                        </div>
                        <div className="text-[11.5px] text-studio-ink2">
                          {fmtTime(b.startTime)} · {b.endUserDisplayName}
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        <div className="text-sm font-extrabold tabular-nums">
                          {amount ? fmtMoney(amount) : "—"}
                        </div>
                        <Pill tone={b.status === "confirmed" ? "good" : "warn"}>
                          {b.status === "confirmed" ? "Confirmed" : "Pending"}
                        </Pill>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </SectionCard>
        </div>

        {/* Right column */}
        <div className="flex flex-col gap-4">
          <SectionCard>
            <CardTitle>Quick Actions</CardTitle>
            <div className="grid grid-cols-2 gap-2.5">
              <Link
                href="/studio/go-live"
                className="flex flex-col gap-2 rounded-xl bg-studio-grad p-3.5 text-left text-[12.5px] font-bold text-white hover:bg-studio-grad-hover"
              >
                <Radio size={18} /> Go Live
              </Link>
              <Link
                href="/studio/profile"
                className="flex flex-col gap-2 rounded-xl border border-studio-line bg-white/[0.03] p-3.5 text-left text-[12.5px] font-bold transition-colors hover:border-studio-violet hover:bg-studio-violet/10"
              >
                <User size={18} className="text-studio-violetB" /> Edit Profile
              </Link>
              <Link
                href="/studio/calendar"
                className="flex flex-col gap-2 rounded-xl border border-studio-line bg-white/[0.03] p-3.5 text-left text-[12.5px] font-bold transition-colors hover:border-studio-violet hover:bg-studio-violet/10"
              >
                <Calendar size={18} className="text-studio-violetB" /> Manage
                Calendar
              </Link>
              <Link
                href="/studio/earnings?withdraw=1"
                className="flex flex-col gap-2 rounded-xl border border-studio-line bg-white/[0.03] p-3.5 text-left text-[12.5px] font-bold transition-colors hover:border-studio-violet hover:bg-studio-violet/10"
              >
                <Wallet size={18} className="text-studio-violetB" /> Withdraw
                Earnings
              </Link>
            </div>
          </SectionCard>

          <SectionCard>
            <CardTitle>Pending Requests</CardTitle>
            <div className="space-y-1">
              {stats.pendingCount === 0 ? (
                <div className="flex gap-3 rounded-xl p-3">
                  <span className="grid h-[34px] w-[34px] flex-none place-items-center rounded-xl bg-studio-good/15 text-studio-good">
                    <CalendarCheck size={16} />
                  </span>
                  <div className="min-w-0 flex-1 text-[12.5px]">
                    <b>All caught up</b>
                    <div className="text-[10.5px] text-studio-ink3">
                      No booking requests waiting on a quote.
                    </div>
                  </div>
                </div>
              ) : (
                bookings
                  .filter((b) => b.status === "pending_dj_review")
                  .slice(0, 3)
                  .map((b) => (
                    <Link
                      key={b.id}
                      href="/studio/bookings"
                      className="flex gap-3 rounded-xl bg-studio-violet/10 p-3 hover:bg-studio-violet/15"
                    >
                      <span className="grid h-[34px] w-[34px] flex-none place-items-center rounded-xl bg-studio-violet/15 text-studio-violetB">
                        <CalendarCheck size={16} />
                      </span>
                      <div className="min-w-0 flex-1 text-[12.5px]">
                        <b>New booking request</b> — {b.endUserDisplayName},{" "}
                        {b.eventType}
                        <div className="text-[10.5px] text-studio-ink3">
                          {fmtDate(b.eventDate).month}{" "}
                          {fmtDate(b.eventDate).day} · {fmtTime(b.startTime)}
                        </div>
                      </div>
                      <span className="mt-1.5 h-2 w-2 flex-none rounded-full bg-studio-violetB" />
                    </Link>
                  ))
              )}
              {user && !user.is_live ? (
                <div className="flex gap-3 rounded-xl p-3">
                  <span className="grid h-[34px] w-[34px] flex-none place-items-center rounded-xl bg-studio-pink/15 text-studio-pink">
                    <Heart size={16} />
                  </span>
                  <div className="min-w-0 flex-1 text-[12.5px]">
                    <b>{followers.toLocaleString()} followers</b> waiting for
                    your next stream
                    <div className="text-[10.5px] text-studio-ink3">
                      Go live to notify them.
                    </div>
                  </div>
                </div>
              ) : null}
              {user?.is_live ? (
                <div className="flex gap-3 rounded-xl bg-studio-live/10 p-3">
                  <span className="grid h-[34px] w-[34px] flex-none place-items-center rounded-xl bg-studio-live/15 text-studio-live">
                    <DollarSign size={16} />
                  </span>
                  <div className="min-w-0 flex-1 text-[12.5px]">
                    <b>You&apos;re live right now</b>
                    <div className="text-[10.5px] text-studio-ink3">
                      Head to the Go Live studio to manage your stream.
                    </div>
                  </div>
                </div>
              ) : null}
            </div>
          </SectionCard>

          <SectionCard>
            <CardTitle action={<Pill>Last 7 days</Pill>}>
              Performance Overview
            </CardTitle>
            {perf.map((p) => (
              <div key={p.label} className="flex items-center gap-2.5 py-2">
                <span className="w-[130px] flex-none text-xs font-semibold text-studio-ink2">
                  {p.label}
                </span>
                <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-studio-surface2">
                  <span
                    className={`block h-full rounded-full ${p.color}`}
                    style={{ width: `${p.pct}%` }}
                  />
                </span>
                <span className="w-[52px] text-right text-[12.5px] font-extrabold tabular-nums">
                  {p.value}
                </span>
              </div>
            ))}
            <Micro className="mt-2">
              Streaming analytics — live data lands with the tips service
            </Micro>
          </SectionCard>
        </div>
      </div>
    </div>
  );
}
