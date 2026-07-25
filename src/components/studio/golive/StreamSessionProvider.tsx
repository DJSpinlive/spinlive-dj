"use client";

/**
 * App-level home for the DJ's live session: captured devices, the LiveKit
 * publisher, the chat socket and stream stats all live here instead of the
 * go-live page so navigating around the app (or minimizing the studio) never
 * tears down the broadcast. Mounted once in `app/providers.tsx`.
 */
import {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import { ChatConnection, openChatSocket } from "@/lib/studio/chatSocket";
import {
  BroadcastState,
  BrowserBroadcast,
  getPublishToken,
  startBrowserBroadcast,
} from "@/lib/studio/livekitPublisher";
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
import { StreamCredentials, StreamState } from "@/types/streams.types";
import { getTokenFromCookie } from "@/utilities/clientCookies";

export type Permission = "idle" | "requesting" | "granted" | "denied";

export interface LiveMsg {
  id: string;
  userId: string;
  user: string;
  text: string;
  time: string;
  own: boolean;
}

export interface QueueTrack {
  id: string;
  song: string;
  artist: string;
  user: string;
}

export function fmtDuration(s: number) {
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

/* Named `StreamSessionValue` to avoid clashing with the API's StreamSession. */
export interface StreamSessionValue {
  /* stream lifecycle */
  creds: StreamCredentials | null;
  live: boolean;
  title: string;
  setTitle: (_title: string) => void;
  creating: boolean;
  ending: boolean;
  toggleLive: () => Promise<void>;
  /* stats */
  duration: number;
  tips: number;
  chatCount: number;
  peak: number;
  viewers: number;
  sparkData: { t: number; viewers: number }[];
  streamState: StreamState | undefined;
  /* devices */
  permission: Permission;
  mediaStream: MediaStream | null;
  mics: MediaDeviceInfo[];
  cams: MediaDeviceInfo[];
  speakers: MediaDeviceInfo[];
  micId: string;
  camId: string;
  speakerId: string;
  setSpeakerId: (_id: string) => void;
  micOn: boolean;
  camOn: boolean;
  audioLevel: number;
  requestMedia: (_micId?: string, _camId?: string) => Promise<void>;
  toggleMic: () => void;
  toggleCam: () => void;
  /* browser publish */
  broadcast: BroadcastState | "off";
  localKbps: number | null;
  publishQuality: string | null;
  /* chat */
  chatConnected: boolean;
  messages: LiveMsg[];
  requests: SongRequestPayload[];
  queue: QueueTrack[];
  reorderQueue: (_from: number, _to: number) => void;
  handled: number;
  pinned: string | null;
  mutedIds: string[];
  sendFrame: (_type: string, _payload: unknown) => boolean;
  acceptRequest: (_r: SongRequestPayload) => void;
  declineRequest: (_r: SongRequestPayload) => void;
  pinMessage: (_m: LiveMsg) => void;
  muteUser: (_m: LiveMsg) => void;
  /* toast */
  toast: string | null;
  notify: (_msg: string) => void;
}

const StreamSessionContext = createContext<StreamSessionValue | null>(null);

export function useStreamSession(): StreamSessionValue {
  const ctx = useContext(StreamSessionContext);
  if (!ctx) {
    throw new Error(
      "useStreamSession must be used within StreamSessionProvider"
    );
  }
  return ctx;
}

export function StreamSessionProvider({ children }: { children: ReactNode }) {
  // Provider is mounted app-wide (incl. public pages) — only fetch the user
  // once an auth token exists.
  const [hasToken, setHasToken] = useState(false);
  useEffect(() => {
    setHasToken(Boolean(getTokenFromCookie()));
  }, []);
  const { data: user } = useGetUserQuery(undefined, { skip: !hasToken });
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
  const [mutedIds, setMutedIds] = useState<string[]>([]);
  const reqSeq = useRef(0);

  const [toast, setToast] = useState<string | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const notify = useCallback((msg: string) => {
    setToast(msg);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 2600);
  }, []);

  /* ---------- live stream state (health, listeners) polled while live ---------- */
  const { data: streamState, error: streamStateError } = useGetStreamStateQuery(
    creds?.stream_id ?? "",
    {
      skip: !live || !creds,
      pollingInterval: 10_000,
    }
  );
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

  /* Keep the screen awake while live so an idle machine doesn't suspend the
     captured devices or the WebRTC uplink. Re-acquired when the tab becomes
     visible again (the browser auto-releases the lock on hide). */
  useEffect(() => {
    if (!live) return undefined;
    const { wakeLock } = navigator as Navigator & {
      wakeLock?: { request: (_type: "screen") => Promise<WakeLockSentinel> };
    };
    if (!wakeLock) return undefined;
    let lock: WakeLockSentinel | null = null;
    let disposed = false;
    const acquire = async () => {
      try {
        lock = await wakeLock.request("screen");
        if (disposed) await lock.release();
      } catch {
        // Denied (battery saver, hidden tab) — the stream still runs.
      }
    };
    const onVisible = () => {
      if (document.visibilityState === "visible") acquire();
    };
    acquire();
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      disposed = true;
      document.removeEventListener("visibilitychange", onVisible);
      lock?.release().catch(() => undefined);
    };
  }, [live]);

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

  const toggleMic = useCallback(() => {
    setMicOn((prev) => {
      const next = !prev;
      mediaRef.current?.getAudioTracks().forEach((t) => {
        const track = t;
        track.enabled = next;
      });
      return next;
    });
  }, []);

  const toggleCam = useCallback(() => {
    setCamOn((prev) => {
      const next = !prev;
      mediaRef.current?.getVideoTracks().forEach((t) => {
        const track = t;
        track.enabled = next;
      });
      return next;
    });
  }, []);

  /* ---------- chat socket ---------- */
  const closeChat = useCallback(() => {
    connRef.current?.close();
    connRef.current = null;
    setChatConnected(false);
  }, []);

  /* The state poll 404ing means the stream is gone server-side (expired or
     closed elsewhere) — end the local session instead of polling a ghost.
     Devices stay captured so the DJ can go live again immediately. */
  useEffect(() => {
    if (!live) return;
    const status = (streamStateError as { status?: number } | undefined)
      ?.status;
    if (status !== 404) return;
    closeChat();
    publisherRef.current?.close();
    publisherRef.current = null;
    setBroadcast("off");
    setLive(false);
    setCreds(null);
    setLiveStatus({ is_live: false });
    notify("Stream no longer exists on the server — ended.");
  }, [streamStateError, live, closeChat, setLiveStatus, notify]);

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

  const sendFrame = useCallback(
    (type: string, payload: unknown) => {
      if (!connRef.current) {
        notify("Chat isn't connected.");
        return false;
      }
      reqSeq.current += 1;
      connRef.current.send(type, payload, String(reqSeq.current));
      return true;
    },
    [notify]
  );

  useEffect(
    () => () => {
      // Provider unmount (full page unload) — release everything.
      stopTracks();
      publisherRef.current?.close();
      connRef.current?.close();
    },
    []
  );

  /* ---------- go live / end ---------- */
  const toggleLive = useCallback(async () => {
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
  }, [
    live,
    creds,
    title,
    duration,
    peak,
    tips,
    createStream,
    endStream,
    setLiveStatus,
    closeChat,
    notify,
    onFrame,
  ]);

  /* ---------- DJ actions over the socket ---------- */
  const acceptRequest = useCallback(
    (r: SongRequestPayload) => {
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
    },
    [sendFrame, notify]
  );

  const declineRequest = useCallback(
    (r: SongRequestPayload) => {
      if (!sendFrame("request.decline", { id: r.id, reason: "not tonight" })) {
        return;
      }
      setRequests((rs) => rs.filter((x) => x.id !== r.id));
      setHandled((n) => n + 1);
      notify(`Declined request from ${r.user_name}`);
    },
    [sendFrame, notify]
  );

  const pinMessage = useCallback(
    (m: LiveMsg) => {
      if (sendFrame("moderation.pin", { message_id: m.id })) {
        setPinned(`${m.user}: ${m.text}`);
        notify("Message pinned");
      }
    },
    [sendFrame, notify]
  );

  const muteUser = useCallback(
    (m: LiveMsg) => {
      if (sendFrame("moderation.mute", { user_id: m.userId, reason: "spam" })) {
        setMutedIds((u) => (u.includes(m.userId) ? u : [...u, m.userId]));
        notify(`${m.user} muted for this stream`);
      }
    },
    [sendFrame, notify]
  );

  const reorderQueue = useCallback((from: number, to: number) => {
    if (from === to) return;
    setQueue((q) => {
      const next = [...q];
      const [moved] = next.splice(from, 1);
      next.splice(to, 0, moved);
      return next;
    });
  }, []);

  const value = useMemo<StreamSessionValue>(
    () => ({
      creds,
      live,
      title,
      setTitle,
      creating,
      ending,
      toggleLive,
      duration,
      tips,
      chatCount,
      peak,
      viewers,
      sparkData,
      streamState,
      permission,
      mediaStream,
      mics,
      cams,
      speakers,
      micId,
      camId,
      speakerId,
      setSpeakerId,
      micOn,
      camOn,
      audioLevel,
      requestMedia,
      toggleMic,
      toggleCam,
      broadcast,
      localKbps,
      publishQuality,
      chatConnected,
      messages,
      requests,
      queue,
      reorderQueue,
      handled,
      pinned,
      mutedIds,
      sendFrame,
      acceptRequest,
      declineRequest,
      pinMessage,
      muteUser,
      toast,
      notify,
    }),
    [
      creds,
      live,
      title,
      creating,
      ending,
      toggleLive,
      duration,
      tips,
      chatCount,
      peak,
      viewers,
      sparkData,
      streamState,
      permission,
      mediaStream,
      mics,
      cams,
      speakers,
      micId,
      camId,
      speakerId,
      micOn,
      camOn,
      audioLevel,
      requestMedia,
      toggleMic,
      toggleCam,
      broadcast,
      localKbps,
      publishQuality,
      chatConnected,
      messages,
      requests,
      queue,
      reorderQueue,
      handled,
      pinned,
      mutedIds,
      sendFrame,
      acceptRequest,
      declineRequest,
      pinMessage,
      muteUser,
      toast,
      notify,
    ]
  );

  return (
    <StreamSessionContext.Provider value={value}>
      {children}
    </StreamSessionContext.Provider>
  );
}
