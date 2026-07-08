# SpinLive · Chat Protocol

WebSocket chat / song-requests / tips / moderation · single-DJ streams · reactive to stream lifecycle.

**Base:** `https://api.spinlivepro.com` · **WS auth:** ticket-exchange · **Role** = `f(stream.dj_user_id)` — server-derived, never claimed by client.

## Legend

| Tag | Meaning |
|-----|---------|
| `ANY` | fan or DJ can send |
| `DJ ONLY` | `requireDJ` gate |
| `SERVER→` | pushed to client |

---

## Handshake — how you get on the socket

```
   CLIENT                        KONG · TLS         CHAT-SVC         REDIS
   ──────                        ──────────         ────────         ─────
(1) POST /chat/ws/ticket  Bearer <JWT> {room_id}
      → validate JWT(iss) → GetStreamState → HGETALL stream:<id>
      ← status / dj_user_id → role = DJ | FAN → SETEX ticket:<uuid> 30s
      ← 200 {ticket, ws_url, role}

(2) GET wss://…/ws?ticket=<uuid>   Origin: https://api.spinlivepro.com
      → GETDEL ticket:<uuid> → redeem → identity
      ← 101 · OnJoin → sub Redis

(3) ⇄ frames {type, payload, request_id}
```

- Role is **server-derived** from `stream.dj_user_id` — never claimed by client.
- Gate order: `live?` → `not banned` → `ticket valid` → `origin ok` → `upgrade`.
- Ticket is single-use, ~30s TTL, redeemed via `GETDEL`.

---

## Envelope — every frame, both directions

```json
{
  "type": "chat.send",
  "payload": { },
  "request_id": "opt-corr-id"
}
```

- `type` — route key
- `payload` — per-type body
- `request_id` — optional correlation id, echoed back
- Text frames only. Unknown type → `error{code:"unknown_type"}`.

---

## Client → Server — routes you send

### `chat.send` · `ANY`

Rate-limited. Muted users rejected. Fans out as `chat.message`.

```json
{ "type": "chat.send", "payload": { "body": "hey djjj 🔥" }, "request_id": "1" }
```

### `request.submit` · `ANY` (fan asks for a song)

`title` required · `artist`/`note` optional · rate-limited · DJ sees `request.new`.

```json
{
  "type": "request.submit",
  "payload": { "title": "One More Time", "artist": "Daft Punk", "note": "for my bday" },
  "request_id": "2"
}
```

### `request.accept` / `request.decline` · `DJ ONLY`

Dequeues by id · notifies the requesting fan.

```json
{ "type": "request.accept", "payload": { "id": "<req-uuid>" }, "request_id": "3" }
```

```json
{ "type": "request.decline", "payload": { "id": "<req-uuid>", "reason": "not tonight" }, "request_id": "4" }
```

### `moderation.mute` / `unmute` / `ban` · `DJ ONLY`

`user_id` required · `ban` drops their socket + blocks re-join.

```json
{ "type": "moderation.mute", "payload": { "user_id": "<fan>", "reason": "spam" } }
```

```json
{ "type": "moderation.unmute", "payload": { "user_id": "<fan>" } }
```

```json
{ "type": "moderation.ban", "payload": { "user_id": "<fan>", "reason": "abuse" } }
```

### `moderation.pin` · `DJ ONLY`

Pins an existing chat message to the top of the room.

```json
{ "type": "moderation.pin", "payload": { "message_id": "<msg-uuid>" } }
```

### `moderation.shoutout` · `DJ ONLY`

`body` required · broadcast as a highlighted dedication.

```json
{ "type": "moderation.shoutout", "payload": { "body": "big up @tolaniverse!" } }
```

---

## Server → Client — frames you receive

### `chat.message` · `SERVER→`

```json
{
  "type": "chat.message",
  "payload": {
    "id": "msg-9f2a…",
    "user_id": "usr-1a2b…",
    "user_name": "tolani",
    "body": "hey 🔥",
    "created_at": "2026-07-07T21:14:03Z"
  },
  "request_id": "1"
}
```

### `tip.notification` · `SERVER→` (sourced from Kafka, not a client)

Passthrough of the `tip.completed` event.

```json
{
  "type": "tip.notification",
  "payload": {
    "room_id": "stream-7c3d…",
    "from_user": "usr-88ff…",
    "from_name": "fan42",
    "amount": "5.00",
    "currency": "USD",
    "message": "love the set"
  }
}
```

### `request.new` / `request.accepted` / `request.declined` · `SERVER→`

`request.new` → DJ channel only:

```json
{
  "type": "request.new",
  "payload": {
    "id": "req-4d5e…",
    "user_id": "usr-88ff…",
    "user_name": "fan42",
    "title": "One More Time",
    "artist": "Daft Punk",
    "note": "bday",
    "submitted_at": "2026-07-07T21:15:00Z"
  }
}
```

Status → routed back to the requesting fan:

```json
{ "type": "request.accepted", "payload": { "id": "req-4d5e…" } }
```

```json
{ "type": "request.declined", "payload": { "id": "req-4d5e…", "reason": "not tonight" } }
```

### `room_closed` · `SERVER→` (stream ended)

Control-plane · LB drains · socket closes shortly after.

```json
{ "type": "room_closed", "payload": { "room_id": "stream-7c3d…" } }
```

### `error` · `SERVER→`

Codes: `rate_limited` · `forbidden` · `unknown_type` · `not_implemented` · `internal`.

```json
{ "type": "error", "payload": { "code": "forbidden", "message": "DJ role required" }, "request_id": "7" }
```

---

## Tip flow — payment never talks to chat directly

```
FAN → PAYMENT SVC → KAFKA (tip.completed) → CHAT SVC → ROOM (tip.notification)
```

1. Fan tips $5 → payment charges (Stripe).
2. Payment publishes `tip.completed` to Kafka.
3. Chat-svc consumes → `Handle()` → checks `room_id` present.
4. Broadcast `tip.notification` to all room members.

Chat is reactive: observes `tip.completed`, never calls payment.

> **Note:** payment publish is still stubbed (TODO in `PaymentController`) — chat consumer is live.

---

## Quick test — mint ticket + dial (one shot)

```bash
TOKEN="<bearer-jwt>"; ROOM="stream-<uuid>"   # stream must be LIVE

TICKET=$(curl -s -X POST https://api.spinlivepro.com/api/v1/chat/ws/ticket \
    -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' \
    -d "{\"room_id\":\"$ROOM\"}" | jq -r .ticket)

websocat "wss://api.spinlivepro.com/api/v1/chat/ws?ticket=$TICKET" \
    -H "Origin: https://api.spinlivepro.com"

# then type:
{"type":"chat.send","payload":{"body":"hi"},"request_id":"1"}
```

---

## Frontend integration · which service each role calls

| Role | Endpoint | Auth | Returns |
|------|----------|------|---------|
| DJ | `POST /streams` | DJ-JWT | rtmp · key · hls · chat endpoints |
| DJ | push A/V (RTMP) | — | LiveKit room (live) |
| FAN | `POST /{id}/token` | none | LiveKit token · url · chat endpoints |
| FAN | connect (WebRTC) or HLS | — | subscribe A/V |
| BOTH | `POST /chat/ws/ticket` → `ws?ticket` | JWT | role from `stream.dj_user_id` |

DJ publishes via RTMP encoder (OBS / browser WHIP) — fans never publish. Chat role is server-derived.

### `shared.js` — ticket-exchange chat socket (both roles)

```js
// One helper both DJ and fan reuse. Role is decided server-side.
const API = "https://api.spinlivepro.com";

async function openChat({ jwt, roomId, ticketUrl, wsUrl, onFrame }) {
  // 1. exchange long-lived JWT for a single-use ~30s ticket
  const res = await fetch(ticketUrl ?? `${API}/api/v1/chat/ws/ticket`, {
    method: "POST",
    headers: { "Authorization": `Bearer ${jwt}`, "Content-Type": "application/json" },
    body: JSON.stringify({ room_id: roomId }),
  });
  const { ticket, ws_url, role } = await res.json();   // role: "DJ" | "FAN"

  // 2. dial the socket with the ticket (JWT never in the URL).
  //    ws_url from the ticket response wins over create-time wsUrl.
  const ws = new WebSocket(`${ws_url ?? wsUrl}?ticket=${ticket}`);
  ws.onmessage = (e) => onFrame(JSON.parse(e.data));   // {type,payload,request_id}
  return { ws, role, send: (type, payload, rid) =>
    ws.send(JSON.stringify({ type, payload, request_id: rid })) };
}
```

### `dj.js` — go live + moderate · `DJ`

```js
// (A) create the stream → get RTMP creds + chat endpoints
const cred = await fetch(`${API}/api/v1/streams/`, {
  method: "POST",
  headers: { "Authorization": `Bearer ${djJwt}`, "Content-Type": "application/json" },
  body: JSON.stringify({ title: "Friday Night Set" }),
}).then(r => r.json());
// cred = { stream_id, room_name, rtmp_url, stream_key, livekit_url, hls_url,
//          chat_ticket_url, chat_ws_url }

// (B) go live — feed rtmp_url + stream_key into the encoder
//     OBS: Settings → Stream → Custom → Server=rtmp_url  Key=stream_key
//     browser broadcaster: publish via WHIP to livekit_url instead.
showToEncoder(cred.rtmp_url, cred.stream_key);
previewVideo.src = cred.hls_url;   // DJ watches own HLS output

// (C) open chat as DJ (moderation routes unlock — server-gated)
const chat = await openChat({
  jwt: djJwt, roomId: cred.stream_id,
  ticketUrl: cred.chat_ticket_url, wsUrl: cred.chat_ws_url,
  onFrame: (f) => {
    switch (f.type) {
      case "chat.message":     renderMsg(f.payload); break;
      case "request.new":      addToQueue(f.payload); break;  // DJ-only feed
      case "tip.notification": flashTip(f.payload); break;
      case "error":            toast(f.payload.message); break;
    }
  },
});

// (D) DJ actions — rejected with error{code:"forbidden"} if role !== DJ
acceptBtn.onclick = (id) => chat.send("request.accept", { id }, "a1");
muteBtn.onclick   = (u)  => chat.send("moderation.mute", { user_id: u, reason: "spam" });
shoutBtn.onclick  = (t)  => chat.send("moderation.shoutout", { body: t });

// (E) end the set
endBtn.onclick = () => fetch(`${API}/api/v1/streams/${cred.stream_id}`,
  { method: "DELETE", headers: { "Authorization": `Bearer ${djJwt}` } });
  // → stream.ended on Kafka → chat pushes room_closed → sockets drain
```

### `fan.js` — watch + chat · `FAN`

```js
// (A) discover live streams (public, no auth)
const { live } = await fetch(`${API}/api/v1/streams/`).then(r => r.json());
const streamId = live[0].stream_id;   // e.g. "stream-<dj-uuid>"

// (B) get a LiveKit join token (public endpoint, no auth required)
const tok = await fetch(`${API}/api/v1/streams/${streamId}/token`, {
  method: "POST", headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ user_id: fanId, display_name: "fan42" }),
}).then(r => r.json());
// tok = { token, livekit_url, chat_ticket_url, chat_ws_url }

// (C) subscribe to the room — low-latency WebRTC (livekit-client SDK)
import { Room, RoomEvent } from "livekit-client";
const room = new Room();
room.on(RoomEvent.TrackSubscribed, (track) => track.attach(videoEl));
await room.connect(tok.livekit_url, tok.token);
// HLS fallback (higher latency, no SDK): videoEl.src = live[0].hls_url;

// (D) open chat as FAN — same helper, fan JWT, role resolves to FAN
const chat = await openChat({
  jwt: fanJwt, roomId: streamId,
  ticketUrl: tok.chat_ticket_url, wsUrl: tok.chat_ws_url,
  onFrame: (f) => {
    switch (f.type) {
      case "chat.message":     renderMsg(f.payload); break;
      case "request.accepted": toast("🎶 your request is up!"); break;
      case "request.declined": toast("not this time"); break;
      case "tip.notification": flashTip(f.payload); break;
      case "room_closed":      endScreen(); break;   // stream ended
    }
  },
});

// (E) fan actions — chat + song requests (moderation routes → forbidden)
sendBtn.onclick    = (t) => chat.send("chat.send", { body: t }, "m1");
requestBtn.onclick = ()  => chat.send("request.submit",
  { title: "One More Time", artist: "Daft Punk", note: "for my bday" }, "r1");
```

---

## End-to-end lifecycle

1. **DJ** `POST /streams` → room created → RTMP push feeds the LiveKit room (now live).
2. **FAN** `POST /streams/{id}/token` → `connect(token)` → subscribes to live A/V (or HLS).
3. **BOTH** `POST /chat/ws/ticket` → `GET ws?ticket` → chat frames flow ⇄ (send / recv).
4. **TIP** fan tips → payment → Kafka `tip.completed` → chat → `tip.notification` to all.
5. **DJ** `DELETE /streams/{id}` → Kafka `stream.ended` → chat pushes `room_closed` → sockets drain.

---

*spinlivepro · chat-svc + stream-svc · ticket-exchange WS auth · role = f(stream.dj_user_id)*
