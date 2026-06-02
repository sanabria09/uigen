// middleware.ts runs on the Edge runtime before every matching request —
// before the page or API route handler executes. Use it for things like auth
// checks, redirects, or header injection that need to run on every request.
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { verifySession } from "@/lib/auth";

export async function middleware(request: NextRequest) {
  // verifySession reads the JWT cookie from the incoming request headers.
  const session = await verifySession(request);

  const protectedPaths = ["/api/projects", "/api/filesystem"];
  const isProtectedPath = protectedPaths.some((path) =>
    request.nextUrl.pathname.startsWith(path)
  );

  if (isProtectedPath && !session) {
    return NextResponse.json(
      { error: "Authentication required" },
      { status: 401 }
    );
  }

  // `NextResponse.next()` means "proceed normally — don't redirect or block."
  return NextResponse.next();
}

// `config.matcher` controls which URLs the middleware runs on.
// This regex skips Next.js internals and static assets so they aren't slowed down.
export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};