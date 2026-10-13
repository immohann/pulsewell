import { NextResponse, type NextRequest } from "next/server";
import { COOKIE_STATE, clearTokenCookies, exchangeCode, redirectUri, setTokenCookies, whoopConfig } from "@/lib/whoop-server";

export async function GET(req: NextRequest) {
  const origin = req.nextUrl.origin;
  const back = (flag: string) => {
    const res = NextResponse.redirect(new URL(`/import?whoop=${flag}`, origin));
    res.cookies.set(COOKIE_STATE, "", { path: "/api/whoop", maxAge: 0 });
    return res;
  };

  const cfg = whoopConfig();
  if (!cfg) return back("not_configured");

  const p = req.nextUrl.searchParams;
  if (p.get("error")) return back("denied");

  const code = p.get("code");
  const state = p.get("state");
  const expected = req.cookies.get(COOKIE_STATE)?.value;
  if (!code || !state || !expected || state !== expected) return back("state_mismatch");

  try {
    const tokens = await exchangeCode(cfg, code, redirectUri(origin));
    const res = back("connected");
    clearTokenCookies(res);
    setTokenCookies(res, tokens);
    return res;
  } catch {
    return back("exchange_failed");
  }
}
