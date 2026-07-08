export type BookingStatus =
  | "pending_dj_review"
  | "awaiting_end_user_confirmation"
  | "confirmed"
  | "declined_by_end_user"
  | "declined_by_dj"
  | "cancelled_by_user"
  | "cancelled_by_dj"
  | "cancelled_by_admin"
  | "completed";

export interface GetBookingsParams {
  djId?: string;
  fanId?: string;
  status?: BookingStatus;
  upcoming?: boolean;
  past?: boolean;
}

export interface Booking {
  id: string;
  endUserId: string;
  djId: string;
  endUserDisplayName: string;
  djDisplayName: string;
  djAvatarUrl: string | null;
  status: BookingStatus;
  eventType: string;
  eventDate: string;
  /** Local time on `eventDate`, e.g. `"13:00:00"`. */
  startTime: string;
  /** Local time on `eventDate`, e.g. `"17:00:00"`. */
  endTime: string;
  timezone: string;
  locationType: "virtual" | "venue" | "hybrid" | "in_person";
  venueName: string;
  venueAddress: string;
  genreNotes: string | null;
  specialRequests: string | null;
  guestCount: number;
  budgetAmount: number;
  quotedAmount: number | null;
  finalAmount: number | null;
  depositAmount: number | null;
  currency: string;
  cancellationReason: string | null;
  lastStatusNote: string | null;
  createdAt: string;
  updatedAt: string;
}

export type GetBookingsResponse = Booking[];

/** DJ's response to a booking request in `pending_dj_review`. */
export interface BookingQuoteRequest {
  quotedAmount: number; // > 0
  depositAmount?: number; // > 0
  note?: string; // max 1000 chars
}

export interface BookingHistoryEntry {
  id: number;
  fromStatus: BookingStatus;
  toStatus: BookingStatus;
  changedByUserId: string;
  changedByRole: string;
  note: string | null;
  createdAt: string;
}

/** Block a time slot on the DJ's own calendar. */
export interface AvailabilityBlockRequest {
  date: string; // e.g., "2026-07-12"
  /** Time of day, "HH:MM:SS". */
  startTime: string;
  /** Time of day, "HH:MM:SS". */
  endTime: string;
  reason?: string; // max 500 chars
}

export interface BlockedSlot {
  id: number;
  /** Time of day, "HH:MM:SS". */
  startTime: string;
  /** Time of day, "HH:MM:SS". */
  endTime: string;
  reason: string;
}

export interface AvailabilityWindow {
  /** Time of day, "HH:MM:SS". */
  startTime: string;
  /** Time of day, "HH:MM:SS". */
  endTime: string;
}

export interface BookingAvailability {
  djId: string;
  date: string; // e.g., "2026-05-07"
  hasBookings: boolean;
  availableSlots: AvailabilityWindow[];
  bookedSlots: AvailabilityWindow[];
  blockedSlots: BlockedSlot[];
}
