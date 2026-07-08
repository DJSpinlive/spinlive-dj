"use client";

import {
  Bell,
  Calendar,
  CalendarCheck,
  Clock as ClockIcon,
  DollarSign,
  Heart,
  HelpCircle,
  LayoutGrid,
  LogOut,
  Music,
  Radio,
  Search,
  Settings,
  User,
  Wallet,
  X,
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ReactNode, useState } from "react";

import { notifications as seedNotifications } from "@/lib/studio/data";
import { cn } from "@/lib/utils";
import { useGetUserQuery, useLogoutUserMutation } from "@/store/api";
import { useAppDispatch } from "@/store/hooks";
import { logout } from "@/store/slices/authSlice";
import {
  clearAllAuthCookies,
  getRefreshTokenFromCookie,
} from "@/utilities/clientCookies";
import { resolveRemoteAssetUrl } from "@/utilities/remote-avatar-url";

function initialsOf(name?: string | null): string {
  if (!name) return "DJ";
  const parts = name.trim().split(/\s+/).slice(0, 2);
  return parts.map((p) => p[0]?.toUpperCase() ?? "").join("") || "DJ";
}

const NAV = [
  { href: "/studio", label: "Dashboard", icon: LayoutGrid },
  { href: "/studio/go-live", label: "Go Live", icon: Radio, primary: true },
  { href: "/studio/bookings", label: "Bookings", icon: CalendarCheck },
  { href: "/studio/calendar", label: "Calendar", icon: Calendar },
  { href: "/studio/earnings", label: "Earnings", icon: Wallet },
  { href: "/studio/profile", label: "Profile", icon: User },
  { href: "/studio/settings", label: "Settings", icon: Settings },
];

const NOTIF_ICONS = {
  booking: {
    icon: CalendarCheck,
    cls: "bg-studio-violet/15 text-studio-violetB",
  },
  tip: { icon: DollarSign, cls: "bg-studio-good/15 text-studio-good" },
  request: { icon: Music, cls: "bg-studio-pink/15 text-studio-pink" },
  reminder: { icon: ClockIcon, cls: "bg-studio-warn/15 text-studio-warn" },
  payout: { icon: Wallet, cls: "bg-studio-blue/15 text-studio-blue" },
  follower: { icon: Heart, cls: "bg-studio-pink/15 text-studio-pink" },
} as const;

function Pill({ children }: { children: ReactNode }) {
  return (
    <span className="rounded-full bg-studio-violet/15 px-2.5 py-0.5 text-[11px] font-bold text-studio-violetB">
      {children}
    </span>
  );
}

export default function StudioShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const dispatch = useAppDispatch();
  const [notifOpen, setNotifOpen] = useState(false);
  const [notifs, setNotifs] = useState(seedNotifications);
  const unread = notifs.filter((n) => n.unread).length;

  const { data: user } = useGetUserQuery();
  const [logoutUser, { isLoading: loggingOut }] = useLogoutUserMutation();

  const handleLogout = async () => {
    try {
      await logoutUser({
        refresh_token: getRefreshTokenFromCookie(),
      }).unwrap();
    } catch {
      // Server-side revocation failed — still clear the local session.
    }
    clearAllAuthCookies();
    dispatch(logout());
    router.replace("/login");
  };

  return (
    <div className="grid h-screen grid-cols-[232px_1fr] grid-rows-[60px_1fr] max-lg:grid-cols-[76px_1fr]">
      {/* ============ Sidebar ============ */}
      <aside className="row-span-2 flex flex-col gap-1 border-r border-studio-line bg-studio-bg2 p-3 pt-4">
        <Link href="/studio" className="mb-3 flex items-center gap-2.5 px-2">
          <span
            aria-hidden
            className="relative h-[34px] w-[34px] flex-none rounded-full shadow-[0_0_18px_rgba(139,92,246,0.55)]"
            style={{
              background:
                "conic-gradient(from 200deg,#8B5CF6,#F472B6,#38BDF8,#8B5CF6)",
            }}
          >
            <span className="absolute inset-[11px] rounded-full border-2 border-white/85 bg-studio-bg2" />
          </span>
          <span className="text-sm font-extrabold tracking-[0.14em] max-lg:hidden">
            SPIN<span className="text-studio-violetB">LIVE</span>
          </span>
        </Link>

        {NAV.map(({ href, label, icon: Icon, primary }) => {
          const active =
            href === "/studio"
              ? pathname === "/studio"
              : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "relative flex items-center gap-3 rounded-xl px-2.5 py-2.5 text-[13px] font-semibold transition-colors max-lg:justify-center",
                primary
                  ? "my-1 bg-studio-grad text-white shadow-[0_4px_18px_rgba(139,92,246,0.4)] hover:bg-studio-grad-hover"
                  : active
                    ? "bg-studio-violet/15 text-studio-violetB"
                    : "text-studio-ink2 hover:bg-white/5 hover:text-studio-ink"
              )}
            >
              {active && !primary ? (
                <span className="absolute -left-3 top-2 bottom-2 w-[3px] rounded-r bg-studio-violet" />
              ) : null}
              <Icon size={18} className="flex-none" />
              <span className="max-lg:hidden">{label}</span>
            </Link>
          );
        })}

        <div className="mt-auto flex flex-col gap-0.5 border-t border-studio-line pt-2">
          <button
            type="button"
            className="flex items-center gap-3 rounded-xl px-2.5 py-2.5 text-[13px] font-semibold text-studio-ink2 hover:bg-white/5 hover:text-studio-ink max-lg:justify-center"
          >
            <HelpCircle size={18} className="flex-none" />
            <span className="max-lg:hidden">Help</span>
          </button>
          <button
            type="button"
            onClick={handleLogout}
            disabled={loggingOut}
            className="flex items-center gap-3 rounded-xl px-2.5 py-2.5 text-[13px] font-semibold text-studio-ink2 hover:bg-white/5 hover:text-studio-ink max-lg:justify-center disabled:opacity-60"
          >
            <LogOut size={18} className="flex-none" />
            <span className="max-lg:hidden">
              {loggingOut ? "Logging out…" : "Logout"}
            </span>
          </button>
        </div>
      </aside>

      {/* ============ Topbar ============ */}
      <header className="flex items-center gap-3.5 border-b border-studio-line bg-studio-bg/70 px-5 backdrop-blur-xl">
        <div className="relative w-full max-w-[420px]">
          <Search
            size={15}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-studio-ink3"
          />
          <input
            type="search"
            placeholder="Search bookings, fans, tracks…"
            aria-label="Search"
            className="w-full rounded-full border border-studio-line bg-white/5 py-2 pl-9 pr-3 text-[13px] text-studio-ink placeholder:text-studio-ink3 focus:border-studio-violet focus:bg-white/10 focus:outline-none"
          />
        </div>

        <div className="ml-auto flex items-center gap-2.5">
          <div
            className="flex items-center gap-2 rounded-full border border-studio-line bg-white/5 px-3 py-1.5 text-xs font-semibold text-studio-ink2 max-md:hidden"
            title="Stream server connection"
          >
            <span className="h-[7px] w-[7px] rounded-full bg-studio-good shadow-[0_0_8px_rgba(52,211,153,0.7)]" />
            Connection: Excellent
          </div>
          <button
            type="button"
            aria-label={`Notifications, ${unread} unread`}
            onClick={() => setNotifOpen(true)}
            className="relative grid h-9 w-9 place-items-center rounded-xl border border-studio-line bg-white/5 text-studio-ink2 hover:bg-white/10 hover:text-studio-ink"
          >
            <Bell size={17} />
            {unread > 0 ? (
              <span className="absolute -right-1 -top-1 grid h-4 min-w-4 place-items-center rounded-full border-2 border-studio-bg bg-studio-pink px-1 text-[10px] font-extrabold text-[#14041c]">
                {unread}
              </span>
            ) : null}
          </button>
          <Link
            href="/studio/settings"
            aria-label="Settings"
            className="grid h-9 w-9 place-items-center rounded-xl border border-studio-line bg-white/5 text-studio-ink2 hover:bg-white/10 hover:text-studio-ink"
          >
            <Settings size={17} />
          </Link>
          <Link
            href="/studio/profile"
            aria-label="Your profile"
            className="grid h-[34px] w-[34px] place-items-center overflow-hidden rounded-full bg-studio-grad text-xs font-extrabold text-white ring-2 ring-studio-violet ring-offset-2 ring-offset-studio-bg"
          >
            {user?.avatar_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={resolveRemoteAssetUrl(user.avatar_url)}
                alt=""
                className="h-full w-full object-cover"
              />
            ) : (
              initialsOf(user?.display_name ?? user?.username)
            )}
          </Link>
        </div>
      </header>

      {/* ============ Main ============ */}
      <main className="studio-scroll overflow-y-auto px-6 pb-12 pt-6">
        <div className="mx-auto max-w-[1440px]">{children}</div>
      </main>

      {/* ============ Notifications drawer ============ */}
      <div
        className={cn(
          "fixed inset-0 z-[100] bg-black/60 backdrop-blur-[2px] transition-opacity",
          notifOpen ? "opacity-100" : "pointer-events-none opacity-0"
        )}
        onClick={() => setNotifOpen(false)}
        aria-hidden
      />
      <aside
        className={cn(
          "fixed bottom-0 right-0 top-0 z-[110] flex w-[400px] max-w-[92vw] flex-col border-l border-studio-line2 bg-studio-surface shadow-2xl transition-transform duration-300",
          notifOpen ? "translate-x-0" : "translate-x-[105%]"
        )}
        role="dialog"
        aria-label="Notifications"
      >
        <div className="flex items-center gap-2.5 border-b border-studio-line p-5">
          <h3 className="text-[15px] font-bold">Notifications</h3>
          {unread > 0 ? <Pill>{unread} new</Pill> : null}
          <button
            type="button"
            className="ml-auto text-xs font-semibold text-studio-link hover:text-studio-linkHover hover:underline"
            onClick={() =>
              setNotifs((ns) => ns.map((n) => ({ ...n, unread: false })))
            }
          >
            Mark all read
          </button>
          <button
            type="button"
            aria-label="Close notifications"
            onClick={() => setNotifOpen(false)}
            className="grid h-8 w-8 place-items-center rounded-lg text-studio-ink2 hover:bg-white/5"
          >
            <X size={16} />
          </button>
        </div>
        <div className="studio-scroll flex-1 space-y-1 overflow-y-auto p-3">
          {notifs.map((n) => {
            const { icon: Icon, cls } = NOTIF_ICONS[n.kind];
            return (
              <div
                key={n.id}
                className={cn(
                  "flex gap-3 rounded-xl p-3",
                  n.unread && "bg-studio-violet/10"
                )}
              >
                <span
                  className={cn(
                    "grid h-[34px] w-[34px] flex-none place-items-center rounded-xl",
                    cls
                  )}
                >
                  <Icon size={16} />
                </span>
                <div className="min-w-0 flex-1 text-[12.5px]">
                  <b className="font-bold">{n.title}</b>
                  <div className="text-studio-ink2">{n.detail}</div>
                  <div className="mt-0.5 text-[10.5px] text-studio-ink3">
                    {n.time}
                  </div>
                </div>
                {n.unread ? (
                  <span className="mt-1.5 h-2 w-2 flex-none rounded-full bg-studio-violetB" />
                ) : null}
              </div>
            );
          })}
        </div>
      </aside>
    </div>
  );
}
