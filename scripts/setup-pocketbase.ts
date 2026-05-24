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

async function updateCollectionCompat(pb: any, id: string, def: CollectionDef) {
  const modernPayload = {
    name: def.name,
    type: def.type,
    fields: def.fields,
    indexes: def.indexes ?? [],
  };

  try {
    return await pb.collections.update(id, modernPayload);
  } catch {
    const legacyPayload = {
      name: def.name,
      type: def.type,
      schema: toLegacySchema(def.fields),
      indexes: def.indexes ?? [],
    };
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
    indexes: [
      "CREATE UNIQUE INDEX IF NOT EXISTS idx_users_email ON users (email)",
    ],
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
  const byName = new Map(current.map((c) => [c.name, c]));

  console.log("PocketBase connection OK. Bootstrapping schema...");

  for (const def of defs) {
    try {
      const existing = byName.get(def.name);
      if (!existing) {
        await createCollectionCompat(pb, def);
        console.log(`Created collection: ${def.name}`);
        continue;
      }

      await updateCollectionCompat(pb, existing.id, def);
      console.log(`Updated collection: ${def.name}`);
    } catch (err: any) {
      console.error(`Failed collection: ${def.name}`);
      console.error(err?.response ?? err?.data ?? err);
      throw err;
    }
  }

  console.log("PocketBase schema bootstrap complete.");
}

run().catch((error) => {
  console.error("PocketBase setup check failed:", error);
  process.exit(1);
});
