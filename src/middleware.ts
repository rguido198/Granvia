import { NextResponse, type NextRequest } from "next/server";
import {
  CONSOLE_LOGIN_PATH,
  SESSION_COOKIE,
  readConsoleCredentials,
  verifySessionToken,
} from "@/lib/console-session";
import { PRIVATE_GATE_PATH, SITE_ACCESS_COOKIE } from "@/lib/site-session";

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
    pathname.startsWith("/api/")
  ) {
    return NextResponse.next();
  }

  // 2. Global Site Access Gate check
  const siteAccessCookie = request.cookies.get(SITE_ACCESS_COOKIE)?.value;
  const hasSiteAccess = siteAccessCookie === "granted";

  // If site access cookie is missing, rewrite to private access gate
  if (!hasSiteAccess) {
    const gateUrl = request.nextUrl.clone();
    gateUrl.pathname = PRIVATE_GATE_PATH;
    gateUrl.search = "";
    return NextResponse.rewrite(gateUrl);
  }

  // 3. Secondary Landlord Console Gate for /consola routes
  if (pathname.startsWith("/consola")) {
    if (pathname.startsWith(CONSOLE_LOGIN_PATH)) {
      return NextResponse.next();
    }

    const credentials = readConsoleCredentials();
    if (!credentials) {
      return new NextResponse(
        "Consola no configurada: faltan CONSOLA_USER, CONSOLA_PASSWORD o CONSOLA_SESSION_SECRET.",
        { status: 503, headers: { "Cache-Control": "no-store" } },
      );
    }

    const token = request.cookies.get(SESSION_COOKIE)?.value;
    if (await verifySessionToken(token, credentials.secret)) {
      const response = NextResponse.next();
      response.headers.set("Cache-Control", "no-store");
      return response;
    }

    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = CONSOLE_LOGIN_PATH;
    loginUrl.search = "";

    const response = NextResponse.rewrite(loginUrl);
    response.headers.set("Cache-Control", "no-store");
    if (token) response.cookies.delete({ name: SESSION_COOKIE, path: "/" });
    return response;
  }

  // 4. Serve requested page
  return NextResponse.next();
}
