import PocketBase from "pocketbase";
import { existsSync } from "node:fs";

function isRunningInContainer() {
  return (
    process.env.DOCKER_CONTAINER === "true"
    || process.env.KUBERNETES_SERVICE_HOST !== undefined
    || existsSync("/.dockerenv")
  );
}

function normalizePocketBaseUrl(rawUrl: string | undefined) {
  if (!rawUrl) {
    return undefined;
  }

  const trimmed = rawUrl.trim();
  if (!trimmed) {
    return undefined;
  }

  const hasProtocol = /^[a-zA-Z][a-zA-Z\d+\-.]*:\/\//.test(trimmed);
  const normalized = hasProtocol ? trimmed : `http://${trimmed}`;

  try {
    const parsed = new URL(normalized);
    return parsed.toString();
  } catch {
    return normalized;
  }
}

const pocketBaseUrl = normalizePocketBaseUrl(process.env.POCKETBASE_URL);
const superuserEmail = process.env.POCKETBASE_SUPERUSER_EMAIL;
const superuserPassword = process.env.POCKETBASE_SUPERUSER_PASSWORD;
const POCKETBASE_ADMIN_REQUEST_TIMEOUT_MS = 15000;

let adminReady: Promise<PocketBase> | null = null;

async function authPocketBaseAdmin(pb: PocketBase) {
  try {
    await pb.admins.authWithPassword(superuserEmail!, superuserPassword!);
    return;
  } catch {}

  try {
    const response = await pb.collection("_superusers").authWithPassword(superuserEmail!, superuserPassword!);
    if (response?.token) {
      pb.authStore.save(response.token, response.record ?? null);
      return;
    }
  } catch {}

  const endpoints = [
    "/api/collections/_superusers/auth-with-password",
    "/api/admins/auth-with-password",
  ];

  let lastError = "";
  for (const path of endpoints) {
    const endpoint = new URL(path, pocketBaseUrl).toString();

    try {
      const timeoutSignal = AbortSignal.timeout(POCKETBASE_ADMIN_REQUEST_TIMEOUT_MS);
      const response = await fetch(endpoint, {
        method: "POST",
        signal: timeoutSignal,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          identity: superuserEmail,
          password: superuserPassword,
        }),
      });

      if (response.ok) {
        const payload = (await response.json()) as {
          token?: string;
          admin?: Record<string, unknown>;
          record?: Record<string, unknown>;
        };

        if (!payload.token) {
          throw new Error("PocketBase admin auth response did not include a token.");
        }

        pb.authStore.save(payload.token, payload.admin ?? payload.record ?? null);
        return;
      }

      const text = await response.text();
      lastError = `PocketBase admin auth failed (${response.status}) via ${path}: ${text}`;

      if (response.status === 400 && /use https/i.test(text)) {
        throw new Error(
          "PocketBase requires HTTPS for superuser/admin auth at the configured URL. "
          + "Set POCKETBASE_URL to your HTTPS PocketBase endpoint (reverse-proxied with TLS), "
          + "or disable the HTTPS-only requirement in PocketBase settings for internal Docker traffic.",
        );
      }
    } catch (error) {
      if (error instanceof Error && /requires HTTPS|HTTPS-only/i.test(error.message)) {
        throw error;
      }

      if (error instanceof Error) {
        lastError = `${path}: ${error.message}`;
      } else {
        lastError = `${path}: unknown error`;
      }
    }
  }

  throw new Error(lastError || "PocketBase admin auth failed on all known endpoints.");
}

function requirePocketBaseConfig() {
  if (!pocketBaseUrl) {
    throw new Error("PocketBase is not configured. Set POCKETBASE_URL in .env");
  }

  let parsedUrl: URL;
  try {
    parsedUrl = new URL(pocketBaseUrl);
  } catch {
    throw new Error("Invalid POCKETBASE_URL. Provide a full URL such as http://host.docker.internal:8090");
  }

  const isContainerLocalHost = ["localhost", "127.0.0.1", "0.0.0.0"].includes(parsedUrl.hostname);
  if (isRunningInContainer() && isContainerLocalHost) {
    throw new Error(
      "POCKETBASE_URL points to a container-local host. When LMS runs in Docker, use a reachable host like http://host.docker.internal:8090 or an internal service hostname.",
    );
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
