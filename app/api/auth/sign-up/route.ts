import { NextResponse } from "next/server";
import { z } from "zod";
import {
  LMS_SESSION_COOKIE,
  sessionCookieOptions,
  signSession,
} from "@/lib/auth-session";
import { newId, nowIso, getPocketBaseAdmin, escapeFilterValue } from "@/lib/pocketbase";

const bodySchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(8),
  firmName: z.string().min(2).optional(),
  inviteCode: z.string().min(8).optional(),
});

type UserRow = {
  id: string;
  name: string;
  email: string;
  defaultFirmId?: string;
};

type InviteRow = {
  id: string;
  code: string;
  firmId: string;
  role: string;
  email: string;
  status: "pending" | "accepted";
};

type FirmRow = {
  id: string;
  name: string;
};

export async function POST(request: Request) {
  const json = await request.json().catch(() => null);
  const parsed = bodySchema.safeParse(json);

  if (!parsed.success) {
    return NextResponse.json({ message: "Invalid sign-up payload." }, { status: 400 });
  }

  const { name, email, password, firmName, inviteCode } = parsed.data;
  const normalizedEmail = email.toLowerCase();
  const pb = await getPocketBaseAdmin();

  const existing = await pb.collection("users").getFullList<UserRow>({
    filter: `email = \"${escapeFilterValue(normalizedEmail)}\"`,
    perPage: 1,
  });

  if (existing.length > 0) {
    return NextResponse.json({ message: "An account with this email already exists." }, { status: 409 });
  }

  let firmId = "";
  let role = "CEO";
  let resolvedFirmName = firmName?.trim() ?? "";
  const timestamp = nowIso();

  if (inviteCode) {
    const inviteRows = await pb.collection("invites").getFullList<InviteRow>({
      filter: `code = \"${escapeFilterValue(inviteCode)}\" && status = \"pending\"`,
      perPage: 1,
    });

    const invite = inviteRows[0];
    if (!invite) {
      return NextResponse.json({ message: "Invite code is invalid or expired." }, { status: 400 });
    }
    if (invite.email.toLowerCase() !== normalizedEmail) {
      return NextResponse.json({ message: "Invite code does not match this email." }, { status: 400 });
    }

    firmId = invite.firmId;
    role = invite.role;

    const firm = await pb.collection("firms").getOne<FirmRow>(firmId);
    resolvedFirmName = firm?.name ?? "";

    await pb.collection("invites").update(invite.id, {
      status: "accepted",
      acceptedAt: timestamp,
      updatedAt: timestamp,
    });
  } else {
    if (!firmName) {
      return NextResponse.json({ message: "Firm name is required when creating a new workspace." }, { status: 400 });
    }

    const firm = await pb.collection("firms").create<FirmRow>({
      name: firmName,
      ownerUserId: "",
      createdAt: timestamp,
      updatedAt: timestamp,
    });
    firmId = firm.id;
    resolvedFirmName = firm.name;
  }

  const user = await pb.collection("users").create<UserRow>({
    email: normalizedEmail,
    password,
    passwordConfirm: password,
    name,
    defaultFirmId: firmId,
    createdAt: timestamp,
    updatedAt: timestamp,
  });
  const userId = user.id;

  await pb.collection("memberships").create({
    membershipId: newId("mbr"),
    userId,
    firmId,
    role,
    status: "active",
    createdAt: timestamp,
    updatedAt: timestamp,
  });

  await pb.collection("personnel").create({
    personnelId: newId("emp"),
    firmId,
    userId,
    name,
    email: normalizedEmail,
    contact: "",
    licensed: true,
    startDate: timestamp,
    role,
    passportNumber: "",
    cases: 0,
    revenue: 0,
    recentWins: 0,
    createdAt: timestamp,
    updatedAt: timestamp,
  });

  if (!inviteCode) {
    await pb.collection("firms").update(firmId, {
      ownerUserId: userId,
      updatedAt: timestamp,
    });
  }

  const token = signSession({
    userId,
    email: email.toLowerCase(),
    name,
    firmId,
    role,
  });

  const response = NextResponse.json({
    ok: true,
    user: {
      id: userId,
      name,
      email: normalizedEmail,
      firmId,
      role,
      firmName: resolvedFirmName,
    },
  });
  response.cookies.set(LMS_SESSION_COOKIE, token, sessionCookieOptions());
  return response;
}
