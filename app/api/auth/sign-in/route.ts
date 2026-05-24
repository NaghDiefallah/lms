import { NextResponse } from "next/server";
import { z } from "zod";
import {
  LMS_SESSION_COOKIE,
  sessionCookieOptions,
  signSession,
} from "@/lib/auth-session";
import { createPocketBaseClient, getPocketBaseAdmin } from "@/lib/pocketbase";

const bodySchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

type UserRow = {
  id: string;
  name: string;
  email: string;
  defaultFirmId?: string;
};

type MembershipRow = {
  firmId: string;
  role: string;
  status: "active" | "inactive";
};

export async function POST(request: Request) {
  const json = await request.json().catch(() => null);
  const parsed = bodySchema.safeParse(json);

  if (!parsed.success) {
    return NextResponse.json({ message: "Invalid credentials." }, { status: 400 });
  }

  const { email, password } = parsed.data;
  const normalizedEmail = email.toLowerCase();
  const userClient = createPocketBaseClient();

  try {
    await userClient.collection("users").authWithPassword(normalizedEmail, password);
  } catch {
    return NextResponse.json({ message: "Invalid email or password." }, { status: 401 });
  }

  const pb = await getPocketBaseAdmin();

  const user = await pb.collection("users").getFirstListItem<UserRow>(`email = \"${normalizedEmail}\"`);
  if (!user) {
    return NextResponse.json({ message: "Invalid email or password." }, { status: 401 });
  }

  const memberships = await pb.collection("memberships").getFullList<MembershipRow>({
    filter: `userId = \"${user.id}\" && status = \"active\"`,
    sort: "-created",
  });

  if (memberships.length === 0) {
    return NextResponse.json({ message: "No active firm membership found for this account." }, { status: 403 });
  }

  const activeMembership = memberships.find((m) => m.firmId === user.defaultFirmId) ?? memberships[0];

  const token = signSession({
    userId: user.id,
    email: user.email,
    name: user.name,
    firmId: activeMembership.firmId,
    role: activeMembership.role,
  });

  const response = NextResponse.json({ ok: true });
  response.cookies.set(LMS_SESSION_COOKIE, token, sessionCookieOptions());
  return response;
}
