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
     */
    "/((?!_next/static|_next/image|brand|tenants|photos|favicon.ico|file.svg|globe.svg|window.svg).*)",
  ],
};

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  // 1. Bypass static assets, private gate form, and site auth API
  if (
    pathname.startsWith(PRIVATE_GATE_PATH) ||
    pathname.startsWith("/api/site-auth")
  ) {
    return NextResponse.next();
  }

  // 2. Global Site Access Gate check
  const siteAccessCookie = request.cookies.get(SITE_ACCESS_COOKIE)?.value;
  const hasSiteAccess = siteAccessCookie === "granted";

  // If site access cookie is missing, redirect to private access gate
  if (!hasSiteAccess) {
    const gateUrl = request.nextUrl.clone();
    gateUrl.pathname = PRIVATE_GATE_PATH;
    gateUrl.search = "";
    return NextResponse.redirect(gateUrl);
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

    const redirectResponse = NextResponse.redirect(loginUrl);
    redirectResponse.headers.set("Cache-Control", "no-store");
    if (token) redirectResponse.cookies.delete({ name: SESSION_COOKIE, path: "/consola" });
    return redirectResponse;
  }

  // 4. Serve requested page
  return NextResponse.next();
}
