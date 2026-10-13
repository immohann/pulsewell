import { NextResponse, type NextRequest } from "next/server";
import { normalizeWhoop } from "@/lib/whoop-map";
import { mockRaw } from "@/lib/whoop-mock";
import { COOKIE_ACCESS, COOKIE_REFRESH, WhoopHttpError, clearTokenCookies, fetchWhoop, mockMode, refreshTokens, setTokenCookies, whoopConfig, type TokenSet } from "@/lib/whoop-server";

const json = (body: unknown, status = 200) => NextResponse.json(body, { status, headers: { "Cache-Control": "no-store" } });

export async function GET(req: NextRequest) {
  const days = Math.min(120, Math.max(1, parseInt(req.nextUrl.searchParams.get("days") ?? "30", 10) || 30));
  if (mockMode()) return json(normalizeWhoop(mockRaw(days)));

  const cfg = whoopConfig();
  if (!cfg) return json({ error: "not_configured" }, 503);

  const refresh = req.cookies.get(COOKIE_REFRESH)?.value;
  let access = req.cookies.get(COOKIE_ACCESS)?.value;
  let fresh: TokenSet | null = null;

  const renew = async () => {
    if (!refresh) return null;
    try {
      fresh = await refreshTokens(cfg, refresh);
      return fresh.access_token;
    } catch {
      return null;
    }
  };

  if (!access) access = (await renew()) ?? undefined;
  if (!access) {
    const res = json({ error: "not_connected" }, 401);
    clearTokenCookies(res);
    return res;
  }

  const end = new Date();
  const start = new Date(end.getTime() - days * 86400000);

  try {
    let raw;
    try {
      raw = await fetchWhoop(access, start.toISOString(), end.toISOString());
    } catch (e) {
      if (e instanceof WhoopHttpError && e.status === 401 && !fresh) {
        const again = await renew();
        if (!again) throw e;
        raw = await fetchWhoop(again, start.toISOString(), end.toISOString());
      } else {
        throw e;
      }
    }
    const res = json(normalizeWhoop(raw));
    if (fresh) setTokenCookies(res, fresh);
    return res;
  } catch (e) {
    if (e instanceof WhoopHttpError && (e.status === 401 || e.status === 403)) {
      const res = json({ error: "reconnect" }, 401);
      clearTokenCookies(res);
      return res;
    }
    if (e instanceof WhoopHttpError && e.status === 429) return json({ error: "rate_limited" }, 429);
    return json({ error: "upstream_error" }, 502);
  }
}
