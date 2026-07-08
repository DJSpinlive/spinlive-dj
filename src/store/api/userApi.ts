import type { DjReview, GetDjReviewsResponse } from "@/types/dj.types";
import {
  Genre,
  SetLiveStatusRequest,
  UpdateAvailabilityRequest,
  UpdateDjGenresRequest,
  UpdateUserRequest,
  UploadUserAvatarResponse,
  User,
} from "@/types/user.types";
import { BASE_PATHS } from "@/utilities";

import { baseSlice } from "./apiSlice";

/** Accept bare `User` or `{ user | profile | data }` wrappers from `/me`. */
function normalizeMePayload(raw: unknown): User {
  if (raw && typeof raw === "object") {
    const o = raw as Record<string, unknown>;
    const nested = [o.user, o.profile, o.data];
    const hit = nested.find(
      (n) =>
        n &&
        typeof n === "object" &&
        typeof (n as { id?: unknown }).id === "string"
    );
    if (hit && typeof hit === "object") {
      return hit as User;
    }
    if (typeof o.id === "string") {
      return o as unknown as User;
    }
  }
  return raw as User;
}

function isGenreLike(x: unknown): x is Genre {
  if (!x || typeof x !== "object") return false;
  const o = x as Record<string, unknown>;
  return typeof o.slug === "string";
}

/** Accept `Genre[]` or `{ genres }` / `{ data }` wrappers. */
function normalizeGenreList(raw: unknown): Genre[] {
  if (!raw) return [];
  if (Array.isArray(raw)) {
    return raw.filter(isGenreLike) as Genre[];
  }
  if (typeof raw === "object") {
    const o = raw as Record<string, unknown>;
    const nested = [o.genres, o.data, o.items];
    const list = nested.find((n): n is unknown[] => Array.isArray(n));
    if (list) {
      return list.filter(isGenreLike) as Genre[];
    }
  }
  return [];
}

export const userApi = baseSlice.injectEndpoints({
  overrideExisting: true,
  endpoints: (builder) => ({
    getUser: builder.query<User, void>({
      query: () => `${BASE_PATHS.USER_SERVICE}/me`,
      transformResponse: (response: unknown) => normalizeMePayload(response),
      providesTags: ["User"],
    }),

    updateUser: builder.mutation<User, UpdateUserRequest>({
      query: (user) => ({
        url: `${BASE_PATHS.USER_SERVICE}/me`,
        method: "PUT",
        body: user,
      }),
      transformResponse: (response: unknown) => normalizeMePayload(response),
      invalidatesTags: ["User"],
    }),

    uploadUserAvatar: builder.mutation<UploadUserAvatarResponse, FormData>({
      query: (formData) => ({
        url: `${BASE_PATHS.USER_SERVICE}/me/avatar`,
        method: "POST",
        body: formData,
      }),
      transformResponse: (raw: unknown) => {
        if (raw && typeof raw === "object") {
          const o = raw as Record<string, unknown>;
          const nested = [o.data, o.user, o.profile];
          const hit = nested.find(
            (n) =>
              n &&
              typeof n === "object" &&
              typeof (n as { avatar_url?: unknown }).avatar_url === "string"
          );
          if (hit) {
            return hit as UploadUserAvatarResponse;
          }
          if (typeof o.avatar_url === "string") {
            return o as unknown as UploadUserAvatarResponse;
          }
        }
        return raw as UploadUserAvatarResponse;
      },
      invalidatesTags: ["User"],
    }),

    /** Platform genre catalog — options for the DJ's genre picker. */
    listGenres: builder.query<Genre[], void>({
      query: () => `${BASE_PATHS.USER_SERVICE}/genres`,
      transformResponse: (response: unknown) => normalizeGenreList(response),
      providesTags: ["Genres"],
    }),

    /** Set the genres the DJ plays (shown on the public profile). */
    updateDjGenres: builder.mutation<Genre[], UpdateDjGenresRequest>({
      query: (body) => ({
        url: `${BASE_PATHS.USER_SERVICE}/me/genres`,
        method: "PUT",
        body,
      }),
      transformResponse: (response: unknown) => normalizeGenreList(response),
      invalidatesTags: ["User"],
    }),

    updateAvailability: builder.mutation<User, UpdateAvailabilityRequest>({
      query: (body) => ({
        url: `${BASE_PATHS.USER_SERVICE}/me/availability`,
        method: "POST",
        body,
      }),
      transformResponse: (response: unknown) => normalizeMePayload(response),
      invalidatesTags: ["User", "Availability"],
    }),

    setLiveStatus: builder.mutation<User, SetLiveStatusRequest>({
      query: (body) => ({
        url: `${BASE_PATHS.USER_SERVICE}/me/live`,
        method: "PATCH",
        body,
      }),
      transformResponse: (response: unknown) => normalizeMePayload(response),
      invalidatesTags: ["User"],
    }),

    /** Reviews left on a DJ profile — pass the DJ's own id to see their reviews. */
    getDjReviews: builder.query<GetDjReviewsResponse, { djId: string }>({
      query: ({ djId }) => ({
        url: `${BASE_PATHS.USER_SERVICE}/djs/${djId}/reviews`,
        method: "GET",
      }),
      transformResponse: (
        raw: DjReview[] | { reviews?: DjReview[] }
      ): GetDjReviewsResponse => {
        if (Array.isArray(raw)) return raw;
        if (raw && typeof raw === "object" && Array.isArray(raw.reviews)) {
          return raw.reviews;
        }
        return [];
      },
      providesTags: (_result, _error, { djId }) => [
        { type: "DjReviews", id: djId },
      ],
    }),
  }),
});

export const {
  useGetUserQuery,
  useUpdateUserMutation,
  useUploadUserAvatarMutation,
  useListGenresQuery,
  useUpdateDjGenresMutation,
  useUpdateAvailabilityMutation,
  useSetLiveStatusMutation,
  useGetDjReviewsQuery,
} = userApi;
