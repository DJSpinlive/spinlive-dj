/**
 * Ticket-exchange chat socket (spinlive-chat-flow.md).
 *
 * 1. POST the long-lived JWT to the ticket endpoint → single-use ~30s ticket.
 * 2. Dial `ws?ticket=<uuid>` — the JWT never goes in the URL.
 *
 * Role (DJ | FAN) is derived server-side from `stream.dj_user_id`.
 */
import { ChatFrame, ChatTicketResponse } from "@/types/chat.types";
import { getApiOriginFromEnv } from "@/utilities/remote-avatar-url";

/**
 * Stream credentials sometimes carry in-cluster endpoints
 * (e.g. `http://chat-svc.default.svc.cluster.local:8080/…`) that a browser
 * can't reach — only trust public https/wss URLs, otherwise fall back to the
 * gateway.
 */
function isPublicUrl(raw?: string): boolean {
  if (!raw) return false;
  try {
    const u = new URL(raw);
    return (
      (u.protocol === "https:" || u.protocol === "wss:") &&
      !u.hostname.endsWith(".cluster.local") &&
      !u.hostname.endsWith(".internal") &&
      u.hostname !== "localhost"
    );
  } catch {
    return false;
  }
}

export interface OpenChatOptions {
  jwt: string;
  roomId: string;
  /** `chat_ticket_url` from StreamCredentials, when public. */
  ticketUrl?: string;
  /** `chat_ws_url` from StreamCredentials, when public. */
  wsUrl?: string;
  onFrame: (_frame: ChatFrame) => void;
  onClose?: (_ev: CloseEvent) => void;
}

export interface ChatConnection {
  role: "DJ" | "FAN" | undefined;
  socket: WebSocket;
  send: (_type: string, _payload: unknown, _requestId?: string) => void;
  close: () => void;
}

/** Dial one WS base; resolves on open, rejects on error/close/timeout. */
function dial(base: string, ticket: string, timeoutMs = 8_000) {
  return new Promise<WebSocket>((resolve, reject) => {
    const socket = new WebSocket(`${base}?ticket=${ticket}`);
    const timer = setTimeout(() => {
      socket.close();
      reject(new Error(`timed out dialing ${base}`));
    }, timeoutMs);
    socket.addEventListener(
      "open",
      () => {
        clearTimeout(timer);
        resolve(socket);
      },
      { once: true }
    );
    socket.addEventListener(
      "error",
      () => {
        clearTimeout(timer);
        reject(new Error(`failed dialing ${base}`));
      },
      { once: true }
    );
  });
}

export async function openChatSocket({
  jwt,
  roomId,
  ticketUrl,
  wsUrl,
  onFrame,
  onClose,
}: OpenChatOptions): Promise<ChatConnection> {
  const origin = getApiOriginFromEnv();
  const ticketEndpoint = isPublicUrl(ticketUrl)
    ? (ticketUrl as string)
    : `${origin}/api/v1/chat/ws/ticket`;

  const res = await fetch(ticketEndpoint, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${jwt}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ room_id: roomId }),
  });
  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(
      `Chat ticket refused (${res.status}${detail ? `: ${detail.slice(0, 80)}` : ""})`
    );
  }
  const {
    ticket,
    ws_url: ticketWsUrl,
    role,
  } = (await res.json()) as ChatTicketResponse;

  // Preference order: create-time chat_ws_url → ticket-response ws_url →
  // gateway-derived. Advertised hosts can be stale or unreachable
  // (e.g. wss://chat.spinlive.pro with no DNS), so on a failed dial we
  // fall through to the next candidate — a failed dial never reaches the
  // server, so the single-use ticket survives for the retry.
  const gatewayWs = `${origin.replace(/^http/, "ws")}/api/v1/chat/ws`;
  const candidates = [
    ...new Set(
      [wsUrl, ticketWsUrl, gatewayWs].filter((u): u is string => isPublicUrl(u))
    ),
  ];

  const failures: string[] = [];
  const socket = await candidates.reduce<Promise<WebSocket | null>>(
    (attempt, base) =>
      attempt.then(
        (open) =>
          open ??
          dial(base, ticket).catch((e) => {
            failures.push(e instanceof Error ? e.message : String(e));
            return null;
          })
      ),
    Promise.resolve(null)
  );
  if (!socket) {
    throw new Error(`Chat socket failed: ${failures.join("; ")}`);
  }

  socket.addEventListener("message", (e) => {
    try {
      onFrame(JSON.parse(e.data as string) as ChatFrame);
    } catch {
      // Ignore malformed frames.
    }
  });
  if (onClose) socket.addEventListener("close", onClose);

  const ws = socket;
  return {
    role,
    socket: ws,
    send: (type, payload, requestId) =>
      ws.send(
        JSON.stringify({ type, payload, request_id: requestId } as ChatFrame)
      ),
    close: () => ws.close(),
  };
}
