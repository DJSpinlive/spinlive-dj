import { createSlice, PayloadAction } from "@reduxjs/toolkit";

/** Mirrors API user fields used in auth responses — extend when wiring login UI */
export interface AuthUser {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
  avatarUrl?: string;
}

interface AuthState {
  user: AuthUser | null;
  token: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
}

const initialState: AuthState = {
  user: null,
  token: null,
  refreshToken: null,
  isAuthenticated: false,
};

const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    logout: (state) => {
      state.isAuthenticated = false;
      state.user = null;
      state.token = null;
      state.refreshToken = null;
    },
    refreshTokenSuccess: (
      state,
      action: PayloadAction<{
        token: string;
        refreshToken?: string;
      }>
    ) => {
      state.token = action.payload.token;
      state.isAuthenticated = true;
      if (action.payload.refreshToken) {
        state.refreshToken = action.payload.refreshToken;
      }
    },
  },
});

export const { logout, refreshTokenSuccess } = authSlice.actions;
export default authSlice.reducer;
