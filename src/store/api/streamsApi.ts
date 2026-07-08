import {
  CreateStreamRequest,
  StreamCredentials,
  StreamSession,
  StreamState,
} from "@/types/streams.types";
import { BASE_PATHS } from "@/utilities";

import { baseSlice } from "./apiSlice";

export const streamsApi = baseSlice.injectEndpoints({
  overrideExisting: true,
  endpoints: (builder) => ({
    /** Provision LiveKit room + RTMP ingress for the authenticated DJ. */
    createStream: builder.mutation<StreamCredentials, CreateStreamRequest>({
      query: (body) => ({
        url: `${BASE_PATHS.STREAMS_SERVICE}/`,
        method: "POST",
        body,
      }),
      invalidatesTags: ["Streams"],
    }),

    getStreamState: builder.query<StreamState, string>({
      query: (streamId) => ({
        url: `${BASE_PATHS.STREAMS_SERVICE}/${streamId}`,
        method: "GET",
      }),
      providesTags: (_result, _error, streamId) => [
        { type: "Streams", id: streamId },
      ],
    }),

    /** Tear down the stream and persist the session to history. */
    endStream: builder.mutation<void, string>({
      query: (streamId) => ({
        url: `${BASE_PATHS.STREAMS_SERVICE}/${streamId}`,
        method: "DELETE",
      }),
      invalidatesTags: ["Streams"],
    }),

    /** Reuse the same ingress within the 30s drop-recovery window. */
    resumeStream: builder.mutation<StreamCredentials, string>({
      query: (streamId) => ({
        url: `${BASE_PATHS.STREAMS_SERVICE}/${streamId}/resume`,
        method: "POST",
      }),
      invalidatesTags: ["Streams"],
    }),

    /** The calling DJ's recent completed sessions. */
    getStreamHistory: builder.query<StreamSession[], { limit?: number } | void>(
      {
        query: (params) => ({
          url: `${BASE_PATHS.STREAMS_SERVICE}/history`,
          method: "GET",
          params: params ?? undefined,
        }),
        providesTags: ["Streams"],
      }
    ),
  }),
});

export const {
  useCreateStreamMutation,
  useGetStreamStateQuery,
  useEndStreamMutation,
  useResumeStreamMutation,
  useGetStreamHistoryQuery,
} = streamsApi;
