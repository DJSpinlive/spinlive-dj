export interface DjReview {
  id?: string;
  dj_id?: string;
  reviewer_id?: string;
  rating?: number;
  comment?: string;
  /** API may expose alternate text fields */
  content?: string;
  text?: string;
  reviewer_display_name?: string;
  reviewer_name?: string;
  reviewer_avatar_url?: string | null;
  created_at?: string | null;
}

export type GetDjReviewsResponse = DjReview[];
