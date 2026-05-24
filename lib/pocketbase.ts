import PocketBase from "pocketbase";

const pocketBaseUrl = process.env.POCKETBASE_URL;
const superuserEmail = process.env.POCKETBASE_SUPERUSER_EMAIL;
const superuserPassword = process.env.POCKETBASE_SUPERUSER_PASSWORD;

let adminReady: Promise<PocketBase> | null = null;

async function authPocketBaseAdmin(pb: PocketBase) {
  try {
    await pb.admins.authWithPassword(superuserEmail!, superuserPassword!);
    return;
  } catch {
    const endpoint = new URL("/api/admins/auth-with-password", pocketBaseUrl).toString();
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        identity: superuserEmail,
        password: superuserPassword,
      }),
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`PocketBase admin auth failed (${response.status}): ${text}`);
    }

    const payload = (await response.json()) as { token?: string; admin?: Record<string, unknown> };
    if (!payload.token) {
      throw new Error("PocketBase admin auth response did not include a token.");
    }

    pb.authStore.save(payload.token, payload.admin ?? null);
  }
}

function requirePocketBaseConfig() {
  if (!pocketBaseUrl) {
    throw new Error("PocketBase is not configured. Set POCKETBASE_URL in .env");
  }

  if (!superuserEmail || !superuserPassword) {
    throw new Error(
      "PocketBase superuser credentials are not configured. Set POCKETBASE_SUPERUSER_EMAIL and POCKETBASE_SUPERUSER_PASSWORD in .env",
    );
  }
}

async function connectPocketBaseAdmin() {
  requirePocketBaseConfig();
  const pb = new PocketBase(pocketBaseUrl);
  pb.autoCancellation(false);
  await authPocketBaseAdmin(pb);
  return pb;
}

export async function getPocketBaseAdmin() {
  if (!adminReady) {
    adminReady = connectPocketBaseAdmin().catch((err) => {
      adminReady = null;
      throw err;
    });
  }

  const pb = await adminReady;
  if (!pb.authStore.isValid) {
    await authPocketBaseAdmin(pb);
  }
  return pb;
}

export function createPocketBaseClient() {
  if (!pocketBaseUrl) {
    throw new Error("PocketBase is not configured. Set POCKETBASE_URL in .env");
  }
  const pb = new PocketBase(pocketBaseUrl);
  pb.autoCancellation(false);
  return pb;
}

export function toRecordDoc<T extends { id: string; createdAt?: string; updatedAt?: string }>(row: T) {
  return {
    ...row,
    $id: row.id,
    $createdAt: row.createdAt ?? new Date().toISOString(),
    $updatedAt: row.updatedAt ?? row.createdAt ?? new Date().toISOString(),
  };
}

export function toRecordList<T extends { id: string; createdAt?: string; updatedAt?: string }>(rows: T[]) {
  return {
    total: rows.length,
    documents: rows.map((row) => toRecordDoc(row)),
  };
}

export function nowIso() {
  return new Date().toISOString();
}

export function newId(prefix: string) {
  return `${prefix}_${crypto.randomUUID().replace(/-/g, "").slice(0, 16)}`;
}

export function escapeFilterValue(value: string) {
  return value.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}
