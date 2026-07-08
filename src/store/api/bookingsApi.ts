import {
  AvailabilityBlockRequest,
  BlockedSlot,
  Booking,
  BookingAvailability,
  BookingHistoryEntry,
  BookingQuoteRequest,
  GetBookingsParams,
  GetBookingsResponse,
} from "@/types/bookings.types";
import { BASE_PATHS } from "@/utilities";
import { removeEmptyParams } from "@/utilities/helpers";

import { baseSlice } from "./apiSlice";

export const bookingsApi = baseSlice.injectEndpoints({
  overrideExisting: true,
  endpoints: (builder) => ({
    getBookings: builder.query<GetBookingsResponse, GetBookingsParams>({
      query: (params) => ({
        url: `${BASE_PATHS.BOOKINGS_SERVICE}`,
        method: "GET",
        params: removeEmptyParams(params),
      }),
      providesTags: ["Bookings"],
    }),

    getBookingDetails: builder.query<Booking, string>({
      query: (id) => ({
        url: `${BASE_PATHS.BOOKINGS_SERVICE}/${id}`,
        method: "GET",
      }),
      providesTags: (_result, _error, id) => [{ type: "Bookings", id }],
    }),

    getBookingHistory: builder.query<BookingHistoryEntry[], string>({
      query: (id) => ({
        url: `${BASE_PATHS.BOOKINGS_SERVICE}/${id}/history`,
        method: "GET",
      }),
      providesTags: (_result, _error, id) => [
        { type: "Bookings", id: `${id}-history` },
      ],
    }),

    /** DJ answers a `pending_dj_review` request with a price quote. */
    submitBookingQuote: builder.mutation<
      Booking,
      { id: string } & BookingQuoteRequest
    >({
      query: ({ id, ...body }) => ({
        url: `${BASE_PATHS.BOOKINGS_SERVICE}/${id}/quote`,
        method: "POST",
        body,
      }),
      invalidatesTags: (_result, _error, { id }) => [
        { type: "Bookings", id },
        "Bookings",
        "Availability",
      ],
    }),

    /** DJ marks a confirmed booking as completed after the event. */
    completeBooking: builder.mutation<Booking, string>({
      query: (id) => ({
        url: `${BASE_PATHS.BOOKINGS_SERVICE}/${id}/complete`,
        method: "POST",
      }),
      invalidatesTags: (_result, _error, id) => [
        { type: "Bookings", id },
        "Bookings",
      ],
    }),

    cancelBooking: builder.mutation<void, { id: string; reason: string }>({
      query: ({ id, reason }) => ({
        url: `${BASE_PATHS.BOOKINGS_SERVICE}/${id}`,
        method: "DELETE",
        body: { reason },
      }),
      invalidatesTags: (_result, _error, { id }) => [
        { type: "Bookings", id },
        "Bookings",
        "Availability",
      ],
    }),

    getDjAvailability: builder.query<
      BookingAvailability,
      { djId: string; date: string }
    >({
      query: ({ djId, date }) => ({
        url: `${BASE_PATHS.BOOKINGS_SERVICE}/djs/${djId}/availability`,
        method: "GET",
        params: removeEmptyParams({ date }),
      }),
      providesTags: ["Availability"],
    }),

    getDjAvailabilityRange: builder.query<
      BookingAvailability[],
      { djId: string; startDate: string; endDate: string }
    >({
      query: ({ djId, startDate, endDate }) => ({
        url: `${BASE_PATHS.BOOKINGS_SERVICE}/djs/${djId}/availability/range`,
        method: "GET",
        params: removeEmptyParams({ startDate, endDate }),
      }),
      providesTags: ["Availability"],
    }),

    /** Block a time slot on the DJ's own calendar. */
    blockAvailabilitySlot: builder.mutation<
      BlockedSlot,
      AvailabilityBlockRequest
    >({
      query: (body) => ({
        url: `${BASE_PATHS.BOOKINGS_SERVICE}/me/availability/blocks`,
        method: "POST",
        body,
      }),
      invalidatesTags: ["Availability"],
    }),

    removeAvailabilityBlock: builder.mutation<void, number>({
      query: (blockId) => ({
        url: `${BASE_PATHS.BOOKINGS_SERVICE}/me/availability/blocks/${blockId}`,
        method: "DELETE",
      }),
      invalidatesTags: ["Availability"],
    }),
  }),
});

export const {
  useGetBookingsQuery,
  useGetBookingDetailsQuery,
  useGetBookingHistoryQuery,
  useSubmitBookingQuoteMutation,
  useCompleteBookingMutation,
  useCancelBookingMutation,
  useGetDjAvailabilityQuery,
  useGetDjAvailabilityRangeQuery,
  useBlockAvailabilitySlotMutation,
  useRemoveAvailabilityBlockMutation,
} = bookingsApi;
