import "server-only";
import type { NextResponse } from "next/server";
import type { RawBody, RawCycle, RawRecovery, RawSleep, RawWorkout, WhoopRaw } from "./whoop-map";

export const AUTH_URL = "https://api.prod.whoop.com/oauth/oauth2/auth";
export const TOKEN_URL = "https://api.prod.whoop.com/oauth/oauth2/token";
export const API = "https://api.prod.whoop.com/developer/v2";
export const SCOPES = "offline read:profile read:body_measurement read:cycles read:recovery read:sleep read:workout";

export const COOKIE_ACCESS = "pw_wh_at";
export const COOKIE_REFRESH = "pw_wh_rt";
export const COOKIE_STATE = "pw_wh_state";

export interface WhoopConfig {
  clientId: string;
  clientSecret: string;
}

export const whoopConfig = (): WhoopConfig | null => {
  const clientId = process.env.WHOOP_CLIENT_ID;
  const clientSecret = process.env.WHOOP_CLIENT_SECRET;
  return clientId && clientSecret ? { clientId, clientSecret } : null;
};

/** Dev-only switch that serves a canned account so the UI can be exercised without credentials. */
export const mockMode = () => process.env.NODE_ENV !== "production" && process.env.WHOOP_MOCK === "1";

export const redirectUri = (origin: string) => process.env.WHOOP_REDIRECT_URI || `${origin}/api/whoop/callback`;

export interface TokenSet {
  access_token: string;
  refresh_token?: string;
  expires_in: number;
}

export class WhoopHttpError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

async function tokenRequest(cfg: WhoopConfig, params: Record<string, string>): Promise<TokenSet> {
  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ ...params, client_id: cfg.clientId, client_secret: cfg.clientSecret }),
    cache: "no-store",
  });
  if (!res.ok) throw new WhoopHttpError(res.status, `token endpoint returned ${res.status}`);
  return (await res.json()) as TokenSet;
}

export const exchangeCode = (cfg: WhoopConfig, code: string, redirect: string) =>
  tokenRequest(cfg, { grant_type: "authorization_code", code, redirect_uri: redirect });

export const refreshTokens = (cfg: WhoopConfig, refreshToken: string) =>
  tokenRequest(cfg, { grant_type: "refresh_token", refresh_token: refreshToken, scope: "offline" });

const cookieBase = {
  httpOnly: true,
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
  path: "/api/whoop",
};

export function setTokenCookies(res: NextResponse, t: TokenSet) {
  res.cookies.set(COOKIE_ACCESS, t.access_token, { ...cookieBase, maxAge: Math.max(60, t.expires_in - 60) });
  if (t.refresh_token) res.cookies.set(COOKIE_REFRESH, t.refresh_token, { ...cookieBase, maxAge: 60 * 60 * 24 * 30 });
}

export function clearTokenCookies(res: NextResponse) {
  for (const n of [COOKIE_ACCESS, COOKIE_REFRESH, COOKIE_STATE]) res.cookies.set(n, "", { ...cookieBase, maxAge: 0 });
}

export const stateCookie = (res: NextResponse, value: string) => res.cookies.set(COOKIE_STATE, value, { ...cookieBase, maxAge: 600 });

async function get<T>(token: string, path: string, params: Record<string, string> = {}): Promise<T> {
  const url = new URL(API + path);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` }, cache: "no-store" });
  if (!res.ok) throw new WhoopHttpError(res.status, `${path} returned ${res.status}`);
  return (await res.json()) as T;
}

async function collect<T>(token: string, path: string, start: string, end: string): Promise<T[]> {
  const out: T[] = [];
  let next: string | undefined;
  for (let page = 0; page < 20; page++) {
    const params: Record<string, string> = { start, end, limit: "25" };
    if (next) params.nextToken = next;
    const body = await get<{ records?: T[]; next_token?: string | null }>(token, path, params);
    out.push(...(body.records ?? []));
    if (!body.next_token) break;
    next = body.next_token;
  }
  return out;
}

/** Fetch everything Pulsewell needs for a window. Profile and body are best-effort. */
export async function fetchWhoop(token: string, start: string, end: string): Promise<WhoopRaw> {
  const [cycles, recoveries, sleeps, workouts, body, profile] = await Promise.all([
    collect<RawCycle>(token, "/cycle", start, end),
    collect<RawRecovery>(token, "/recovery", start, end),
    collect<RawSleep>(token, "/activity/sleep", start, end),
    collect<RawWorkout>(token, "/activity/workout", start, end),
    get<RawBody>(token, "/user/measurement/body").catch(() => null),
    get<{ first_name?: string }>(token, "/user/profile/basic").catch(() => null),
  ]);
  return { cycles, recoveries, sleeps, workouts, body, profile };
}

export async function revoke(token: string) {
  try {
    await fetch(`${API}/user/access`, { method: "DELETE", headers: { Authorization: `Bearer ${token}` }, cache: "no-store" });
  } catch {
    /* best effort */
  }
}
