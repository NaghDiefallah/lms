import type { FetchCreateContextFnOptions } from "@trpc/server/adapters/fetch";
import { LMS_SESSION_COOKIE, verifySession } from "@/lib/auth-session";
import { getPocketBaseAdmin } from "@/lib/pocketbase";

export type SessionUser = {
  userId: string;
  email: string;
  name: string;
  firmId: string;
  role: string;
};

export async function createContext(opts: FetchCreateContextFnOptions) {
  const db = await getPocketBaseAdmin();
  const cookieHeader = opts.req.headers.get("cookie") ?? "";
  const sessionCookie = cookieHeader
    .split(";")
    .map((chunk) => chunk.trim())
    .find((chunk) => chunk.startsWith(`${LMS_SESSION_COOKIE}=`));

  const token = sessionCookie?.split("=")[1];
  const user = token ? verifySession(decodeURIComponent(token)) : null;

  return {
    db,
    user,
    req: opts.req,
  };
}

export type Context = Awaited<ReturnType<typeof createContext>>;
