import { NextResponse } from "next/server";
import { LMS_SESSION_COOKIE, sessionCookieOptions } from "@/lib/auth-session";

export async function POST() {
  const response = NextResponse.json({ ok: true });
  response.cookies.set(LMS_SESSION_COOKIE, "", {
    ...sessionCookieOptions(),
    maxAge: 0,
  });
  return response;
}
