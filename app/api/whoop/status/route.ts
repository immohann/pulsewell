import { NextResponse, type NextRequest } from "next/server";
import { COOKIE_ACCESS, COOKIE_REFRESH, mockMode, whoopConfig } from "@/lib/whoop-server";

export function GET(req: NextRequest) {
  const mock = mockMode();
  const configured = mock || !!whoopConfig();
  const connected = mock || !!(req.cookies.get(COOKIE_ACCESS)?.value || req.cookies.get(COOKIE_REFRESH)?.value);
  return NextResponse.json({ configured, connected, redirectUri: process.env.WHOOP_REDIRECT_URI || `${req.nextUrl.origin}/api/whoop/callback` }, { headers: { "Cache-Control": "no-store" } });
}
