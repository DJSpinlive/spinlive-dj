import { User } from "./index";

// Auth response types
export interface AuthResponse {
  user: User;
  access_token: string;
  token_type: string;
  refresh_token?: string;
}

export interface VerifyMagicLinkResponse {
  user: User;
  access_token: string;
  token_type: string;
  refresh_token?: string;
}
