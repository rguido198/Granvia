import { NextResponse, type NextRequest } from "next/server";
import { CONSOLE_LOGIN_PATH } from "@/lib/console-session";
import { PRIVATE_GATE_PATH, SITE_ACCESS_COOKIE, verifySiteAccessCookie } from "@/lib/site-session";
import { createSupabaseMiddlewareClient } from "@/lib/auth/middleware-client";

const TENANT_LOGIN_PATH = "/inquilinos/acceso";

export const config = {
  matcher: [
    /*
     * Match all request paths except static files and assets:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico, images, logos
     * - .well-known/workflow (Workflow SDK's internal resume requests —
     *   intercepting these breaks workflow suspend/resume, see
     *   node_modules/workflow/docs/getting-started/next.mdx)
     */
    "/((?!_next/static|_next/image|brand|tenants|photos|favicon.ico|file.svg|globe.svg|window.svg|\\.well-known/workflow/).*)",
  ],
};

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  // 1. Bypass static assets, private gate form, console login, and API routes.
  // API routes own their own auth (or are deliberately open, like /api/ingest —
  // meant to be called by systems with no browser session at all, e.g. a
  // WhatsApp bridge per maintenance-dispatcher/SKILL.md §1's intake channels).
  // Rewriting them to an HTML gate page broke every one of them outright: a
  // POST with no site-access cookie landed on /acceso-privado's own
  // Server Action dispatcher instead of the API handler, which is a 404, not
  // a 401 — found live, not by any static check.
  if (
    pathname.startsWith(PRIVATE_GATE_PATH) ||
    pathname.startsWith(CONSOLE_LOGIN_PATH) ||
    pathname.startsWith(TENANT_LOGIN_PATH) ||
    pathname.startsWith("/auth/") ||
    pathname.startsWith("/api/") ||
    pathname.startsWith("/contratista/")
  ) {
    return NextResponse.next();
  }

  // 2. Global Site Access Gate check — cookie value must carry a valid HMAC
  // signature, not just equal the literal string "granted" (a client-set
  // cookie can't forge that without SITE_SESSION_SECRET).
  const siteAccessCookie = request.cookies.get(SITE_ACCESS_COOKIE)?.value;
  const hasSiteAccess = await verifySiteAccessCookie(siteAccessCookie);

  // If site access cookie is missing, rewrite to private access gate
  if (!hasSiteAccess) {
    const gateUrl = request.nextUrl.clone();
    gateUrl.pathname = PRIVATE_GATE_PATH;
    gateUrl.search = "";
    return NextResponse.rewrite(gateUrl);
  }

  // 3. Landlord console gate — real Supabase Auth session + role='landlord'.
  // CONSOLE_LOGIN_PATH itself is already handled in block 1.
  if (pathname.startsWith("/consola")) {
    return requireRole(request, "landlord", CONSOLE_LOGIN_PATH);
  }

  // 3b. Tenant portal gate — real Supabase Auth session + role='tenant'.
  // TENANT_LOGIN_PATH itself is already handled in block 1.
  if (pathname.startsWith("/inquilinos")) {
    return requireRole(request, "tenant", TENANT_LOGIN_PATH);
  }

  // 4. Serve requested page
  return NextResponse.next();
}

async function requireRole(request: NextRequest, role: "landlord" | "tenant", loginPath: string) {
  const { supabase, getResponse } = createSupabaseMiddlewareClient(request);

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return redirectTo(request, loginPath);

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (!profile || profile.role !== role) return redirectTo(request, loginPath);

  const response = getResponse();
  response.headers.set("Cache-Control", "no-store");
  return response;
}

function redirectTo(request: NextRequest, path: string) {
  const url = request.nextUrl.clone();
  url.pathname = path;
  url.search = "";
  const response = NextResponse.rewrite(url);
  response.headers.set("Cache-Control", "no-store");
  return response;
}
