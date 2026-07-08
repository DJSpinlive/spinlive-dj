"use client";

import {
  Activity,
  Check,
  Eye,
  GripVertical,
  ListMusic,
  Loader2,
  Megaphone,
  MessageSquare,
  Mic,
  MicOff,
  Music,
  Pin,
  Radio,
  Timer,
  Video,
  VideoOff,
  VolumeX,
  X,
} from "lucide-react";
import { ReactNode, useCallback, useEffect, useRef, useState } from "react";

import { LiveViewersSpark } from "@/components/studio/charts";
import {
  CardTitle,
  GlassButton,
  InitialsAvatar,
  Micro,
  SectionCard,
} from "@/components/studio/ui";
import { ChatConnection, openChatSocket } from "@/lib/studio/chatSocket";
import {
  BroadcastState,
  BrowserBroadcast,
  getPublishToken,
  startBrowserBroadcast,
} from "@/lib/studio/livekitPublisher";
import { cn } from "@/lib/utils";
import {
  useCreateStreamMutation,
  useEndStreamMutation,
  useGetStreamStateQuery,
  useGetUserQuery,
  useSetLiveStatusMutation,
} from "@/store/api";
import {
  ChatErrorPayload,
  ChatFrame,
  ChatMessagePayload,
  RoomClosedPayload,
  SongRequestPayload,
  TipNotificationPayload,
} from "@/types/chat.types";
import { StreamCredentials } from "@/types/streams.types";
import { getTokenFromCookie } from "@/utilities/clientCookies";

type RailTab = "requests" | "chat" | "analytics";
type Permission = "idle" | "requesting" | "granted" | "denied";

interface LiveMsg {
  id: string;
  userId: string;
  user: string;
  text: string;
  time: string;
  own: boolean;
}

interface QueueTrack {
  id: string;
  song: string;
  artist: string;
  user: string;
}

type SinkableVideo = HTMLVideoElement & {
  setSinkId?: (_id: string) => Promise<void>;
};

function fmtDuration(s: number) {
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
}

function fmtClock(iso?: string) {
  const d = iso ? new Date(iso) : new Date();
  return d.toLocaleTimeString("en-US", {
    hour12: false,
    hour: "2-digit",
    minute: "2-digit",
  });
}

function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/).slice(0, 2);
  return (
    parts.map((p) => p[0]?.toUpperCase() ?? "").join("") ||
    name.slice(0, 2).toUpperCase()
  );
}

function hueOf(name: string): number {
  let h = 0;
  for (let i = 0; i < name.length; i += 1) {
    h = (h * 31 + name.charCodeAt(i)) % 360;
  }
  return h;
}

function agoLabel(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  if (!Number.isFinite(diff) || diff < 20_000) return "just now";
  if (diff < 3_600_000) return `${Math.round(diff / 60_000)}m ago`;
  return `${Math.round(diff / 3_600_000)}h ago`;
}

/* ---------- Idle visualizer (shown when the camera is off) ---------- */
function PreviewCanvas({ live }: { live: boolean }) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return undefined;
    const ctx = canvas.getContext("2d");
    if (!ctx) return undefined;

    const reduced = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;
    let raf = 0;
    let t = 0;

    const draw = () => {
      const { width: w, height: h } = canvas;
      const g = ctx.createLinearGradient(0, 0, w, h);
      g.addColorStop(0, "#0d0716");
      g.addColorStop(0.55, "#150a26");
      g.addColorStop(1, "#1c0a1e");
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, w, h);

      const bars = 64;
      const bw = w / bars;
      for (let i = 0; i < bars; i += 1) {
        const amp = live ? 1 : 0.3;
        const v =
          (Math.sin(t * 0.045 + i * 0.55) * 0.5 + 0.5) *
          (Math.sin(t * 0.02 + i * 0.21) * 0.5 + 0.5) *
          amp;
        const bh = Math.max(3, v * h * 0.34);
        const hue = 262 + (i / bars) * 60;
        ctx.fillStyle = `hsla(${hue}, 85%, 65%, ${live ? 0.85 : 0.4})`;
        ctx.fillRect(i * bw + 1.5, h - bh - 14, bw - 3, bh);
      }
      t += 1;
      if (!reduced) raf = requestAnimationFrame(draw);
    };

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      canvas.width = rect.width;
      canvas.height = rect.height;
      if (reduced) draw();
    };
    resize();
    window.addEventListener("resize", resize);
    if (!reduced) raf = requestAnimationFrame(draw);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
    };
  }, [live]);

  return (
    <canvas ref={ref} className="absolute inset-0 h-full w-full" aria-hidden />
  );
}

const METER_SEGMENTS = Array.from({ length: 10 }, (_, i) => i);

/* ---------- Audio level meter — real level from the selected mic ---------- */
function AudioMeter({ level, muted }: { level: number; muted: boolean }) {
  const shown = muted ? 0 : level;
  return (
    <div
      className="ml-auto flex items-end gap-1.5 rounded-lg bg-studio-surface/80 px-2.5 py-1.5 backdrop-blur"
      aria-label="Audio levels"
    >
      {(["L", "R"] as const).map((channel, chIdx) => {
        const chLevel = Math.max(0, Math.round(shown - chIdx * 0.6));
        return (
          <div key={channel} className="flex flex-col items-center">
            <div className="flex flex-col-reverse gap-[2px]">
              {METER_SEGMENTS.map((seg) => (
                <span
                  key={seg}
                  className={cn(
                    "h-[3px] w-3.5 rounded-[1px]",
                    seg < chLevel
                      ? seg >= 9
                        ? "bg-studio-live"
                        : seg >= 7
                          ? "bg-studio-warn"
                          : "bg-studio-good"
                      : "bg-white/10"
                  )}
                />
              ))}
            </div>
            <span className="mt-1 text-[8.5px] font-bold tracking-widest text-studio-ink3">
              {channel}
            </span>
          </div>
        );
      })}
    </div>
  );
}

/* ---------- small local pieces ---------- */
const inputCls =
  "w-full rounded-xl border border-studio-line bg-studio-surface px-3 py-2 text-[13px] text-studio-ink placeholder:text-studio-ink3 focus:border-studio-violet focus:outline-none";

function Field({
  id,
  label,
  children,
  className,
}: {
  id: string;
  label: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <label htmlFor={id} className="text-xs font-bold text-studio-ink2">
        {label}
      </label>
      {children}
    </div>
  );
}

function ControlButton({
  on,
  onClick,
  label,
  children,
}: {
  on: boolean;
  onClick: () => void;
  label: string;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      className={cn(
        "grid h-[42px] w-[42px] place-items-center rounded-xl border transition-colors",
        on
          ? "border-studio-line2 bg-white/[0.06] text-studio-ink hover:bg-studio-surface3"
          : "border-studio-live/40 bg-studio-live/15 text-[#FDA4AF]"
      )}
    >
      {children}
    </button>
  );
}

function RailTabButton({
  active,
  onClick,
  count,
  children,
}: {
  active: boolean;
  onClick: () => void;
  count?: number;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex flex-1 items-center justify-center gap-1.5 border-b-2 px-1.5 py-3 text-xs font-bold transition-colors",
        active
          ? "border-studio-violet text-studio-violetB"
          : "border-transparent text-studio-ink3 hover:text-studio-ink2"
      )}
    >
      {children}
      {count !== undefined && count > 0 ? (
        <span className="min-w-4 rounded-full bg-studio-pink px-1.5 py-px text-[10px] font-extrabold text-[#14041c]">
          {count}
        </span>
      ) : null}
    </button>
  );
}

function StatTile({
  label,
  value,
  hot,
}: {
  label: string;
  value: string;
  hot?: boolean;
}) {
  return (
    <div className="rounded-xl border border-studio-line bg-white/[0.03] px-3 py-2.5">
      <div className="text-[9.5px] font-bold uppercase tracking-[0.14em] text-studio-ink3">
        {label}
      </div>
      <div
        className={cn(
          "mt-0.5 text-[19px] font-extrabold tabular-nums",
          hot && "text-studio-good"
        )}
      >
        {value}
      </div>
    </div>
  );
}

/* ==================================================================== */

export default function GoLiveStudio() {
  const { data: user } = useGetUserQuery();
  const [createStream, { isLoading: creating }] = useCreateStreamMutation();
  const [endStream, { isLoading: ending }] = useEndStreamMutation();
  const [setLiveStatus] = useSetLiveStatusMutation();

  const [creds, setCreds] = useState<StreamCredentials | null>(null);
  const [title, setTitle] = useState("Friday Deep House Sessions");
  const [live, setLive] = useState(false);
  const [duration, setDuration] = useState(0);
  const [tips, setTips] = useState(0);
  const [chatCount, setChatCount] = useState(0);
  const [peak, setPeak] = useState(0);
  const [sparkData, setSparkData] = useState<{ t: number; viewers: number }[]>(
    []
  );

  /* ---------- real capture devices ---------- */
  const [permission, setPermission] = useState<Permission>("idle");
  const [mediaStream, setMediaStream] = useState<MediaStream | null>(null);
  const [mics, setMics] = useState<MediaDeviceInfo[]>([]);
  const [cams, setCams] = useState<MediaDeviceInfo[]>([]);
  const [speakers, setSpeakers] = useState<MediaDeviceInfo[]>([]);
  const [micId, setMicId] = useState("");
  const [camId, setCamId] = useState("");
  const [speakerId, setSpeakerId] = useState("");
  const [micOn, setMicOn] = useState(true);
  const [camOn, setCamOn] = useState(true);
  const [audioLevel, setAudioLevel] = useState(0);
  const videoRef = useRef<SinkableVideo>(null);
  const mediaRef = useRef<MediaStream | null>(null);

  /* ---------- browser A/V publishing (WebRTC via LiveKit) ---------- */
  const publisherRef = useRef<BrowserBroadcast | null>(null);
  const [broadcast, setBroadcast] = useState<BroadcastState | "off">("off");
  const [localKbps, setLocalKbps] = useState<number | null>(null);
  const [publishQuality, setPublishQuality] = useState<string | null>(null);

  /* ---------- realtime chat ---------- */
  const connRef = useRef<ChatConnection | null>(null);
  const [chatConnected, setChatConnected] = useState(false);
  const [messages, setMessages] = useState<LiveMsg[]>([]);
  const [requests, setRequests] = useState<SongRequestPayload[]>([]);
  const [queue, setQueue] = useState<QueueTrack[]>([]);
  const [handled, setHandled] = useState(0);
  const [pinned, setPinned] = useState<string | null>(null);
  const [chatInput, setChatInput] = useState("");
  const [mutedIds, setMutedIds] = useState<string[]>([]);
  const dragIndex = useRef<number | null>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const reqSeq = useRef(0);

  const [tab, setTab] = useState<RailTab>("requests");
  const [toast, setToast] = useState<string | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const notify = useCallback((msg: string) => {
    setToast(msg);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 2600);
  }, []);

  /* ---------- live stream state (health, listeners) polled while live ---------- */
  const { data: streamState } = useGetStreamStateQuery(creds?.stream_id ?? "", {
    skip: !live || !creds,
    pollingInterval: 10_000,
  });
  const viewers = Number(streamState?.listener_count ?? 0);

  useEffect(() => {
    if (!live || !streamState) return;
    const v = Number(streamState.listener_count ?? 0);
    setPeak((p) => Math.max(p, v, Number(streamState.peak_listeners ?? 0)));
    setSparkData((s) => [...s.slice(-40), { t: Date.now(), viewers: v }]);
  }, [streamState, live]);

  /* duration ticker */
  useEffect(() => {
    if (!live) return undefined;
    const id = setInterval(() => setDuration((d) => d + 1), 1000);
    return () => clearInterval(id);
  }, [live]);

  /* outbound bitrate from WebRTC sender stats while browser-publishing */
  useEffect(() => {
    if (broadcast !== "publishing") {
      setLocalKbps(null);
      return undefined;
    }
    const id = setInterval(() => {
      publisherRef.current
        ?.getBitrateKbps()
        .then((kbps) => setLocalKbps(kbps))
        .catch(() => undefined);
    }, 3000);
    return () => clearInterval(id);
  }, [broadcast]);

  /* ---------- device capture ---------- */
  const stopTracks = () => {
    mediaRef.current?.getTracks().forEach((t) => t.stop());
    mediaRef.current = null;
  };

  const refreshDeviceLists = useCallback(async () => {
    const devices = await navigator.mediaDevices.enumerateDevices();
    setMics(devices.filter((d) => d.kind === "audioinput"));
    setCams(devices.filter((d) => d.kind === "videoinput"));
    setSpeakers(devices.filter((d) => d.kind === "audiooutput"));
  }, []);

  const requestMedia = useCallback(
    async (nextMicId?: string, nextCamId?: string) => {
      setPermission((p) => (p === "granted" ? p : "requesting"));
      const audio: MediaTrackConstraints | boolean = nextMicId
        ? { deviceId: { exact: nextMicId } }
        : true;
      const video: MediaTrackConstraints | boolean = nextCamId
        ? { deviceId: { exact: nextCamId } }
        : true;
      try {
        let stream: MediaStream;
        try {
          stream = await navigator.mediaDevices.getUserMedia({ audio, video });
        } catch {
          // No camera (or camera blocked) — fall back to audio only.
          stream = await navigator.mediaDevices.getUserMedia({ audio });
        }
        stopTracks();
        mediaRef.current = stream;
        setMediaStream(stream);
        setPermission("granted");
        setMicId(stream.getAudioTracks()[0]?.getSettings().deviceId ?? "");
        setCamId(stream.getVideoTracks()[0]?.getSettings().deviceId ?? "");
        setCamOn(stream.getVideoTracks().length > 0);
        await refreshDeviceLists();
        // Broadcasting from the browser? Swap the published tracks too.
        if (publisherRef.current) {
          await publisherRef.current.publishStream(stream).catch(() => {
            setBroadcast("failed");
          });
        }
      } catch {
        setPermission("denied");
      }
    },
    [refreshDeviceLists]
  );

  /* keep device lists fresh when hardware is (un)plugged */
  useEffect(() => {
    if (permission !== "granted") return undefined;
    const onChange = () => refreshDeviceLists();
    navigator.mediaDevices.addEventListener("devicechange", onChange);
    return () =>
      navigator.mediaDevices.removeEventListener("devicechange", onChange);
  }, [permission, refreshDeviceLists]);

  /* attach camera stream to the preview element */
  useEffect(() => {
    if (videoRef.current && mediaStream) {
      videoRef.current.srcObject = mediaStream;
    }
  }, [mediaStream]);

  /* route preview audio to the selected output device where supported */
  useEffect(() => {
    if (speakerId && videoRef.current?.setSinkId) {
      videoRef.current.setSinkId(speakerId).catch(() => undefined);
    }
  }, [speakerId]);

  /* real audio level from the selected microphone */
  useEffect(() => {
    if (!mediaStream || mediaStream.getAudioTracks().length === 0) {
      setAudioLevel(0);
      return undefined;
    }
    const AudioCtx =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext: typeof AudioContext })
        .webkitAudioContext;
    const ctx = new AudioCtx();
    const source = ctx.createMediaStreamSource(mediaStream);
    const analyser = ctx.createAnalyser();
    analyser.fftSize = 512;
    source.connect(analyser);
    const buf = new Uint8Array(analyser.frequencyBinCount);
    const id = setInterval(() => {
      analyser.getByteTimeDomainData(buf);
      let sum = 0;
      for (let i = 0; i < buf.length; i += 1) {
        const v = (buf[i] - 128) / 128;
        sum += v * v;
      }
      const rms = Math.sqrt(sum / buf.length);
      setAudioLevel(Math.min(10, Math.round(rms * 32)));
    }, 130);
    return () => {
      clearInterval(id);
      source.disconnect();
      ctx.close().catch(() => undefined);
    };
  }, [mediaStream]);

  const toggleMic = () => {
    const next = !micOn;
    mediaRef.current?.getAudioTracks().forEach((t) => {
      const track = t;
      track.enabled = next;
    });
    setMicOn(next);
  };

  const toggleCam = () => {
    const next = !camOn;
    mediaRef.current?.getVideoTracks().forEach((t) => {
      const track = t;
      track.enabled = next;
    });
    setCamOn(next);
  };

  /* ---------- chat socket ---------- */
  const closeChat = useCallback(() => {
    connRef.current?.close();
    connRef.current = null;
    setChatConnected(false);
  }, []);

  const onFrame = useCallback(
    (frame: ChatFrame) => {
      switch (frame.type) {
        case "chat.message": {
          const p = frame.payload as ChatMessagePayload;
          setMessages((m) => [
            ...m.slice(-60),
            {
              id: p.id,
              userId: p.user_id,
              user: p.user_name,
              text: p.body,
              time: fmtClock(p.created_at),
              own: p.user_id === user?.id,
            },
          ]);
          setChatCount((c) => c + 1);
          break;
        }
        case "request.new": {
          const p = frame.payload as SongRequestPayload;
          setRequests((rs) => [p, ...rs]);
          notify(`🎶 ${p.user_name} requested “${p.title}”`);
          break;
        }
        case "tip.notification": {
          const p = frame.payload as TipNotificationPayload;
          const amount = Number(p.amount);
          if (Number.isFinite(amount)) setTips((t) => t + amount);
          notify(
            `💸 ${p.from_name} tipped ${p.currency} ${p.amount}${p.message ? ` — “${p.message}”` : ""}`
          );
          break;
        }
        case "room_closed": {
          const p = frame.payload as RoomClosedPayload;
          if (!creds || p.room_id === creds.stream_id) {
            notify("Stream room closed by the server.");
            closeChat();
            publisherRef.current?.close();
            publisherRef.current = null;
            setBroadcast("off");
            setLive(false);
            setCreds(null);
            setLiveStatus({ is_live: false });
          }
          break;
        }
        case "error": {
          const p = frame.payload as ChatErrorPayload;
          notify(p.message ?? `Chat error: ${p.code}`);
          break;
        }
        default:
          break;
      }
    },
    [user?.id, creds, notify, closeChat, setLiveStatus]
  );

  const sendFrame = (type: string, payload: unknown) => {
    if (!connRef.current) {
      notify("Chat isn't connected.");
      return false;
    }
    reqSeq.current += 1;
    connRef.current.send(type, payload, String(reqSeq.current));
    return true;
  };

  useEffect(
    () => () => {
      // Unmount: release camera/mic, stop publishing, drop the socket.
      stopTracks();
      publisherRef.current?.close();
      connRef.current?.close();
    },
    []
  );

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ block: "end" });
  }, [messages]);

  /* ---------- go live / end ---------- */
  const toggleLive = async () => {
    if (live) {
      try {
        await publisherRef.current?.close();
        publisherRef.current = null;
        setBroadcast("off");
        if (creds) await endStream(creds.stream_id).unwrap();
        setLiveStatus({ is_live: false });
        closeChat();
        setLive(false);
        setCreds(null);
        notify(
          `Stream ended — ${fmtDuration(duration)}, peak ${peak} listeners, $${tips.toFixed(0)} in tips`
        );
      } catch {
        notify("Couldn't end the stream — try again.");
      }
      return;
    }

    const streamTitle = title.trim();
    if (!streamTitle) {
      notify("Give your stream a title first.");
      return;
    }
    try {
      const credentials = await createStream({ title: streamTitle }).unwrap();
      setCreds(credentials);
      setLiveStatus({ is_live: true });
      setLive(true);
      setDuration(0);
      setTips(0);
      setChatCount(0);
      setPeak(0);
      setHandled(0);
      setMessages([]);
      setRequests([]);
      setQueue([]);
      setSparkData([]);

      // Browser broadcast (WebRTC) — needs the DJ publish token and captured
      // devices; otherwise the DJ pushes via OBS using the RTMP ingest.
      const publishToken = getPublishToken(credentials);
      if (publishToken && mediaRef.current) {
        try {
          const pub = await startBrowserBroadcast({
            url: credentials.livekit_url,
            token: publishToken,
            onState: setBroadcast,
            onQuality: (q) => setPublishQuality(String(q)),
          });
          await pub.publishStream(mediaRef.current);
          publisherRef.current = pub;
          notify("You're live — broadcasting from this browser 🎙️");
        } catch {
          setBroadcast("failed");
          notify("Browser broadcast failed — use OBS with the RTMP ingest.");
        }
      } else if (publishToken && !mediaRef.current) {
        setBroadcast("off");
        notify(
          "Enable your camera & mic to broadcast from the browser — or use OBS."
        );
      } else {
        setBroadcast("off");
        notify("Stream created! Point your encoder at the RTMP ingest below.");
      }

      const jwt = getTokenFromCookie();
      if (!jwt) {
        notify("No auth token — chat unavailable.");
        return;
      }
      try {
        const conn = await openChatSocket({
          jwt,
          roomId: credentials.stream_id,
          ticketUrl: credentials.chat_ticket_url,
          wsUrl: credentials.chat_ws_url,
          onFrame,
          onClose: () => setChatConnected(false),
        });
        connRef.current = conn;
        setChatConnected(true);
      } catch (e) {
        notify(
          `Chat couldn't connect (stream is still live) — ${e instanceof Error ? e.message : "unknown error"}`
        );
      }
    } catch {
      notify("Couldn't create the stream — are you already live?");
    }
  };

  /* ---------- DJ actions over the socket ---------- */
  const acceptRequest = (r: SongRequestPayload) => {
    if (!sendFrame("request.accept", { id: r.id })) return;
    setRequests((rs) => rs.filter((x) => x.id !== r.id));
    setQueue((q) => [
      ...q,
      {
        id: r.id,
        song: r.title,
        artist: r.artist ?? "Unknown artist",
        user: r.user_name,
      },
    ]);
    setHandled((n) => n + 1);
    notify(`Added “${r.title}” to the queue`);
  };

  const declineRequest = (r: SongRequestPayload) => {
    if (!sendFrame("request.decline", { id: r.id, reason: "not tonight" })) {
      return;
    }
    setRequests((rs) => rs.filter((x) => x.id !== r.id));
    setHandled((n) => n + 1);
    notify(`Declined request from ${r.user_name}`);
  };

  const sendChat = () => {
    const text = chatInput.trim();
    if (!text) return;
    if (sendFrame("chat.send", { body: text })) setChatInput("");
  };

  const sendShoutout = () => {
    const text = chatInput.trim();
    if (!text) return;
    if (sendFrame("moderation.shoutout", { body: text })) {
      setChatInput("");
      notify("Shoutout sent 📣");
    }
  };

  const pinMessage = (m: LiveMsg) => {
    if (sendFrame("moderation.pin", { message_id: m.id })) {
      setPinned(`${m.user}: ${m.text}`);
      notify("Message pinned");
    }
  };

  const muteUser = (m: LiveMsg) => {
    if (sendFrame("moderation.mute", { user_id: m.userId, reason: "spam" })) {
      setMutedIds((u) => (u.includes(m.userId) ? u : [...u, m.userId]));
      notify(`${m.user} muted for this stream`);
    }
  };

  const onDrop = (to: number) => {
    const from = dragIndex.current;
    dragIndex.current = null;
    if (from === null || from === to) return;
    setQueue((q) => {
      const next = [...q];
      const [moved] = next.splice(from, 1);
      next.splice(to, 0, moved);
      return next;
    });
  };

  // Browser publish path: bitrate/health come from WebRTC sender stats —
  // the server's values only track the RTMP ingress (OBS path).
  const browserPublishing = broadcast === "publishing";
  const health = browserPublishing
    ? (publishQuality ?? "publishing")
    : (streamState?.health_status ??
      (live ? "waiting for encoder" : "standby"));
  const bitrate =
    browserPublishing && localKbps != null
      ? `${localKbps} kbps`
      : streamState?.bitrate_kbps
        ? `${streamState.bitrate_kbps} kbps`
        : "—";
  const hasCamera = (mediaStream?.getVideoTracks().length ?? 0) > 0;

  return (
    <div className="grid grid-cols-[1fr_380px] items-start gap-4 max-xl:grid-cols-1">
      {/* ================= CENTER: STUDIO ================= */}
      <div className="flex flex-col gap-4">
        {/* Preview */}
        <SectionCard className="overflow-hidden p-0">
          <div className="relative aspect-video bg-[#07070d]">
            {permission === "granted" && hasCamera && camOn ? (
              <video
                ref={videoRef}
                autoPlay
                muted
                playsInline
                className="absolute inset-0 h-full w-full object-cover"
              />
            ) : (
              <PreviewCanvas live={live} />
            )}

            {permission !== "granted" ? (
              <div className="absolute inset-0 grid place-items-center bg-[#07070d]/85">
                <div className="max-w-xs text-center">
                  <Video className="mx-auto mb-2 text-studio-ink3" size={28} />
                  <p className="text-[13px] font-bold">
                    Connect your camera & microphone
                  </p>
                  <p className="mt-1 text-xs text-studio-ink2">
                    Your browser will ask for permission — that&apos;s the
                    signal your stream preview and meters use.
                  </p>
                  {permission === "denied" ? (
                    <p className="mt-2 text-xs font-semibold text-studio-warn">
                      Permission denied — allow camera/mic in your
                      browser&apos;s site settings, then retry.
                    </p>
                  ) : null}
                  <GlassButton
                    variant="gradient"
                    className="mt-3"
                    disabled={permission === "requesting"}
                    onClick={() => requestMedia()}
                  >
                    {permission === "requesting" ? (
                      <Loader2 size={14} className="animate-spin" />
                    ) : (
                      <Mic size={14} />
                    )}
                    Enable devices
                  </GlassButton>
                </div>
              </div>
            ) : !hasCamera || !camOn ? (
              <div className="absolute inset-0 grid place-items-center bg-[#07070d]/60">
                <div className="text-center text-studio-ink3">
                  <VideoOff className="mx-auto mb-2" size={28} />
                  <div className="text-xs font-bold uppercase tracking-widest">
                    {hasCamera ? "Camera off" : "No camera detected"}
                  </div>
                </div>
              </div>
            ) : null}

            {/* overlays */}
            <div className="pointer-events-none absolute inset-0 flex flex-col justify-between p-3.5">
              <div className="flex items-center gap-2">
                <span
                  className={cn(
                    "flex items-center gap-1.5 rounded-md px-3 py-1 text-[11px] font-extrabold tracking-[0.12em] backdrop-blur",
                    live
                      ? "bg-studio-live text-white"
                      : "bg-studio-surface/80 text-studio-ink2"
                  )}
                >
                  <span
                    className={cn(
                      "h-1.5 w-1.5 rounded-full",
                      live ? "animate-pulse bg-white" : "bg-studio-ink3"
                    )}
                  />
                  {live ? "LIVE" : "OFFLINE"}
                </span>
                <span className="flex items-center gap-1.5 rounded-md bg-studio-surface/80 px-2.5 py-1 text-[11.5px] font-bold tabular-nums text-studio-ink2 backdrop-blur">
                  <Timer size={13} /> {fmtDuration(duration)}
                </span>
                <span className="flex items-center gap-1.5 rounded-md bg-studio-surface/80 px-2.5 py-1 text-[11.5px] font-bold tabular-nums text-studio-ink2 backdrop-blur">
                  <Eye size={13} /> {live ? viewers.toLocaleString() : "—"}
                </span>
              </div>
              <div className="flex items-end gap-2">
                <span className="flex items-center gap-1.5 rounded-md bg-studio-surface/80 px-2.5 py-1 text-[11.5px] font-bold tabular-nums text-studio-ink2 backdrop-blur">
                  <Activity size={13} /> {bitrate}
                </span>
                <span
                  className={cn(
                    "flex items-center gap-1.5 rounded-md bg-studio-surface/80 px-2.5 py-1 text-[11.5px] font-bold capitalize backdrop-blur",
                    live ? "text-studio-good" : "text-studio-ink2"
                  )}
                >
                  <span
                    className={cn(
                      "h-1.5 w-1.5 rounded-full",
                      live ? "bg-studio-good" : "bg-studio-ink3"
                    )}
                  />
                  Health: {health}
                </span>
                <AudioMeter level={audioLevel} muted={!micOn} />
              </div>
            </div>
          </div>

          {/* control bar */}
          <div className="flex items-center gap-2.5 border-t border-studio-line bg-white/[0.02] px-4 py-3">
            <ControlButton
              on={micOn}
              onClick={toggleMic}
              label={micOn ? "Mute microphone" : "Unmute microphone"}
            >
              {micOn ? <Mic size={18} /> : <MicOff size={18} />}
            </ControlButton>
            <ControlButton
              on={camOn}
              onClick={toggleCam}
              label={camOn ? "Turn camera off" : "Turn camera on"}
            >
              {camOn ? <Video size={18} /> : <VideoOff size={18} />}
            </ControlButton>

            <button
              type="button"
              onClick={toggleLive}
              disabled={creating || ending}
              className={cn(
                "ml-auto rounded-xl px-8 py-3 text-sm font-extrabold tracking-[0.08em] text-white transition-all hover:-translate-y-px hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60",
                live
                  ? "bg-studio-live shadow-[0_6px_24px_rgba(244,63,94,0.4)]"
                  : "bg-studio-grad shadow-[0_6px_24px_rgba(139,92,246,0.45)] hover:bg-studio-grad-hover"
              )}
            >
              {creating
                ? "STARTING…"
                : ending
                  ? "ENDING…"
                  : live
                    ? "END STREAM"
                    : "GO LIVE"}
            </button>
          </div>
        </SectionCard>

        {/* Devices */}
        <SectionCard>
          <CardTitle
            action={
              permission === "granted" ? (
                <span className="text-[11px] font-semibold text-studio-good">
                  Devices connected
                </span>
              ) : undefined
            }
          >
            Input & Output Devices
          </CardTitle>
          <div className="grid grid-cols-3 gap-3.5 max-md:grid-cols-1">
            <Field id="dev-mic" label="Microphone (input)">
              <select
                id="dev-mic"
                className={inputCls}
                value={micId}
                disabled={permission !== "granted"}
                onChange={(e) => requestMedia(e.target.value, camId)}
              >
                {mics.length === 0 ? (
                  <option value="">No microphone found</option>
                ) : (
                  mics.map((d, i) => (
                    <option key={d.deviceId} value={d.deviceId}>
                      {d.label || `Microphone ${i + 1}`}
                    </option>
                  ))
                )}
              </select>
            </Field>
            <Field id="dev-cam" label="Camera (input)">
              <select
                id="dev-cam"
                className={inputCls}
                value={camId}
                disabled={permission !== "granted"}
                onChange={(e) => requestMedia(micId, e.target.value)}
              >
                {cams.length === 0 ? (
                  <option value="">No camera found</option>
                ) : (
                  cams.map((d, i) => (
                    <option key={d.deviceId} value={d.deviceId}>
                      {d.label || `Camera ${i + 1}`}
                    </option>
                  ))
                )}
              </select>
            </Field>
            <Field id="dev-speaker" label="Speakers (output)">
              <select
                id="dev-speaker"
                className={inputCls}
                value={speakerId}
                disabled={permission !== "granted" || speakers.length === 0}
                onChange={(e) => setSpeakerId(e.target.value)}
              >
                {speakers.length === 0 ? (
                  <option value="">System default</option>
                ) : (
                  speakers.map((d, i) => (
                    <option key={d.deviceId} value={d.deviceId}>
                      {d.label || `Speakers ${i + 1}`}
                    </option>
                  ))
                )}
              </select>
            </Field>
          </div>
          <Micro className="mt-3">
            The preview and meters run off these devices. To broadcast, feed the
            RTMP ingest below into OBS (or your hardware encoder) using the same
            devices.
          </Micro>
        </SectionCard>

        {/* Ingest credentials — appears once the stream is provisioned */}
        {creds ? (
          <SectionCard className="border-studio-violet/35 bg-studio-violet/[0.06]">
            <CardTitle>Encoder Connection</CardTitle>
            <Micro className="mb-2.5">
              {broadcast === "publishing"
                ? "You're broadcasting from this browser — OBS is optional. These credentials still work if you'd rather switch to a hardware encoder."
                : "Point OBS or your hardware encoder at this ingest. Keep the key secret."}
            </Micro>
            <div className="grid grid-cols-2 gap-3.5 max-md:grid-cols-1">
              {(
                [
                  { label: "RTMP URL", value: creds.rtmp_url },
                  { label: "Stream key", value: creds.stream_key, mask: true },
                  { label: "HLS playback", value: creds.hls_url },
                  { label: "Room", value: creds.room_name },
                ] as const
              ).map((f) => (
                <div key={f.label} className="flex flex-col gap-1">
                  <span className="text-xs font-bold text-studio-ink2">
                    {f.label}
                  </span>
                  <div className="flex gap-1.5">
                    <input
                      readOnly
                      type={"mask" in f && f.mask ? "password" : "text"}
                      value={f.value}
                      aria-label={f.label}
                      className={cn(inputCls, "flex-1 tabular-nums")}
                      onFocus={(e) => e.target.select()}
                    />
                    <GlassButton
                      className="!px-3 !py-1.5 text-xs"
                      onClick={() => {
                        navigator.clipboard?.writeText(f.value);
                        notify(`${f.label} copied`);
                      }}
                    >
                      Copy
                    </GlassButton>
                  </div>
                </div>
              ))}
            </div>
          </SectionCard>
        ) : null}

        {/* Stream information */}
        <SectionCard>
          <CardTitle>Stream Information</CardTitle>
          <div className="grid grid-cols-2 gap-3.5 max-md:grid-cols-1">
            <Field id="stream-title" label="Stream Title">
              <input
                id="stream-title"
                className={inputCls}
                value={title}
                maxLength={200}
                onChange={(e) => setTitle(e.target.value)}
              />
            </Field>
            <Field id="stream-chat-status" label="Chat">
              <div
                id="stream-chat-status"
                className={cn(
                  "flex items-center gap-2 rounded-xl border border-studio-line bg-studio-surface px-3 py-2 text-[13px] font-bold",
                  chatConnected ? "text-studio-good" : "text-studio-ink3"
                )}
              >
                <span
                  className={cn(
                    "h-2 w-2 rounded-full",
                    chatConnected ? "bg-studio-good" : "bg-studio-ink3"
                  )}
                />
                {chatConnected ? "Connected (DJ role)" : "Offline"}
              </div>
            </Field>
            <Field id="stream-broadcast-source" label="Broadcast source">
              <div
                id="stream-broadcast-source"
                className={cn(
                  "flex items-center gap-2 rounded-xl border border-studio-line bg-studio-surface px-3 py-2 text-[13px] font-bold",
                  broadcast === "publishing"
                    ? "text-studio-good"
                    : broadcast === "failed"
                      ? "text-studio-warn"
                      : "text-studio-ink2"
                )}
              >
                <span
                  className={cn(
                    "h-2 w-2 rounded-full",
                    broadcast === "publishing"
                      ? "bg-studio-good"
                      : broadcast === "connecting" ||
                          broadcast === "reconnecting"
                        ? "animate-pulse bg-studio-warn"
                        : broadcast === "failed"
                          ? "bg-studio-warn"
                          : "bg-studio-ink3"
                  )}
                />
                {broadcast === "publishing"
                  ? "This browser (WebRTC)"
                  : broadcast === "connecting"
                    ? "Connecting…"
                    : broadcast === "reconnecting"
                      ? "Reconnecting…"
                      : broadcast === "failed"
                        ? "Browser failed — use OBS"
                        : "OBS / RTMP encoder"}
              </div>
            </Field>
          </div>
        </SectionCard>
      </div>

      {/* ================= RIGHT RAIL ================= */}
      <SectionCard className="sticky top-0 flex h-[calc(100vh-110px)] min-h-[540px] flex-col overflow-hidden p-0">
        <div className="flex border-b border-studio-line bg-white/[0.02]">
          <RailTabButton
            active={tab === "requests"}
            onClick={() => setTab("requests")}
            count={requests.length}
          >
            <Music size={14} /> Requests
          </RailTabButton>
          <RailTabButton active={tab === "chat"} onClick={() => setTab("chat")}>
            <MessageSquare size={14} /> Chat
          </RailTabButton>
          <RailTabButton
            active={tab === "analytics"}
            onClick={() => setTab("analytics")}
          >
            <Activity size={14} /> Analytics
          </RailTabButton>
        </div>

        {/* --- Requests tab --- */}
        {tab === "requests" ? (
          <div className="studio-scroll flex flex-1 flex-col gap-2.5 overflow-y-auto p-3.5">
            <Micro>Incoming — {requests.length}</Micro>
            {requests.length === 0 ? (
              <div className="py-8 text-center text-studio-ink3">
                <Music className="mx-auto mb-2" size={20} />
                <p className="text-[13px] font-semibold text-studio-ink2">
                  No pending requests
                </p>
                <p className="text-xs">
                  {live
                    ? "New requests land here the moment fans send them."
                    : "Go live and fan requests will land here in real time."}
                </p>
              </div>
            ) : (
              requests.map((r) => (
                <div
                  key={r.id}
                  className="rounded-xl border border-studio-line bg-white/[0.03] p-3"
                >
                  <div className="flex items-center gap-2.5">
                    <InitialsAvatar
                      initials={initialsOf(r.user_name)}
                      hue={hueOf(r.user_name)}
                      size={28}
                    />
                    <div>
                      <div className="text-[12.5px] font-bold">
                        {r.user_name}
                      </div>
                      <div className="text-[10.5px] text-studio-ink3">
                        {agoLabel(r.submitted_at)}
                      </div>
                    </div>
                  </div>
                  <div className="my-2.5 flex items-center gap-2.5 rounded-lg border border-studio-line bg-studio-surface px-2.5 py-2">
                    <span
                      className="grid h-8 w-8 flex-none place-items-center rounded-md text-white"
                      style={{
                        background: `linear-gradient(135deg, hsl(${hueOf(r.user_name)} 60% 40%), hsl(${hueOf(r.user_name) + 60} 70% 55%))`,
                      }}
                    >
                      <Music size={14} />
                    </span>
                    <div className="min-w-0">
                      <div className="truncate text-[12.5px] font-bold leading-tight">
                        {r.title}
                      </div>
                      <div className="truncate text-[11.5px] text-studio-ink2">
                        {r.artist ?? "Unknown artist"}
                        {r.note ? ` · “${r.note}”` : ""}
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <GlassButton
                      variant="good"
                      className="flex-1 !py-1.5 text-xs"
                      onClick={() => acceptRequest(r)}
                    >
                      <Check size={13} /> Accept
                    </GlassButton>
                    <GlassButton
                      variant="danger"
                      className="flex-1 !py-1.5 text-xs"
                      onClick={() => declineRequest(r)}
                    >
                      <X size={13} /> Decline
                    </GlassButton>
                  </div>
                </div>
              ))
            )}

            <div className="mt-2 flex items-center gap-2">
              <ListMusic size={14} className="text-studio-violetB" />
              <Micro className="!text-studio-violetB">
                Now Playing Queue — drag to reorder
              </Micro>
            </div>
            {queue.length === 0 ? (
              <div className="rounded-xl border border-dashed border-studio-line2 p-3.5 text-center text-xs text-studio-ink3">
                Accepted requests stack up here.
              </div>
            ) : (
              queue.map((q, i) => (
                <div
                  key={q.id}
                  draggable
                  onDragStart={() => {
                    dragIndex.current = i;
                  }}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={() => onDrop(i)}
                  className={cn(
                    "flex cursor-grab items-center gap-2.5 rounded-xl border p-2.5 active:cursor-grabbing",
                    i === 0
                      ? "border-studio-violet/45 bg-studio-violet/10"
                      : "border-studio-line bg-white/[0.03]"
                  )}
                >
                  <GripVertical
                    size={14}
                    className="flex-none text-studio-ink3"
                  />
                  <span className="w-5 flex-none text-center text-xs font-extrabold tabular-nums text-studio-ink3">
                    {i + 1}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-[12.5px] font-bold">
                      {q.song}
                    </div>
                    <div className="truncate text-[11px] text-studio-ink2">
                      {q.artist} · {q.user}
                    </div>
                  </div>
                  {i === 0 ? (
                    <span
                      className="studio-eq flex h-3.5 items-end gap-[2px]"
                      aria-label="Now playing"
                    >
                      <i className="h-full" />
                      <i className="h-full" />
                      <i className="h-full" />
                    </span>
                  ) : null}
                </div>
              ))
            )}
          </div>
        ) : null}

        {/* --- Chat tab --- */}
        {tab === "chat" ? (
          <div className="flex min-h-0 flex-1 flex-col">
            {pinned ? (
              <div className="border-b border-studio-violet/35 bg-gradient-to-b from-[#231a3d] to-[#1b1530] px-3.5 py-2.5 text-xs">
                <div className="mb-0.5 flex items-center gap-1.5 text-[10px] font-extrabold uppercase tracking-widest text-studio-violetB">
                  <Pin size={11} /> Pinned by {user?.display_name ?? "you"}
                </div>
                {pinned}
              </div>
            ) : null}
            <div className="studio-scroll min-h-0 flex-1 overflow-y-auto p-3">
              {messages.length === 0 ? (
                <div className="py-10 text-center text-studio-ink3">
                  <MessageSquare className="mx-auto mb-2" size={20} />
                  <p className="text-[13px] font-semibold text-studio-ink2">
                    {chatConnected ? "Chat is quiet — for now" : "Chat offline"}
                  </p>
                  <p className="text-xs">
                    {chatConnected
                      ? "Fan messages appear here in real time."
                      : "Go live to open the room."}
                  </p>
                </div>
              ) : (
                messages.map((m) => (
                  <div
                    key={m.id}
                    className="group relative rounded-lg px-2 py-1 text-[12.5px] hover:bg-white/5"
                  >
                    <span
                      className={cn(
                        "font-extrabold",
                        m.own ? "text-studio-good" : "text-studio-blue"
                      )}
                    >
                      {m.own ? (
                        <span className="mr-1 rounded bg-studio-good/15 px-1 py-px align-[2px] text-[8.5px] font-extrabold tracking-wider text-studio-good">
                          DJ
                        </span>
                      ) : null}
                      {m.user}
                    </span>{" "}
                    <span
                      className={cn(
                        "text-studio-ink2",
                        mutedIds.includes(m.userId) && "line-through opacity-40"
                      )}
                    >
                      {mutedIds.includes(m.userId)
                        ? "message hidden (user muted)"
                        : m.text}
                    </span>
                    {!m.own ? (
                      <span className="absolute -top-2.5 right-1.5 hidden gap-0.5 rounded-lg border border-studio-line2 bg-studio-surface3 p-0.5 shadow-xl group-hover:flex">
                        <button
                          type="button"
                          title="Pin message"
                          aria-label={`Pin message from ${m.user}`}
                          onClick={() => pinMessage(m)}
                          className="grid h-6 w-6 place-items-center rounded-md text-studio-ink2 hover:bg-white/10 hover:text-studio-ink"
                        >
                          <Pin size={12} />
                        </button>
                        <button
                          type="button"
                          title="Mute user"
                          aria-label={`Mute ${m.user}`}
                          onClick={() => muteUser(m)}
                          className="grid h-6 w-6 place-items-center rounded-md text-studio-ink2 hover:bg-white/10 hover:text-studio-ink"
                        >
                          <VolumeX size={12} />
                        </button>
                      </span>
                    ) : null}
                  </div>
                ))
              )}
              <div ref={chatEndRef} />
            </div>
            <div className="border-t border-studio-line bg-studio-surface p-3">
              <div className="flex gap-2">
                <input
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && sendChat()}
                  placeholder={
                    chatConnected ? "Say something…" : "Chat is offline"
                  }
                  disabled={!chatConnected}
                  aria-label="Chat message"
                  className="w-full min-w-0 flex-1 rounded-lg border border-studio-line2 bg-white/5 px-3 py-2 text-[12.5px] placeholder:text-studio-ink3 focus:border-studio-violet focus:outline-none disabled:opacity-40"
                />
                <GlassButton
                  className="!px-3 !py-2"
                  onClick={sendShoutout}
                  disabled={!chatConnected}
                  variant="default"
                >
                  <Megaphone size={14} />
                </GlassButton>
                <GlassButton
                  variant="primary"
                  className="!px-3.5 !py-2"
                  onClick={sendChat}
                  disabled={!chatConnected}
                >
                  Send
                </GlassButton>
              </div>
            </div>
          </div>
        ) : null}

        {/* --- Analytics tab --- */}
        {tab === "analytics" ? (
          <div className="studio-scroll flex flex-1 flex-col gap-2.5 overflow-y-auto p-3.5">
            <div className="rounded-xl border border-studio-line bg-white/[0.03] p-3">
              <Micro>Listeners — polled every 10s</Micro>
              <LiveViewersSpark
                data={sparkData.length ? sparkData : [{ t: 0, viewers: 0 }]}
              />
            </div>
            <div className="grid grid-cols-2 gap-2.5">
              <StatTile
                label="Current Listeners"
                value={live ? viewers.toLocaleString() : "—"}
                hot={live}
              />
              <StatTile
                label="Peak Listeners"
                value={peak ? peak.toLocaleString() : "—"}
              />
              <StatTile
                label="Stream Time"
                value={live ? fmtDuration(duration) : "—"}
              />
              <StatTile
                label="Tips Received"
                value={`$${tips.toFixed(2)}`}
                hot={tips > 0}
              />
              <StatTile label="Requests Handled" value={String(handled)} />
              <StatTile label="Chat Messages" value={String(chatCount)} />
              <StatTile label="Health" value={health} hot={live} />
              <StatTile label="Bitrate" value={bitrate} />
            </div>
            {!live ? (
              <p className="px-1 text-center text-[11.5px] text-studio-ink3">
                Go live to start collecting real-time analytics.
              </p>
            ) : null}
          </div>
        ) : null}
      </SectionCard>

      {/* toast */}
      {toast ? (
        <div
          role="status"
          className="fixed bottom-6 right-6 z-[200] flex items-center gap-2.5 rounded-xl border border-studio-line2 border-l-[3px] border-l-studio-violet bg-studio-surface2 px-4 py-3 text-[13px] font-semibold shadow-2xl"
        >
          <Radio size={15} className="text-studio-violetB" />
          {toast}
        </div>
      ) : null}
    </div>
  );
}
