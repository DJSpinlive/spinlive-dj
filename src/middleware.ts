import { jwtDecode } from "jwt-decode";
import { NextRequest, NextResponse } from "next/server";

// Define constants directly in middleware since path aliases don't work here
const AUTH_COOKIE_NAMES = {
  token: "auth_token",
  refreshToken: "refresh_token",
} as const;

/**
 * Decode JWT without verifying signature (backend handles that)
 * Returns null if token is invalid
 */
function decodeToken(token: string): Record<string, unknown> | null {
  try {
    return jwtDecode(token);
  } catch {
    return null;
  }
}

/**
 * Check if JWT token has expired
 */
function isTokenExpired(token: string): boolean {
  const decoded = decodeToken(token);
  if (!decoded || !decoded.exp) {
    return true;
  }
  // exp is in seconds, current time in milliseconds
  return (decoded.exp as number) * 1000 < Date.now();
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Get tokens from cookies
  const authToken = request.cookies.get(AUTH_COOKIE_NAMES.token)?.value;
  const refreshToken = request.cookies.get(
    AUTH_COOKIE_NAMES.refreshToken
  )?.value;

  // Define protected routes (require login)
  const protectedRoutes = ["/dashboard", "/profile", "/orders", "/wallet"];

  // Define auth routes (redirect away if logged in)
  const authRoutes = ["/sign-in", "/sign-up", "/forgot-password"];

  // Check if current path is a protected route
  const isProtectedRoute = protectedRoutes.some((route) =>
    pathname.startsWith(route)
  );

  // Check if current path is an auth route
  const isAuthRoute = authRoutes.some((route) => pathname.startsWith(route));

  // Determine if user has valid session
  let hasValidSession = false;
  if (authToken) {
    if (!isTokenExpired(authToken)) {
      hasValidSession = true;
    } else if (refreshToken) {
      // Token expired but refresh_token exists - allow through
      // Re-auth will happen client-side
      hasValidSession = true;
    }
  }

  // Protected routes: require valid session
  if (isProtectedRoute && !hasValidSession) {
    const signInUrl = new URL("/sign-in", request.url);
    signInUrl.searchParams.set("redirect", pathname);
    return NextResponse.redirect(signInUrl);
  }

  // Auth routes: redirect to /dashboard if already logged in
  if (isAuthRoute && hasValidSession) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - api (api routes)
     * - public (public folder assets)
     */
    "/((?!_next/static|_next/image|favicon.ico|api|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
