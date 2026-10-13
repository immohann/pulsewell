import { NextResponse, type NextRequest } from "next/server";
import { AUTH_URL, SCOPES, redirectUri, stateCookie, whoopConfig } from "@/lib/whoop-server";

export function GET(req: NextRequest) {
  const origin = req.nextUrl.origin;
  const cfg = whoopConfig();
  if (!cfg) return NextResponse.redirect(new URL("/settings?whoop=not_configured", origin));

  const state = crypto.randomUUID().replace(/-/g, "").slice(0, 24);
  const url = new URL(AUTH_URL);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("client_id", cfg.clientId);
  url.searchParams.set("redirect_uri", redirectUri(origin));
  url.searchParams.set("scope", SCOPES);
  url.searchParams.set("state", state);

  const res = NextResponse.redirect(url);
  stateCookie(res, state);
  return res;
}
