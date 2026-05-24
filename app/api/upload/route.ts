import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { uploadToB2 } from "@/lib/b2";

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    if (!file) return NextResponse.json({ error: "No file provided" }, { status: 400 });

    const ext = file.name.split(".").pop() ?? "bin";
    const key = `${randomUUID()}.${ext}`;
    const buffer = Buffer.from(await file.arrayBuffer());

    await uploadToB2(key, buffer, file.type || "application/octet-stream");

    return NextResponse.json({ fileId: key });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message ?? "Upload failed" }, { status: 500 });
  }
}
