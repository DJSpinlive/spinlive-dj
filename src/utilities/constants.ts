// Cookie names used by the API client and middleware (keep in sync)
export const AUTH_COOKIE_NAMES = {
  token: "auth_token",
  refreshToken: "refresh_token",
} as const;

// Environment — add keys here only when something in the app imports them
export const ENV_VARS = {
  API_URL: process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000/api",
} as const;

export const BASE_PATHS = {
  USER_SERVICE: "/users",
  STREAMS_SERVICE: "/streams",
  AUTH_SERVICE: "/auth",
  NOTIFICATION_SERVICE: "/notification",
  BOOKINGS_SERVICE: "/bookings",
};
