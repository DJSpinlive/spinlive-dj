/** Wire types for the SpinLive chat WebSocket — see spinlive-chat-flow.md. */

/** Every frame, both directions. */
export interface ChatFrame<T = unknown> {
  type: string;
  payload: T;
  request_id?: string;
}

export interface ChatTicketResponse {
  ticket: string;
  ws_url?: string;
  /** Server-derived from `stream.dj_user_id` — never claimed by the client. */
  role?: "DJ" | "FAN";
}

/* ---------- server → client payloads ---------- */

export interface ChatMessagePayload {
  id: string;
  user_id: string;
  user_name: string;
  body: string;
  created_at: string;
}

export interface TipNotificationPayload {
  room_id: string;
  from_user: string;
  from_name: string;
  amount: string;
  currency: string;
  message?: string;
}

export interface SongRequestPayload {
  id: string;
  user_id: string;
  user_name: string;
  title: string;
  artist?: string;
  note?: string;
  submitted_at: string;
}

export interface RequestStatusPayload {
  id: string;
  reason?: string;
}

export interface RoomClosedPayload {
  room_id: string;
}

export interface ChatErrorPayload {
  code:
    | "rate_limited"
    | "forbidden"
    | "unknown_type"
    | "not_implemented"
    | "internal"
    | string;
  message?: string;
}

/* ---------- client → server payloads (DJ side) ---------- */

export interface ChatSendPayload {
  body: string;
}

export interface RequestActionPayload {
  id: string;
  reason?: string;
}

export interface ModerationUserPayload {
  user_id: string;
  reason?: string;
}

export interface ModerationPinPayload {
  message_id: string;
}

export interface ModerationShoutoutPayload {
  body: string;
}
