"use client";

import { yupResolver } from "@hookform/resolvers/yup";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { SubmitHandler, useForm } from "react-hook-form";
import * as yup from "yup";

import { FormButton } from "@/components/ui/form-button";
import { FormInput } from "@/components/ui/form-input";
import { useRegisterUserMutation } from "@/store/api";
import { useAppDispatch } from "@/store/hooks";
import { refreshTokenSuccess } from "@/store/slices/authSlice";
import { setAuthTokensToCookies } from "@/utilities/clientCookies";
import { getErrorMessage } from "@/utilities/helpers";

const signupSchema = yup
  .object({
    displayName: yup
      .string()
      .trim()
      .min(2, "Display name must be at least 2 characters")
      .required("Display name is required"),
    email: yup
      .string()
      .trim()
      .email("Enter a valid email address")
      .required("Email address is required"),
    password: yup
      .string()
      .min(6, "Password must be at least 6 characters")
      .required("Password is required"),
  })
  .required();

type SignupFormValues = yup.InferType<typeof signupSchema>;

export default function SignupPage() {
  const dispatch = useAppDispatch();
  const router = useRouter();
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [registerUser] = useRegisterUserMutation();
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<SignupFormValues>({
    resolver: yupResolver(signupSchema),
    defaultValues: {
      displayName: "",
      email: "",
      password: "",
    },
    mode: "onBlur",
  });

  const onSubmit: SubmitHandler<SignupFormValues> = async (values) => {
    setSubmitError(null);
    try {
      const response = await registerUser({
        email: values.email,
        password: values.password,
        display_name: values.displayName,
      }).unwrap();

      setAuthTokensToCookies(response);
      dispatch(
        refreshTokenSuccess({
          token: response.access_token,
          refreshToken: response.refresh_token,
        })
      );
      router.push("/home");
    } catch (error: unknown) {
      setSubmitError(
        getErrorMessage(error, {
          fallbackMessage: "Unable to create account. Please try again.",
        })
      );
    }
  };

  return (
    <main className="min-h-screen bg-[#030a17] px-4 py-6 text-white sm:px-6 md:px-8 md:py-10">
      <div className="mx-auto flex min-h-[calc(100vh-3rem)] w-full max-w-6xl items-center justify-center">
        <div className="grid w-full overflow-hidden rounded-[28px] border border-[#12213c] bg-[#050f1f] shadow-[0_30px_70px_rgba(0,0,0,0.5)] md:grid-cols-2">
          <section className="hidden h-full flex-col justify-between border-r border-[#12213c] bg-[radial-gradient(circle_at_top,#3f2f85_0%,#111d35_40%,#050f1f_75%)] p-10 md:flex">
            <div>
              <span className="inline-flex rounded-full border border-[#6f57f3]/40 bg-[#6f57f3]/20 px-3 py-1 text-xs uppercase tracking-[0.12em] text-[#d5cbff]">
                SpinLive
              </span>
              <h1 className="mt-4 text-3xl font-semibold leading-tight text-white">
                Create your account and get started.
              </h1>
              <p className="mt-3 max-w-sm text-sm leading-relaxed text-[#9aa5bc]">
                Join the platform and start connecting with live music
                experiences built for your community.
              </p>
            </div>

            <div className="rounded-2xl border border-[#334060] bg-[#0a1428]/80 p-5">
              <p className="text-sm text-[#bac7de]">
                Already have an account? Sign in and continue your session.
              </p>
              <button
                type="button"
                onClick={() => router.push("/login")}
                className="mt-4 rounded-xl bg-[#7d5ef5] px-5 py-2.5 text-xs font-medium text-white transition hover:bg-[#8c70ff]"
              >
                Go to login
              </button>
            </div>
          </section>

          <section className="w-full p-4 sm:p-8 md:p-10">
            <button
              type="button"
              onClick={() => router.back()}
              className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-[#1e2a46] bg-[#050d1b] text-xl text-[#c5cee0]"
              aria-label="Go back"
            >
              ←
            </button>

            <h2 className="mt-6 text-3xl font-semibold leading-tight text-white">
              Create Account
            </h2>
            <p className="mt-2 max-w-sm text-base leading-6 text-[#9da8bf]">
              Sign up to unlock your interactive DJ experience.
            </p>

            <form className="mt-8 space-y-5" onSubmit={handleSubmit(onSubmit)}>
              {submitError && (
                <p
                  role="alert"
                  className="rounded-lg border border-[#f87171]/50 bg-[#3c1f2a]/60 px-3 py-2 text-sm text-[#fecaca]"
                >
                  {submitError}
                </p>
              )}

              <FormInput
                id="displayName"
                label="Display Name"
                aria-label="Display name"
                type="text"
                placeholder="Alex Johnson"
                error={errors.displayName?.message}
                {...register("displayName")}
              />

              <FormInput
                id="email"
                label="Email Address"
                aria-label="Email address"
                type="email"
                placeholder="alex@example.com"
                error={errors.email?.message}
                {...register("email")}
              />

              <FormInput
                id="password"
                label="Password"
                aria-label="Password"
                type={isPasswordVisible ? "text" : "password"}
                placeholder="••••••••"
                error={errors.password?.message}
                rightAdornment={
                  <button
                    type="button"
                    onClick={() => setIsPasswordVisible((current) => !current)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-lg text-[#6e7893]"
                    aria-label={
                      isPasswordVisible ? "Hide password" : "Show password"
                    }
                  >
                    {isPasswordVisible ? "🙈" : "👁"}
                  </button>
                }
                {...register("password")}
              />

              <FormButton
                type="submit"
                disabled={isSubmitting}
                className="bg-gradient-to-r from-[#8a63ff] to-[#6f56f3] text-base hover:from-[#9b7bff] hover:to-[#7b66ff]"
              >
                {isSubmitting ? "Creating account..." : "Create Account"}
              </FormButton>
            </form>

            <p className="mt-7 text-center text-sm text-[#8b95ad]">
              Already have an account?{" "}
              <button
                type="button"
                onClick={() => router.push("/login")}
                className="text-sm font-medium text-[#7d66ff] transition hover:text-[#9a86ff]"
              >
                Log in
              </button>
            </p>
          </section>
        </div>
      </div>
    </main>
  );
}
