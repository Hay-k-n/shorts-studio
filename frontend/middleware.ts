import { type NextRequest, NextResponse } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";
import { WORKSPACE_COOKIE } from "@/lib/workspace";

export async function middleware(request: NextRequest) {
  const { response, user } = await updateSession(request);

  const { pathname } = request.nextUrl;
  const isAuthRoute = pathname.startsWith("/login") || pathname.startsWith("/signup");
  const workspaceId = request.cookies.get(WORKSPACE_COOKIE)?.value;

  // Not authenticated → gate all non-auth page routes
  if (!user && !isAuthRoute) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  // Authenticated + hitting an auth route → only redirect away if a workspace
  // is already selected; otherwise stay so the multi-workspace picker can show.
  if (user && isAuthRoute) {
    if (workspaceId) {
      return NextResponse.redirect(new URL("/dashboard", request.url));
    }
    return response;
  }

  // Authenticated + protected route → always allow through.
  // Workspace selection is enforced client-side in the dashboard, not here.
  // Gating on the workspace cookie in middleware caused a redirect loop when
  // the cookie write (document.cookie) and window.location.href navigation
  // raced on slower connections.
  return response;
}

export const config = {
  // Exclude /api/* entirely — those routes handle their own auth.
  // A middleware redirect on an API route preserves the HTTP method (307),
  // which causes a 405 when it lands on a page route with no POST handler.
  matcher: [
    "/((?!api/|_next/static|_next/image|favicon\\.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
