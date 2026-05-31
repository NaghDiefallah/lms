import { getPocketBaseAdmin } from "../lib/pocketbase";

type FieldDef = {
  name: string;
  type: string;
  required?: boolean;
  unique?: boolean;
  options?: Record<string, unknown>;
};

type CollectionDef = {
  name: string;
  type: "auth" | "base";
  fields: FieldDef[];
  indexes?: string[];
};

function toLegacySchema(fields: FieldDef[]) {
  return fields.map((field) => ({
    ...field,
    system: false,
  }));
}

async function createCollectionCompat(pb: any, def: CollectionDef) {
  const modernPayload = {
    name: def.name,
    type: def.type,
    fields: def.fields,
    indexes: def.indexes ?? [],
  };

  try {
    return await pb.collections.create(modernPayload);
  } catch {
    const legacyPayload = {
      name: def.name,
      type: def.type,
      schema: toLegacySchema(def.fields),
      indexes: def.indexes ?? [],
    };
    return await pb.collections.create(legacyPayload);
  }
}

/**
 * Fetch the current collection schema and return only the fields that need to
 * be added (i.e. names not yet present in the live schema).  This is critical
 * for built-in auth collections (e.g. "users") where PocketBase owns certain
 * system fields and will reject a full-replace payload.
 */
async function getMissingFields(pb: any, collectionId: string, wantedFields: FieldDef[]): Promise<FieldDef[]> {
  try {
    const existing = await pb.collections.getOne(collectionId);
    // PocketBase v0.22+ uses "fields"; older uses "schema"
    const existingNames = new Set<string>(
      ((existing.fields ?? existing.schema) as Array<{ name: string }> ?? []).map((f) => f.name)
    );
    return wantedFields.filter((f) => !existingNames.has(f.name));
  } catch {
    // If we can't fetch, fall back to sending all fields (best-effort)
    return wantedFields;
  }
}

async function updateCollectionCompat(pb: any, id: string, def: CollectionDef) {
  // Only send fields that don't already exist to avoid clobbering system fields
  // on built-in collections (auth collections in particular).
  const newFields = await getMissingFields(pb, id, def.fields);

  if (newFields.length === 0 && (def.indexes ?? []).length === 0) {
    // Nothing to change — skip the network round-trip
    return null;
  }

  // Fetch the current full schema so we can merge, not replace
  let currentFields: any[] = [];
  try {
    const existing = await pb.collections.getOne(id);
    currentFields = existing.fields ?? existing.schema ?? [];
  } catch {}

  const mergedFields = [...currentFields, ...newFields];

  const modernPayload: Record<string, unknown> = {
    fields: mergedFields,
  };
  if ((def.indexes ?? []).length > 0) {
    modernPayload.indexes = def.indexes;
  }

  try {
    return await pb.collections.update(id, modernPayload);
  } catch {
    // Legacy PocketBase: use "schema" key with system:false markers
    const legacyPayload: Record<string, unknown> = {
      schema: [...toLegacySchema(currentFields), ...toLegacySchema(newFields)],
    };
    if ((def.indexes ?? []).length > 0) {
      legacyPayload.indexes = def.indexes;
    }
    return await pb.collections.update(id, legacyPayload);
  }
}

const defs: CollectionDef[] = [
  {
    name: "users",
    type: "auth",
    fields: [
      { name: "name", type: "text", required: true },
      { name: "defaultFirmId", type: "text" },
    ],
    // PocketBase manages the email uniqueness index internally for auth collections
  },
  {
    name: "firms",
    type: "base",
    fields: [
      { name: "name", type: "text", required: true },
      { name: "ownerUserId", type: "text" },
      { name: "createdAt", type: "date" },
      { name: "updatedAt", type: "date" },
    ],
  },
  {
    name: "memberships",
    type: "base",
    fields: [
      { name: "membershipId", type: "text", required: true, unique: true },
      { name: "userId", type: "text", required: true },
      { name: "firmId", type: "text", required: true },
      { name: "role", type: "text", required: true },
      { name: "status", type: "text", required: true },
      { name: "invitedBy", type: "text" },
      { name: "createdAt", type: "date" },
      { name: "updatedAt", type: "date" },
    ],
  },
  {
    name: "invites",
    type: "base",
    fields: [
      { name: "code", type: "text", required: true, unique: true },
      { name: "firmId", type: "text", required: true },
      { name: "email", type: "text", required: true },
      { name: "role", type: "text", required: true },
      { name: "status", type: "text", required: true },
      { name: "invitedBy", type: "text" },
      { name: "acceptedAt", type: "date" },
      { name: "createdAt", type: "date" },
      { name: "updatedAt", type: "date" },
    ],
  },
  {
    name: "clients",
    type: "base",
    fields: [
      { name: "clientId", type: "text", required: true, unique: true },
      { name: "firmId", type: "text", required: true },
      { name: "createdBy", type: "text" },
      { name: "name", type: "text", required: true },
      { name: "email", type: "text" },
      { name: "phone", type: "text" },
      { name: "passportNumber", type: "text" },
      { name: "passportFileId", type: "text" },
      { name: "contractFileId", type: "text" },
      { name: "status", type: "text" },
      { name: "retainer", type: "number" },
      { name: "activeCases", type: "number" },
      { name: "clientSince", type: "date" },
      { name: "createdAt", type: "date" },
      { name: "updatedAt", type: "date" },
    ],
  },
  {
    name: "client_history",
    type: "base",
    fields: [
      { name: "historyId", type: "text", required: true, unique: true },
      { name: "firmId", type: "text", required: true },
      { name: "clientId", type: "text", required: true },
      { name: "field", type: "text", required: true },
      { name: "oldValue", type: "text" },
      { name: "newValue", type: "text" },
      { name: "createdAt", type: "date" },
      { name: "updatedAt", type: "date" },
    ],
  },
  {
    name: "cases",
    type: "base",
    fields: [
      { name: "caseId", type: "text", required: true, unique: true },
      { name: "firmId", type: "text", required: true },
      { name: "createdBy", type: "text" },
      { name: "clientId", type: "text" },
      { name: "clientName", type: "text" },
      { name: "clientIds", type: "text" },
      { name: "clientNames", type: "text" },
      { name: "description", type: "text" },
      { name: "status", type: "text" },
      { name: "assignedAttorneys", type: "text" },
      { name: "currentStatus", type: "text" },
      { name: "startDate", type: "date" },
      { name: "endDate", type: "date" },
      { name: "createdAt", type: "date" },
      { name: "updatedAt", type: "date" },
    ],
  },
  {
    name: "ledger_transactions",
    type: "base",
    fields: [
      { name: "invoiceId", type: "text", required: true, unique: true },
      { name: "firmId", type: "text", required: true },
      { name: "createdBy", type: "text" },
      { name: "clientId", type: "text" },
      { name: "clientName", type: "text" },
      { name: "date", type: "date" },
      { name: "amount", type: "number" },
      { name: "attorney", type: "text" },
      { name: "method", type: "text" },
      { name: "status", type: "text" },
      { name: "type", type: "text" },
      { name: "createdAt", type: "date" },
      { name: "updatedAt", type: "date" },
    ],
  },
  {
    name: "campaigns",
    type: "base",
    fields: [
      { name: "campaignId", type: "text", required: true, unique: true },
      { name: "firmId", type: "text", required: true },
      { name: "createdBy", type: "text" },
      { name: "platform", type: "text" },
      { name: "date", type: "date" },
      { name: "time", type: "text" },
      { name: "manager", type: "text" },
      { name: "budget", type: "number" },
      { name: "actual", type: "number" },
      { name: "results", type: "number" },
      { name: "roi", type: "number" },
      { name: "status", type: "text" },
      { name: "createdAt", type: "date" },
      { name: "updatedAt", type: "date" },
    ],
  },
  {
    name: "personnel",
    type: "base",
    fields: [
      { name: "personnelId", type: "text", required: true, unique: true },
      { name: "firmId", type: "text", required: true },
      { name: "userId", type: "text" },
      { name: "name", type: "text", required: true },
      { name: "email", type: "text", required: true },
      { name: "contact", type: "text" },
      { name: "licensed", type: "bool" },
      { name: "startDate", type: "date" },
      { name: "role", type: "text" },
      { name: "passportNumber", type: "text" },
      { name: "cases", type: "number" },
      { name: "revenue", type: "number" },
      { name: "recentWins", type: "number" },
      { name: "createdAt", type: "date" },
      { name: "updatedAt", type: "date" },
    ],
  },
];

async function run() {
  const pb = await getPocketBaseAdmin();
  const current = await pb.collections.getFullList();
  const byName = new Map(current.map((c: any) => [c.name, c]));

  console.log(`\nPocketBase connection OK — ${current.length} existing collection(s) found.`);
  console.log("Bootstrapping schema...\n");

  let created = 0;
  let updated = 0;
  let skipped = 0;
  let failed = 0;

  for (const def of defs) {
    try {
      const existing = byName.get(def.name);
      if (!existing) {
        await createCollectionCompat(pb, def);
        console.log(`  [+] Created  : ${def.name}`);
        created++;
        continue;
      }

      const result = await updateCollectionCompat(pb, existing.id, def);
      if (result === null) {
        console.log(`  [=] No-op    : ${def.name} (already up to date)`);
        skipped++;
      } else {
        console.log(`  [~] Updated  : ${def.name}`);
        updated++;
      }
    } catch (err: any) {
      const detail = err?.response ?? err?.data ?? err;
      console.error(`  [!] Failed   : ${def.name}`);
      console.error("      Reason  :", detail?.message ?? detail);
      if (detail?.data && typeof detail.data === "object") {
        for (const [field, msg] of Object.entries(detail.data)) {
          console.error(`      Field "${field}":`, msg);
        }
      }
      failed++;
      // Don't throw — attempt remaining collections and report at the end.
    }
  }

  console.log(
    `\nDone. created=${created} updated=${updated} skipped=${skipped} failed=${failed}`
  );

  if (failed > 0) {
    process.exit(1);
  }
}

run().catch((error) => {
  const msg = error?.message ?? String(error);
  console.error("\nPocketBase setup failed:", msg);
  if (msg.includes("ECONNREFUSED") || msg.includes("Failed to connect")) {
    console.error(
      "  Hint: make sure PocketBase is running and POCKETBASE_URL is correct."
    );
  }
  process.exit(1);
});
