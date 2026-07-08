import type {
  BaseQueryFn,
  FetchArgs,
  FetchBaseQueryError,
} from "@reduxjs/toolkit/query";
import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";

import { logout, refreshTokenSuccess } from "@/store/slices/authSlice";
import {
  clearAllAuthCookies,
  getClientCookie,
  setRefreshTokenToCookie,
  setTokenToCookie,
} from "@/utilities/clientCookies";
import { AUTH_COOKIE_NAMES, BASE_PATHS, ENV_VARS } from "@/utilities/constants";

interface RefreshResponse {
  access_token: string;
  refresh_token?: string;
}

let refreshPromise: Promise<RefreshResponse | null> | null = null;

const getHasAuthorizationHeader = (headers: Headers): boolean =>
  headers.has("Authorization") || headers.has("authorization");

const toHeaders = (headersInit?: FetchArgs["headers"]): Headers => {
  const headers = new Headers();
  if (!headersInit) return headers;

  if (headersInit instanceof Headers) {
    headersInit.forEach((value, key) => {
      headers.set(key, value);
    });
    return headers;
  }

  if (Array.isArray(headersInit)) {
    headersInit.forEach((header) => {
      const [key, value] = header;
      if (key && value !== undefined) {
        headers.set(key, value);
      }
    });
    return headers;
  }

  Object.entries(headersInit).forEach(([key, value]) => {
    if (value !== undefined) {
      headers.set(key, value);
    }
  });

  return headers;
};

const withAuthorizationHeader = (
  args: string | FetchArgs,
  accessToken: string
): FetchArgs => {
  if (typeof args === "string") {
    return {
      url: args,
      headers: { Authorization: `Bearer ${accessToken}` },
    };
  }

  const headers = toHeaders(args.headers);
  headers.set("Authorization", `Bearer ${accessToken}`);

  return { ...args, headers };
};

/** Strip JSON Content-Type before fetch assigns multipart boundaries (Expo parity). */
function normalizeArgsForFetch(args: string | FetchArgs): string | FetchArgs {
  if (typeof args === "string") return args;
  if (!(args.body instanceof FormData)) return args;

  const headers = toHeaders(args.headers);
  headers.delete("Content-Type");
  headers.delete("content-type");
  return { ...args, headers };
}

function isRefreshResponse(data: unknown): data is RefreshResponse {
  return (
    !!data &&
    typeof data === "object" &&
    "access_token" in data &&
    typeof (data as RefreshResponse).access_token === "string"
  );
}

const plainBaseQuery = fetchBaseQuery({
  baseUrl: ENV_VARS.API_URL,
  prepareHeaders: (headers, { endpoint }) => {
    const token = getClientCookie(AUTH_COOKIE_NAMES.token);
    if (token && !getHasAuthorizationHeader(headers)) {
      headers.set("Authorization", `Bearer ${token}`);
    }

    const isMultipart = endpoint === "uploadUserAvatar";
    const hasContentType =
      headers.has("Content-Type") || headers.has("content-type");
    if (!hasContentType && !isMultipart) {
      headers.set("Content-Type", "application/json");
    }

    return headers;
  },
});

const runRefreshFlow = async (
  api: Parameters<
    BaseQueryFn<string | FetchArgs, unknown, FetchBaseQueryError>
  >[1],
  extraOptions: Parameters<
    BaseQueryFn<string | FetchArgs, unknown, FetchBaseQueryError>
  >[2]
): Promise<RefreshResponse | null> => {
  if (typeof window === "undefined") return null;

  const refreshToken = getClientCookie(AUTH_COOKIE_NAMES.refreshToken);
  if (!refreshToken) {
    clearAllAuthCookies();
    api.dispatch(logout());
    return null;
  }

  const refreshResult = await plainBaseQuery(
    {
      url: `${BASE_PATHS.AUTH_SERVICE}/refresh`,
      method: "POST",
      body: { refresh_token: refreshToken },
    },
    api,
    extraOptions
  );

  if (refreshResult.error || !isRefreshResponse(refreshResult.data)) {
    clearAllAuthCookies();
    api.dispatch(logout());
    return null;
  }

  const refreshedTokens = refreshResult.data;

  api.dispatch(
    refreshTokenSuccess({
      token: refreshedTokens.access_token,
      refreshToken: refreshedTokens.refresh_token,
    })
  );

  setTokenToCookie(refreshedTokens.access_token);
  if (refreshedTokens.refresh_token) {
    setRefreshTokenToCookie(refreshedTokens.refresh_token);
  }

  return refreshedTokens;
};

const baseQueryWithReauth: BaseQueryFn<
  string | FetchArgs,
  unknown,
  FetchBaseQueryError
> = async (args, api, extraOptions) => {
  const normalizedArgs = normalizeArgsForFetch(args);

  const requestPath =
    typeof normalizedArgs === "string"
      ? normalizedArgs
      : (normalizedArgs.url ?? "");
  const isAuthRoute = requestPath.includes("/auth");

  let result = await plainBaseQuery(normalizedArgs, api, extraOptions);

  const skipSession401Handling = isAuthRoute;
  const shouldTryRefresh =
    result.error?.status === 401 && !skipSession401Handling;

  if (shouldTryRefresh && typeof window !== "undefined") {
    try {
      if (!refreshPromise) {
        refreshPromise = runRefreshFlow(api, extraOptions).finally(() => {
          refreshPromise = null;
        });
      }

      const refreshedTokens = await refreshPromise;

      if (refreshedTokens) {
        result = await plainBaseQuery(
          withAuthorizationHeader(normalizedArgs, refreshedTokens.access_token),
          api,
          extraOptions
        );
      }
    } catch {
      clearAllAuthCookies();
      api.dispatch(logout());
    }
  }

  if (
    result.error?.status === 401 &&
    !skipSession401Handling &&
    typeof window !== "undefined"
  ) {
    clearAllAuthCookies();
    api.dispatch(logout());
    window.location.href = "/login";
  }

  return result;
};

export const baseSlice = createApi({
  reducerPath: "api",
  tagTypes: [
    "User",
    "Auth",
    "DjReviews",
    "Genres",
    "Bookings",
    "Availability",
    "Streams",
  ],
  baseQuery: baseQueryWithReauth,
  endpoints: () => ({}),
});
