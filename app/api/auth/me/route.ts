import { NextResponse } from "next/server";
import { LMS_SESSION_COOKIE, verifySession } from "@/lib/auth-session";
import { getPocketBaseAdmin } from "@/lib/pocketbase";

type FirmRow = {
  id: string;
  name: string;
};

export async function GET(request: Request) {
  const cookieHeader = request.headers.get("cookie") ?? "";
  const cookie = cookieHeader
    .split(";")
    .map((chunk) => chunk.trim())
    .find((chunk) => chunk.startsWith(`${LMS_SESSION_COOKIE}=`));

  if (!cookie) {
    return NextResponse.json({ user: null });
  }

  const token = cookie.split("=")[1];
  const session = verifySession(decodeURIComponent(token));

  if (!session) {
    return NextResponse.json({ user: null });
  }

  const pb = await getPocketBaseAdmin();
  let firm: FirmRow | null = null;
  try {
    firm = await pb.collection("firms").getOne<FirmRow>(session.firmId);
  } catch {
    firm = null;
  }

  return NextResponse.json({
    user: {
      id: session.userId,
      name: session.name,
      email: session.email,
      firmId: session.firmId,
      role: session.role,
      firmName: firm?.name ?? "",
    },
  });
}
