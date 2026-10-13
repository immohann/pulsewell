import { NextResponse, type NextRequest } from "next/server";
import { COOKIE_ACCESS, clearTokenCookies, revoke } from "@/lib/whoop-server";

export async function POST(req: NextRequest) {
  const token = req.cookies.get(COOKIE_ACCESS)?.value;
  if (token) await revoke(token);
  const res = NextResponse.json({ ok: true });
  clearTokenCookies(res);
  return res;
}
