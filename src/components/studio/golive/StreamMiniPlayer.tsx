"use client";

/**
 * Floating, draggable mini view of the live stream (YouTube-style) shown on
 * every page except the go-live studio, so navigating never means losing
 * sight of — or accidentally ending — the broadcast. Also hosts the global
 * session toast so tips/requests notify the DJ anywhere in the app.
 * Mounted once next to StreamSessionProvider in `app/providers.tsx`.
 */
import {
  Maximize2,
  Mic,
  MicOff,
  PictureInPicture2,
  Radio,
  Timer,
  Video,
  VideoOff,
} from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import {
  PointerEvent as ReactPointerEvent,
  ReactNode,
  useEffect,
  useRef,
  useState,
} from "react";

import {
  fmtDuration,
  useStreamSession,
} from "@/components/studio/golive/StreamSessionProvider";
import { cn } from "@/lib/utils";

const STUDIO_PATH = "/studio/go-live";
const PLAYER_W = 320;

function MiniControl({
  label,
  onClick,
  danger,
  children,
}: {
  label: string;
  onClick: () => void;
  danger?: boolean;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      className={cn(
        "grid h-8 w-8 place-items-center rounded-lg border border-white/10 bg-white/[0.06] text-white/90 transition-colors hover:bg-white/[0.14]",
        danger && "border-[#f43f5e66] bg-[#f43f5e26] text-[#FDA4AF]"
      )}
    >
      {children}
    </button>
  );
}

export default function StreamMiniPlayer() {
  const {
    live,
    duration,
    viewers,
    mediaStream,
    micOn,
    camOn,
    toggleMic,
    toggleCam,
    ending,
    toggleLive,
    toast,
  } = useStreamSession();
  const pathname = usePathname();
  const router = useRouter();

  const videoRef = useRef<HTMLVideoElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const dragState = useRef<{ dx: number; dy: number } | null>(null);
  /* null → CSS default (bottom-right); set once the DJ drags it */
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null);

  const onStudioPage = pathname === STUDIO_PATH;
  const visible = live && !onStudioPage;
  const hasCamera = (mediaStream?.getVideoTracks().length ?? 0) > 0;

  /* attach the shared capture stream to this preview */
  useEffect(() => {
    if (visible && videoRef.current && mediaStream) {
      videoRef.current.srcObject = mediaStream;
    }
  }, [visible, mediaStream]);

  /* drag — pointer events with capture, clamped to the viewport */
  const onPointerDown = (e: ReactPointerEvent) => {
    if ((e.target as HTMLElement).closest("button")) return;
    const rect = cardRef.current?.getBoundingClientRect();
    if (!rect) return;
    dragState.current = { dx: e.clientX - rect.left, dy: e.clientY - rect.top };
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  };
  const onPointerMove = (e: ReactPointerEvent) => {
    const drag = dragState.current;
    const rect = cardRef.current?.getBoundingClientRect();
    if (!drag || !rect) return;
    setPos({
      x: Math.min(
        Math.max(8, e.clientX - drag.dx),
        window.innerWidth - rect.width - 8
      ),
      y: Math.min(
        Math.max(8, e.clientY - drag.dy),
        window.innerHeight - rect.height - 8
      ),
    });
  };
  const onPointerUp = () => {
    dragState.current = null;
  };

  const expand = () => router.push(STUDIO_PATH);

  const enterPiP = async () => {
    const video = videoRef.current as
      | (HTMLVideoElement & {
          requestPictureInPicture?: () => Promise<unknown>;
        })
      | null;
    if (!video?.requestPictureInPicture) return;
    try {
      await video.requestPictureInPicture();
    } catch {
      // PiP unsupported or blocked — the in-app mini player still works.
    }
  };

  return (
    <>
      {visible ? (
        <div
          ref={cardRef}
          role="dialog"
          aria-label="Live stream mini player"
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          style={
            pos
              ? { left: pos.x, top: pos.y, width: PLAYER_W }
              : { right: 24, bottom: 24, width: PLAYER_W }
          }
          className="fixed z-[300] cursor-grab touch-none select-none overflow-hidden rounded-2xl border border-white/10 bg-[#0d0716] shadow-[0_16px_48px_rgba(0,0,0,0.55)] active:cursor-grabbing"
        >
          <div className="relative aspect-video bg-[#07070d]">
            {hasCamera && camOn ? (
              <video
                ref={videoRef}
                autoPlay
                muted
                playsInline
                onDoubleClick={expand}
                className="absolute inset-0 h-full w-full object-cover"
              />
            ) : (
              <div className="absolute inset-0 grid place-items-center bg-gradient-to-br from-[#0d0716] via-[#150a26] to-[#1c0a1e] text-white/40">
                <VideoOff size={22} />
              </div>
            )}
            <div className="pointer-events-none absolute inset-x-0 top-0 flex items-center gap-1.5 p-2">
              <span className="flex items-center gap-1 rounded bg-[#f43f5e] px-1.5 py-0.5 text-[9.5px] font-extrabold tracking-widest text-white">
                <span className="h-1 w-1 animate-pulse rounded-full bg-white" />
                LIVE
              </span>
              <span className="flex items-center gap-1 rounded bg-black/55 px-1.5 py-0.5 text-[10px] font-bold tabular-nums text-white/85 backdrop-blur">
                <Timer size={10} /> {fmtDuration(duration)}
              </span>
              <span className="rounded bg-black/55 px-1.5 py-0.5 text-[10px] font-bold tabular-nums text-white/85 backdrop-blur">
                {viewers.toLocaleString()} watching
              </span>
            </div>
          </div>
          <div className="flex items-center gap-1.5 border-t border-white/10 bg-white/[0.03] px-2 py-1.5">
            <MiniControl
              label={micOn ? "Mute microphone" : "Unmute microphone"}
              onClick={toggleMic}
              danger={!micOn}
            >
              {micOn ? <Mic size={14} /> : <MicOff size={14} />}
            </MiniControl>
            <MiniControl
              label={camOn ? "Turn camera off" : "Turn camera on"}
              onClick={toggleCam}
              danger={!camOn}
            >
              {camOn ? <Video size={14} /> : <VideoOff size={14} />}
            </MiniControl>
            <MiniControl
              label="Pop out (picture-in-picture)"
              onClick={enterPiP}
            >
              <PictureInPicture2 size={14} />
            </MiniControl>
            <button
              type="button"
              onClick={toggleLive}
              disabled={ending}
              className="ml-auto rounded-lg bg-[#f43f5e]/90 px-2.5 py-1.5 text-[10px] font-extrabold tracking-widest text-white transition-colors hover:bg-[#f43f5e] disabled:opacity-60"
            >
              {ending ? "ENDING…" : "END"}
            </button>
            <MiniControl label="Back to studio" onClick={expand}>
              <Maximize2 size={14} />
            </MiniControl>
          </div>
        </div>
      ) : null}

      {toast ? (
        <div
          role="status"
          className="fixed bottom-6 left-6 z-[310] flex items-center gap-2.5 rounded-xl border border-white/15 border-l-[3px] border-l-[#8b5cf6] bg-[#171226] px-4 py-3 text-[13px] font-semibold text-white shadow-2xl"
        >
          <Radio size={15} className="text-[#a78bfa]" />
          {toast}
        </div>
      ) : null}
    </>
  );
}
