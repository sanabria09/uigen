// `server-only` is a guard package — importing it causes a build error if this
// module is accidentally bundled for the browser. Auth logic must stay server-side.
import "server-only";
import { SignJWT, jwtVerify } from "jose";
// `cookies()` from next/headers reads/writes the current request's cookies.
// It only works in Server Components, Server Actions, and Route Handlers.
import { cookies } from "next/headers";
import { NextRequest } from "next/server";

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || "development-secret-key"
);

const COOKIE_NAME = "auth-token";

export interface SessionPayload {
  userId: string;
  email: string;
  expiresAt: Date;
}

// Signs a JWT and writes it into an httpOnly cookie.
// httpOnly means JavaScript running in the browser cannot read the cookie,
// which protects against XSS attacks stealing the token.
export async function createSession(userId: string, email: string) {
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days
  const session: SessionPayload = { userId, email, expiresAt };

  const token = await new SignJWT({ ...session })
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime("7d")
    .setIssuedAt()
    .sign(JWT_SECRET);

  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    expires: expiresAt,
    path: "/",
  });
}

// Reads and verifies the JWT from the cookie store.
// Used inside Server Components and Server Actions where the full cookie API is available.
export async function getSession(): Promise<SessionPayload | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;

  if (!token) {
    return null;
  }

  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    return payload as unknown as SessionPayload;
  } catch (error) {
    // Token is missing, expired, or tampered — treat as unauthenticated.
    return null;
  }
}

export async function deleteSession() {
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_NAME);
}

// Separate verifySession for middleware: middleware runs on the Edge runtime
// before the request reaches a route, so it receives a NextRequest object
// instead of the cookies() helper used in Server Components.
export async function verifySession(
  request: NextRequest
): Promise<SessionPayload | null> {
  const token = request.cookies.get(COOKIE_NAME)?.value;

  if (!token) {
    return null;
  }

  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    return payload as unknown as SessionPayload;
  } catch (error) {
    return null;
  }
}
