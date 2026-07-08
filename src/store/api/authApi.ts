import {
  LoginUserRequest,
  LoginUserResponse,
  LogoutRequest,
  RefreshTokenResponse,
  RegisterUserRequest,
  RegisterUserResponse,
  VerifyAccountRequest,
  VerifyAccountResponse,
} from "@/types/auth.types";
import { BASE_PATHS } from "@/utilities";

import { baseSlice } from "./apiSlice";

export const authApi = baseSlice.injectEndpoints({
  overrideExisting: true,
  endpoints: (builder) => ({
    registerUser: builder.mutation<RegisterUserResponse, RegisterUserRequest>({
      query: (body: RegisterUserRequest) => ({
        url: `${BASE_PATHS.AUTH_SERVICE}/register`,
        method: "POST",
        body,
      }),
    }),
    loginUser: builder.mutation<LoginUserResponse, LoginUserRequest>({
      query: (user: LoginUserRequest) => ({
        url: `${BASE_PATHS.AUTH_SERVICE}/login`,
        method: "POST",
        body: user,
      }),
    }),
    verifyAccount: builder.mutation<
      VerifyAccountResponse,
      VerifyAccountRequest
    >({
      query: (body: VerifyAccountRequest) => ({
        url: `${BASE_PATHS.AUTH_SERVICE}/verify`,
        method: "POST",
        body,
      }),
    }),
    logoutUser: builder.mutation<void, LogoutRequest>({
      query: (body) => ({
        url: `${BASE_PATHS.AUTH_SERVICE}/logout`,
        method: "POST",
        body,
      }),
    }),
    refreshToken: builder.mutation<
      RefreshTokenResponse,
      { refresh_token: string }
    >({
      query: ({ refresh_token: refreshToken }) => ({
        url: `${BASE_PATHS.AUTH_SERVICE}/refresh`,
        method: "POST",
        body: { refresh_token: refreshToken },
      }),
    }),
  }),
});

export const {
  useRegisterUserMutation,
  useLoginUserMutation,
  useVerifyAccountMutation,
  useLogoutUserMutation,
} = authApi;
