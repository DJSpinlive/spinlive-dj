/**
 * Browser A/V publishing (WebRTC) — connects to the LiveKit room from
 * StreamCredentials and publishes the DJ's captured mic/camera tracks.
 *
 * Requires a publish-capable token in the create-stream response; when the
 * backend doesn't send one yet, the DJ broadcasts via OBS/RTMP instead.
 */
import { ConnectionQuality, Room, RoomEvent, Track } from "livekit-client";

import { StreamCredentials } from "@/types/streams.types";

export type BroadcastState =
  | "connecting"
  | "publishing"
  | "reconnecting"
  | "closed"
  | "failed";

export interface BrowserBroadcast {
  room: Room;
  /** Swap what's being sent (e.g. after a device change). */
  publishStream: (_stream: MediaStream) => Promise<void>;
  /**
   * Outbound bitrate across all published tracks, from WebRTC sender stats.
   * Delta-based — the first call primes the counter and returns null.
   */
  getBitrateKbps: () => Promise<number | null>;
  close: () => Promise<void>;
}

export function getPublishToken(creds: StreamCredentials): string | undefined {
  const token = creds.livekit_publish_token;
  return typeof token === "string" && token.length > 0 ? token : undefined;
}

export async function startBrowserBroadcast({
  url,
  token,
  onState,
  onQuality,
}: {
  url: string;
  token: string;
  onState?: (_state: BroadcastState) => void;
  /** Uplink quality of the local participant: excellent | good | poor | lost. */
  onQuality?: (_quality: ConnectionQuality) => void;
}): Promise<BrowserBroadcast> {
  const room = new Room();
  room
    .on(RoomEvent.Reconnecting, () => onState?.("reconnecting"))
    .on(RoomEvent.Reconnected, () => onState?.("publishing"))
    .on(RoomEvent.Disconnected, () => onState?.("closed"))
    .on(RoomEvent.ConnectionQualityChanged, (quality, participant) => {
      if (participant.identity === room.localParticipant.identity) {
        onQuality?.(quality);
      }
    });

  onState?.("connecting");
  await room.connect(url, token);

  const publishStream = async (stream: MediaStream) => {
    const lp = room.localParticipant;
    // Unpublish whatever is currently going out (device switch, republish).
    await Promise.all(
      Array.from(lp.trackPublications.values()).map((pub) =>
        pub.track ? lp.unpublishTrack(pub.track, false) : Promise.resolve(null)
      )
    );
    const [audio] = stream.getAudioTracks();
    const [video] = stream.getVideoTracks();
    if (audio) {
      await lp.publishTrack(audio, { source: Track.Source.Microphone });
    }
    if (video) {
      await lp.publishTrack(video, { source: Track.Source.Camera });
    }
    onState?.("publishing");
  };

  /* Delta-based outbound bitrate from `outbound-rtp` sender stats. */
  let lastBytes = 0;
  let lastTs = 0;
  const getBitrateKbps = async (): Promise<number | null> => {
    const tracks = Array.from(
      room.localParticipant.trackPublications.values()
    ).flatMap((pub) => (pub.track ? [pub.track] : []));

    let bytes = 0;
    await Promise.all(
      tracks.map(async (track) => {
        // LocalAudioTrack returns one stats object, LocalVideoTrack an array
        // (one per simulcast layer) — normalize and sum bytesSent.
        const withStats = track as unknown as {
          getSenderStats?: () => Promise<unknown>;
        };
        if (!withStats.getSenderStats) return;
        try {
          const stats = await withStats.getSenderStats();
          const list = Array.isArray(stats) ? stats : stats ? [stats] : [];
          list.forEach((s) => {
            bytes += (s as { bytesSent?: number }).bytesSent ?? 0;
          });
        } catch {
          // Stats unavailable mid-renegotiation — skip this sample.
        }
      })
    );

    const now = Date.now();
    const prevBytes = lastBytes;
    const prevTs = lastTs;
    lastBytes = bytes;
    lastTs = now;
    // No baseline yet, or counters reset after a republish.
    if (!prevTs || bytes < prevBytes || now <= prevTs) return null;
    // (Δbytes × 8) bits / Δms ≡ kbit/s.
    return Math.round(((bytes - prevBytes) * 8) / (now - prevTs));
  };

  return {
    room,
    publishStream,
    getBitrateKbps,
    close: async () => {
      await room.disconnect();
    },
  };
}
