import { compare, hash } from "bcryptjs";
import jwt from "jsonwebtoken";

export const LMS_SESSION_COOKIE = "lms_session";
const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 7;

type SessionPayload = {
  userId: string;
  email: string;
  name: string;
  firmId: string;
  role: string;
};

function getSecret() {
  return process.env.LMS_AUTH_SECRET ?? "dev-lms-secret-change-me";
}

export function signSession(payload: SessionPayload) {
  return jwt.sign(payload, getSecret(), {
    expiresIn: SESSION_MAX_AGE_SECONDS,
  });
}

export function verifySession(token: string): SessionPayload | null {
  try {
    return jwt.verify(token, getSecret()) as SessionPayload;
  } catch {
    return null;
  }
}

export function sessionCookieOptions() {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_MAX_AGE_SECONDS,
  };
}

export async function hashPassword(password: string) {
  return hash(password, 10);
}

export async function verifyPassword(password: string, passwordHash: string) {
  return compare(password, passwordHash);
}
