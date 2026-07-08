import { User } from "./user.types";

export interface RegisterUserRequest {
  email: string; // must be a valid email
  password: string; // must be at least 8 characters
  display_name: string;
  role?: "end_user" | "dj" | "admin"; // optional, defaults to 'end_user'
}

export interface RegisterUserResponse {
  access_token: string;
  refresh_token: string;
  token_type: "bearer";
  expires_in: number;
  user: {
    display_name: string;
    email: string;
    id: string;
    kyc_verified: boolean;
    role: "end_user" | "dj" | "admin";
  };
}

export interface LoginUserRequest {
  email: string; // must be a valid email
  password: string; // must be at least 8 characters
}

export interface LoginUserResponse {
  access_token: string;
  refresh_token: string;
  token_type?: string; // Default "bearer"
  expires_in?: number; // Default 3600
  user: User;
}

export interface VerifyAccountRequest {
  token: string;
}

export interface VerifyAccountResponse {
  access_token: string;
  refresh_token: string;
  token_type?: string; // Default "bearer"
  expires_in?: number; // Default 3600
  user: User;
}

export interface LogoutRequest {
  refresh_token?: string | null;
}

export interface RefreshTokenResponse {
  access_token: string;
  refresh_token: string;
  token_type?: string; // Default "bearer"
  expires_in?: number; // Default 3600
}
