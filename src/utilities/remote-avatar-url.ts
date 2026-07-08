import { ENV_VARS } from "./constants";

/** Normalize to HTTPS prefix when possible (parity with Expo `toSecureRemoteUri`). */
export function toSecureRemoteUri(raw: string): string {
  const t = typeof raw === "string" ? raw.trim() : "";
  if (!t) return "";
  if (t.startsWith("https://")) return t;
  if (t.startsWith("http://")) return `https://${t.slice("http://".length)}`;
  if (t.startsWith("//")) return `https:${t}`;
  return t;
}

/**
 * Origin backing `NEXT_PUBLIC_API_URL` — works on the server without `window`,
 * given an absolute URL (recommended for NEXT_PUBLIC_*).
 */
export function getApiOriginFromEnv(): string {
  const raw = ENV_VARS.API_URL.trim();
  try {
    if (/^https?:\/\//i.test(raw)) {
      return new URL(raw).origin;
    }
    if (typeof window !== "undefined") {
      return new URL(raw, `${window.location.origin}/`).origin;
    }
    return new URL(raw, "http://localhost").origin;
  } catch {
    return typeof window !== "undefined"
      ? window.location.origin
      : "http://localhost";
  }
}

/** Turn relative API paths into an absolute URL on the configured API origin. */
export function resolveRemoteAssetUrl(uri: string): string {
  const t = uri.trim();
  if (!t) return "";
  if (/^https?:\/\//i.test(t)) return toSecureRemoteUri(t);
  const origin = getApiOriginFromEnv();
  const path = t.startsWith("/") ? t : `/${t}`;
  return `${origin}${path}`;
}

/** Same origin as configured API (`NEXT_PUBLIC_API_URL`) — Bearer may be required for the asset. */
export function remoteUriSameOriginAsConfiguredApi(absUrl: string): boolean {
  if (!absUrl) return false;
  try {
    const asset = new URL(absUrl);
    return asset.origin === getApiOriginFromEnv();
  } catch {
    return false;
  }
}
