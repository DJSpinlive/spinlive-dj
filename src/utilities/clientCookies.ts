import Cookies from "js-cookie";

import { AUTH_COOKIE_NAMES } from "./constants";

export const getClientCookie = (name: string): string | undefined => {
  if (typeof window === "undefined") return undefined;
  return Cookies.get(name);
};

export const setClientCookie = (
  name: string,
  value: string,
  options?: Cookies.CookieAttributes
): void => {
  if (typeof window === "undefined") return;
  Cookies.set(name, value, {
    expires: 1 / 24, // 1 hour
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    ...options,
  });
};

export const removeClientCookie = (name: string): void => {
  if (typeof window === "undefined") return;
  Cookies.remove(name);
};

export const getTokenFromCookie = (): string | null =>
  getClientCookie(AUTH_COOKIE_NAMES.token) || null;

export const setTokenToCookie = (token: string): void => {
  setClientCookie(AUTH_COOKIE_NAMES.token, token, {
    expires: 1 / 24, // 1 hour
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
  });
};

export const removeTokenFromCookie = (): void => {
  removeClientCookie(AUTH_COOKIE_NAMES.token);
};

export const getRefreshTokenFromCookie = (): string | null =>
  getClientCookie(AUTH_COOKIE_NAMES.refreshToken) || null;

export const setRefreshTokenToCookie = (refreshToken: string): void => {
  setClientCookie(AUTH_COOKIE_NAMES.refreshToken, refreshToken, {
    expires: 30,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
  });
};

interface AuthTokenCookiePayload {
  access_token: string;
  refresh_token?: string | null;
}

export const setAuthTokensToCookies = ({
  access_token: accessToken,
  refresh_token: refreshToken,
}: AuthTokenCookiePayload): void => {
  setTokenToCookie(accessToken);
  if (refreshToken) {
    setRefreshTokenToCookie(refreshToken);
  }
};

export const removeRefreshTokenFromCookie = (): void => {
  removeClientCookie(AUTH_COOKIE_NAMES.refreshToken);
};

export const clearAllAuthCookies = (): void => {
  removeTokenFromCookie();
  removeRefreshTokenFromCookie();
};
