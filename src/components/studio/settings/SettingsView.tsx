"use client";

import { Loader2 } from "lucide-react";
import { ReactNode, useEffect, useState } from "react";

import {
  CardTitle,
  GlassButton,
  Micro,
  Pill,
  SectionCard,
  Toggle,
} from "@/components/studio/ui";
import { cn } from "@/lib/utils";
import { useGetUserQuery, useUpdateUserMutation } from "@/store/api";

const SECTIONS = [
  "Account",
  "Password",
  "Notifications",
  "Streaming",
  "Audio",
  "Connected Accounts",
  "Stripe Connect",
  "Privacy",
] as const;

type Section = (typeof SECTIONS)[number];

const inputCls =
  "w-full rounded-xl border border-studio-line bg-studio-surface px-3 py-2 text-[13px] text-studio-ink placeholder:text-studio-ink3 focus:border-studio-violet focus:outline-none";

function SettingRow({
  title,
  detail,
  children,
}: {
  title: string;
  detail: string;
  children: ReactNode;
}) {
  return (
    <div className="flex items-center gap-3.5 border-b border-studio-line py-3 last:border-b-0">
      <div className="flex-1">
        <div className="text-[13px] font-bold">{title}</div>
        <div className="text-xs text-studio-ink2">{detail}</div>
      </div>
      {children}
    </div>
  );
}

export default function SettingsView() {
  const [section, setSection] = useState<Section>("Account");
  const { data: user } = useGetUserQuery();
  const [updateUser, { isLoading: savingAccount }] = useUpdateUserMutation();
  const [displayName, setDisplayName] = useState("");
  const [username, setUsername] = useState("");
  const [accountNotice, setAccountNotice] = useState<string | null>(null);

  /* Real capture devices — labels require a granted permission. */
  const [devicePermission, setDevicePermission] = useState<
    "idle" | "granted" | "denied"
  >("idle");
  const [inputDevices, setInputDevices] = useState<MediaDeviceInfo[]>([]);
  const [outputDevices, setOutputDevices] = useState<MediaDeviceInfo[]>([]);

  const connectDevices = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
      });
      // Permission is all we needed — release the mic immediately.
      stream.getTracks().forEach((t) => t.stop());
      const devices = await navigator.mediaDevices.enumerateDevices();
      setInputDevices(devices.filter((d) => d.kind === "audioinput"));
      setOutputDevices(devices.filter((d) => d.kind === "audiooutput"));
      setDevicePermission("granted");
    } catch {
      setDevicePermission("denied");
    }
  };

  useEffect(() => {
    if (!user) return;
    setDisplayName(user.display_name ?? "");
    setUsername(user.username ?? "");
  }, [user]);

  const saveAccount = async () => {
    setAccountNotice(null);
    try {
      await updateUser({
        display_name: displayName || undefined,
        username: username.replace(/^@/, "") || undefined,
      }).unwrap();
      setAccountNotice("Account saved.");
    } catch {
      setAccountNotice("Could not save — is that username taken?");
    }
  };
  const [notifs, setNotifs] = useState({
    bookings: true,
    tips: true,
    requests: true,
    reminders: true,
    payouts: true,
    followers: false,
  });
  const [privacy, setPrivacy] = useState({
    profilePublic: true,
    showEarnings: false,
    allowDMs: true,
  });
  const [gain, setGain] = useState(72);

  return (
    <div>
      <div className="mb-5">
        <h1 className="text-[22px] font-bold tracking-tight">Settings</h1>
        <p className="mt-0.5 text-[13px] text-studio-ink2">
          Account, streaming and payout preferences.
        </p>
      </div>

      <div className="grid grid-cols-[220px_1fr] items-start gap-4 max-lg:grid-cols-1">
        <SectionCard className="sticky top-0 !p-2 max-lg:static">
          <nav className="flex flex-col gap-0.5 max-lg:flex-row max-lg:flex-wrap">
            {SECTIONS.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setSection(s)}
                className={cn(
                  "rounded-lg px-3 py-2 text-left text-[12.5px] font-semibold",
                  section === s
                    ? "bg-studio-violet/15 font-bold text-studio-violetB"
                    : "text-studio-ink2 hover:bg-white/5 hover:text-studio-ink"
                )}
              >
                {s}
              </button>
            ))}
          </nav>
        </SectionCard>

        <div className="flex max-w-2xl flex-col gap-4">
          {section === "Account" ? (
            <SectionCard>
              <CardTitle>Account</CardTitle>
              <div className="grid grid-cols-2 gap-3.5 max-md:grid-cols-1">
                <label
                  htmlFor="set-display-name"
                  className="flex flex-col gap-1.5"
                >
                  <span className="text-xs font-bold text-studio-ink2">
                    Display name
                  </span>
                  <input
                    id="set-display-name"
                    className={inputCls}
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                  />
                </label>
                <label htmlFor="set-username" className="flex flex-col gap-1.5">
                  <span className="text-xs font-bold text-studio-ink2">
                    Username
                  </span>
                  <input
                    id="set-username"
                    className={inputCls}
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                  />
                </label>
                <label htmlFor="set-email" className="flex flex-col gap-1.5">
                  <span className="text-xs font-bold text-studio-ink2">
                    Email
                  </span>
                  <input
                    id="set-email"
                    className={inputCls}
                    value={user?.email ?? ""}
                    readOnly
                    title="Email changes go through support"
                    type="email"
                  />
                </label>
                <label htmlFor="set-timezone" className="flex flex-col gap-1.5">
                  <span className="text-xs font-bold text-studio-ink2">
                    Timezone
                  </span>
                  <select
                    id="set-timezone"
                    className={inputCls}
                    defaultValue="Pacific Time (PT)"
                  >
                    <option>Pacific Time (PT)</option>
                    <option>Eastern Time (ET)</option>
                    <option>Central European (CET)</option>
                  </select>
                </label>
              </div>
              <div className="mt-4 flex items-center gap-3">
                <GlassButton
                  variant="primary"
                  disabled={savingAccount}
                  onClick={saveAccount}
                >
                  {savingAccount ? (
                    <Loader2 size={14} className="animate-spin" />
                  ) : null}
                  Save account
                </GlassButton>
                {accountNotice ? (
                  <span className="text-xs font-semibold text-studio-ink2">
                    {accountNotice}
                  </span>
                ) : null}
              </div>
            </SectionCard>
          ) : null}

          {section === "Password" ? (
            <SectionCard>
              <CardTitle>Password</CardTitle>
              <div className="flex max-w-sm flex-col gap-3.5">
                {[
                  { id: "pw-current", label: "Current password" },
                  { id: "pw-new", label: "New password" },
                  { id: "pw-confirm", label: "Confirm new password" },
                ].map((pw) => (
                  <label
                    key={pw.id}
                    htmlFor={pw.id}
                    className="flex flex-col gap-1.5"
                  >
                    <span className="text-xs font-bold text-studio-ink2">
                      {pw.label}
                    </span>
                    <input
                      id={pw.id}
                      className={inputCls}
                      type="password"
                      placeholder="••••••••"
                    />
                  </label>
                ))}
                <Micro>
                  Minimum 12 characters with one number and one symbol
                </Micro>
                <GlassButton variant="primary" className="w-max">
                  Update password
                </GlassButton>
              </div>
            </SectionCard>
          ) : null}

          {section === "Notifications" ? (
            <SectionCard>
              <CardTitle>Notifications</CardTitle>
              <SettingRow
                title="New bookings"
                detail="Requests and confirmations"
              >
                <Toggle
                  checked={notifs.bookings}
                  onChange={(v) => setNotifs((n) => ({ ...n, bookings: v }))}
                  label="New bookings"
                />
              </SettingRow>
              <SettingRow title="Tips" detail="When a fan tips during a stream">
                <Toggle
                  checked={notifs.tips}
                  onChange={(v) => setNotifs((n) => ({ ...n, tips: v }))}
                  label="Tips"
                />
              </SettingRow>
              <SettingRow
                title="Song requests"
                detail="New paid requests while live"
              >
                <Toggle
                  checked={notifs.requests}
                  onChange={(v) => setNotifs((n) => ({ ...n, requests: v }))}
                  label="Song requests"
                />
              </SettingRow>
              <SettingRow
                title="Booking reminders"
                detail="24h and 2h before each event"
              >
                <Toggle
                  checked={notifs.reminders}
                  onChange={(v) => setNotifs((n) => ({ ...n, reminders: v }))}
                  label="Booking reminders"
                />
              </SettingRow>
              <SettingRow
                title="Payouts"
                detail="When money lands in your bank"
              >
                <Toggle
                  checked={notifs.payouts}
                  onChange={(v) => setNotifs((n) => ({ ...n, payouts: v }))}
                  label="Payouts"
                />
              </SettingRow>
              <SettingRow
                title="New followers"
                detail="Daily digest, never per-follow"
              >
                <Toggle
                  checked={notifs.followers}
                  onChange={(v) => setNotifs((n) => ({ ...n, followers: v }))}
                  label="New followers"
                />
              </SettingRow>
            </SectionCard>
          ) : null}

          {section === "Streaming" ? (
            <SectionCard>
              <CardTitle>Streaming Settings</CardTitle>
              <div className="grid grid-cols-2 gap-3.5 max-md:grid-cols-1">
                <label
                  htmlFor="set-resolution"
                  className="flex flex-col gap-1.5"
                >
                  <span className="text-xs font-bold text-studio-ink2">
                    Resolution
                  </span>
                  <select
                    id="set-resolution"
                    className={inputCls}
                    defaultValue="1080p · 60fps"
                  >
                    <option>1080p · 60fps</option>
                    <option>1080p · 30fps</option>
                    <option>720p · 60fps</option>
                  </select>
                </label>
                <label
                  htmlFor="set-max-bitrate"
                  className="flex flex-col gap-1.5"
                >
                  <span className="text-xs font-bold text-studio-ink2">
                    Max bitrate
                  </span>
                  <select
                    id="set-max-bitrate"
                    className={inputCls}
                    defaultValue="6 Mbps"
                  >
                    <option>6 Mbps</option>
                    <option>4.5 Mbps</option>
                    <option>3 Mbps</option>
                  </select>
                </label>
                <label
                  htmlFor="set-latency-mode"
                  className="flex flex-col gap-1.5"
                >
                  <span className="text-xs font-bold text-studio-ink2">
                    Latency mode
                  </span>
                  <select
                    id="set-latency-mode"
                    className={inputCls}
                    defaultValue="Low latency (recommended)"
                  >
                    <option>Low latency (recommended)</option>
                    <option>Ultra-low latency</option>
                    <option>Standard</option>
                  </select>
                </label>
                <label
                  htmlFor="set-stream-key"
                  className="flex flex-col gap-1.5"
                >
                  <span className="text-xs font-bold text-studio-ink2">
                    Stream key
                  </span>
                  <input
                    id="set-stream-key"
                    className={cn(inputCls, "tabular-nums")}
                    value="Generated per stream in the Go Live studio"
                    readOnly
                  />
                </label>
              </div>
              <SettingRow
                title="Auto-archive streams"
                detail="Save VODs to your profile for 30 days"
              >
                <Toggle
                  checked
                  onChange={() => undefined}
                  label="Auto-archive streams"
                />
              </SettingRow>
            </SectionCard>
          ) : null}

          {section === "Audio" ? (
            <SectionCard>
              <CardTitle
                action={
                  devicePermission !== "granted" ? (
                    <GlassButton
                      variant="primary"
                      className="!px-3 !py-1.5 text-xs"
                      onClick={connectDevices}
                    >
                      Connect devices
                    </GlassButton>
                  ) : (
                    <span className="text-[11px] font-semibold text-studio-good">
                      Devices connected
                    </span>
                  )
                }
              >
                Audio Settings
              </CardTitle>
              {devicePermission === "denied" ? (
                <p className="mb-3 text-xs font-semibold text-studio-warn">
                  Microphone permission denied — allow it in your browser
                  settings to list your real devices.
                </p>
              ) : null}
              <div className="grid grid-cols-2 gap-3.5 max-md:grid-cols-1">
                <label
                  htmlFor="set-input-device"
                  className="flex flex-col gap-1.5"
                >
                  <span className="text-xs font-bold text-studio-ink2">
                    Input device
                  </span>
                  <select
                    id="set-input-device"
                    className={inputCls}
                    disabled={devicePermission !== "granted"}
                  >
                    {inputDevices.length === 0 ? (
                      <option>
                        {devicePermission === "granted"
                          ? "No input devices found"
                          : "Connect devices to list inputs"}
                      </option>
                    ) : (
                      inputDevices.map((d, i) => (
                        <option key={d.deviceId} value={d.deviceId}>
                          {d.label || `Input device ${i + 1}`}
                        </option>
                      ))
                    )}
                  </select>
                </label>
                <label
                  htmlFor="set-output-device"
                  className="flex flex-col gap-1.5"
                >
                  <span className="text-xs font-bold text-studio-ink2">
                    Output device
                  </span>
                  <select
                    id="set-output-device"
                    className={inputCls}
                    disabled={devicePermission !== "granted"}
                  >
                    {outputDevices.length === 0 ? (
                      <option>
                        {devicePermission === "granted"
                          ? "System default"
                          : "Connect devices to list outputs"}
                      </option>
                    ) : (
                      outputDevices.map((d, i) => (
                        <option key={d.deviceId} value={d.deviceId}>
                          {d.label || `Output device ${i + 1}`}
                        </option>
                      ))
                    )}
                  </select>
                </label>
              </div>
              <div className="mt-4">
                <div className="mb-1.5 flex justify-between text-xs font-bold text-studio-ink2">
                  <span>Input gain</span>
                  <span className="tabular-nums text-studio-ink">{gain}%</span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={gain}
                  onChange={(e) => setGain(Number(e.target.value))}
                  className="w-full accent-studio-violet"
                  aria-label="Input gain"
                />
              </div>
              <SettingRow
                title="Noise suppression"
                detail="Filters crowd noise from your mic channel"
              >
                <Toggle
                  checked
                  onChange={() => undefined}
                  label="Noise suppression"
                />
              </SettingRow>
            </SectionCard>
          ) : null}

          {section === "Connected Accounts" ? (
            <SectionCard>
              <CardTitle>Connected Accounts</CardTitle>
              {[
                {
                  name: "Spotify",
                  detail: "Sync playlists and track IDs",
                  connected: true,
                  bg: "bg-[#1DB954]/15 text-[#1DB954]",
                  initials: "SP",
                },
                {
                  name: "Instagram",
                  detail: "Auto-post stream announcements",
                  connected: true,
                  bg: "bg-studio-pink/15 text-studio-pink",
                  initials: "IG",
                },
                {
                  name: "SoundCloud",
                  detail: "Import your mixes",
                  connected: false,
                  bg: "bg-[#ff7700]/15 text-[#ff8833]",
                  initials: "SC",
                },
                {
                  name: "Twitch",
                  detail: "Simulcast your streams",
                  connected: false,
                  bg: "bg-studio-violet/15 text-studio-violetB",
                  initials: "TW",
                },
              ].map((a) => (
                <SettingRow key={a.name} title={a.name} detail={a.detail}>
                  <span
                    className={cn(
                      "grid h-9 w-9 flex-none place-items-center rounded-xl text-xs font-extrabold",
                      a.bg
                    )}
                  >
                    {a.initials}
                  </span>
                  {a.connected ? (
                    <GlassButton className="!px-3 !py-1.5 text-xs">
                      Disconnect
                    </GlassButton>
                  ) : (
                    <GlassButton
                      variant="primary"
                      className="!px-3 !py-1.5 text-xs"
                    >
                      Connect
                    </GlassButton>
                  )}
                </SettingRow>
              ))}
            </SectionCard>
          ) : null}

          {section === "Stripe Connect" ? (
            <SectionCard className="border-[#635bff]/40 bg-gradient-to-br from-[#635bff]/[0.18] to-studio-blue/[0.08]">
              <CardTitle action={<Pill tone="good">Connected</Pill>}>
                Stripe Connect
              </CardTitle>
              <p className="text-[12.5px] text-studio-ink2">
                Payouts are sent to your Stripe Express account, then to Chase
                •••• 4821.
              </p>
              <div className="mt-3 space-y-1.5 text-[12.5px]">
                <div className="flex justify-between border-b border-white/10 py-1.5">
                  <span className="text-studio-ink2">Account</span>
                  <span className="font-bold tabular-nums">acct_1NovA…9x2</span>
                </div>
                <div className="flex justify-between border-b border-white/10 py-1.5">
                  <span className="text-studio-ink2">Payout schedule</span>
                  <span className="font-bold">Weekly · Mondays</span>
                </div>
                <div className="flex justify-between py-1.5">
                  <span className="text-studio-ink2">Platform fee</span>
                  <span className="font-bold tabular-nums">
                    8% per transaction
                  </span>
                </div>
              </div>
              <div className="mt-4 flex gap-2.5">
                <GlassButton>Open Stripe dashboard</GlassButton>
                <GlassButton>Change payout schedule</GlassButton>
              </div>
            </SectionCard>
          ) : null}

          {section === "Privacy" ? (
            <SectionCard>
              <CardTitle>Privacy</CardTitle>
              <SettingRow
                title="Public profile"
                detail="Anyone can find and book you"
              >
                <Toggle
                  checked={privacy.profilePublic}
                  onChange={(v) =>
                    setPrivacy((p) => ({ ...p, profilePublic: v }))
                  }
                  label="Public profile"
                />
              </SettingRow>
              <SettingRow
                title="Show earnings badges"
                detail="Display top-tipper leaderboards on streams"
              >
                <Toggle
                  checked={privacy.showEarnings}
                  onChange={(v) =>
                    setPrivacy((p) => ({ ...p, showEarnings: v }))
                  }
                  label="Show earnings badges"
                />
              </SettingRow>
              <SettingRow
                title="Direct messages"
                detail="Allow fans to message you"
              >
                <Toggle
                  checked={privacy.allowDMs}
                  onChange={(v) => setPrivacy((p) => ({ ...p, allowDMs: v }))}
                  label="Direct messages"
                />
              </SettingRow>
              <div className="mt-4 rounded-xl border border-studio-live/30 bg-studio-live/[0.07] p-3.5">
                <div className="text-[13px] font-bold text-[#FDA4AF]">
                  Danger zone
                </div>
                <p className="mt-0.5 text-xs text-studio-ink2">
                  Deactivating hides your profile and pauses all bookings.
                </p>
                <GlassButton
                  variant="danger"
                  className="mt-2.5 !px-3 !py-1.5 text-xs"
                >
                  Deactivate account
                </GlassButton>
              </div>
            </SectionCard>
          ) : null}
        </div>
      </div>
    </div>
  );
}
