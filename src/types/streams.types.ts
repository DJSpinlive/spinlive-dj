export interface CreateStreamRequest {
  title: string; // max 200 chars
}

/** Credentials returned when creating or resuming a stream. */
export interface StreamCredentials {
  stream_id: string;
  room_name: string;
  rtmp_url: string;
  stream_key: string;
  livekit_url: string;
  hls_url: string;
  chat_ticket_url: string;
  chat_ws_url: string;
  /**
   * Publish-capable LiveKit JWT for the DJ. When present, the browser
   * broadcasts directly via WebRTC — no OBS needed.
   */
  livekit_publish_token: string;
  /** LiveKit participant identity the token was minted for, e.g. "dj-dj_42". */
  livekit_publisher_identity?: string;
}

/**
 * Flat hash mirrored from Redis (`stream:{room}`) — every value is a string.
 * Notable fields are typed below; anything else passes through.
 */
export interface StreamState {
  status?: "live" | "dropped";
  dj_user_id?: string;
  dj_name?: string;
  title?: string;
  started_at?: string;
  dropped_at?: string;
  health_status?: "live" | "degraded" | "failed";
  listener_count?: string;
  peak_listeners?: string;
  bitrate_kbps?: string;
  hls_url?: string;
  rtmp_url?: string;
  chat_ticket_url?: string;
  chat_ws_url?: string;
  [key: string]: string | undefined;
}

/** A completed stream from the DJ's history. */
export interface StreamSession {
  id: string;
  stream_id: string;
  dj_user_id: string;
  dj_name: string;
  title: string;
  started_at: string; // ISO timestamp, e.g. "2026-04-27T18:19:40.816Z"
  ended_at: string; // ISO timestamp, e.g. "2026-04-27T18:19:40.816Z"
  duration_seconds: number;
  peak_listeners: number;
  archive_url: string;
}
