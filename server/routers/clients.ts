import { router, protectedProcedure } from "../trpc";
import { ClientListInputSchema, ClientCreateSchema, ClientUpdateSchema } from "@/lib/schemas/clients";
import { escapeFilterValue, newId, nowIso, toRecordDoc, toRecordList } from "@/lib/pocketbase";
import { z } from "zod";

type ClientRow = {
  id: string;
  clientId: string;
  firmId: string;
  createdAt: string;
  updatedAt: string;
  name: string;
  email: string;
  phone: string;
  passportNumber?: string;
  passportFileId?: string;
  contractFileId?: string;
  status: string;
  clientSince?: string;
  retainer?: number;
  activeCases?: number;
};

type ClientHistoryRow = {
  id: string;
  historyId: string;
  firmId: string;
  clientId: string;
  field: string;
  oldValue?: string | null;
  newValue?: string | null;
  createdAt: string;
  updatedAt: string;
};

function toDateTime(d: string) {
  if (!d || d.includes("T")) return d;
  return `${d}T00:00:00.000+00:00`;
}

function asAppClient(row: ClientRow) {
  return {
    ...row,
    id: row.clientId,
  };
}

function asAppHistory(row: ClientHistoryRow) {
  return {
    ...row,
    id: row.historyId,
  };
}

async function nextClientId(ctx: { db: any; user: { firmId: string } }) {
  const rows = await ctx.db.collection("clients").getFullList<ClientRow>({
    filter: `firmId = "${escapeFilterValue(ctx.user.firmId)}"`,
    fields: "id",
  });
  return `CLT-${String(rows.length + 1).padStart(4, "0")}`;
}

const TRACKED_FIELDS = ["name", "email", "phone", "passportNumber", "passportFileId", "contractFileId"] as const;

export const clientsRouter = router({
  list: protectedProcedure.input(ClientListInputSchema).query(async ({ ctx, input }) => {
    let cursorCreatedAt: string | undefined;

    if (input.cursor) {
      const cursorRows = await ctx.db.collection("clients").getFullList<ClientRow>({
        filter: `firmId = "${escapeFilterValue(ctx.user.firmId)}" && clientId = "${escapeFilterValue(input.cursor)}"`,
        perPage: 1,
      });
      cursorCreatedAt = cursorRows[0]?.createdAt;
    }

    const filters = [`firmId = "${escapeFilterValue(ctx.user.firmId)}"`];

    if (input.search) {
      const q = escapeFilterValue(input.search.toLowerCase());
      filters.push(`(name ~ "${q}" || email ~ "${q}" || clientId ~ "${q}")`);
    }

    if (input.status != null) {
      filters.push(`status = "${escapeFilterValue(String(input.status))}"`);
    }

    if (cursorCreatedAt) {
      filters.push(`createdAt < "${escapeFilterValue(cursorCreatedAt)}"`);
    }

    const result = await ctx.db.collection("clients").getList<ClientRow>(1, input.limit, {
      filter: filters.join(" && "),
      sort: "-createdAt",
    });

    return toRecordList(result.items.map(asAppClient));
  }),

  byCid: protectedProcedure
    .input(z.object({ cid: z.string() }))
    .query(async ({ ctx, input }) => {
      if (!input.cid || input.cid.length < 3) return null;

      const rows = await ctx.db.collection("clients").getFullList<ClientRow>({
        filter: `firmId = "${escapeFilterValue(ctx.user.firmId)}" && clientId = "${escapeFilterValue(input.cid)}"`,
        perPage: 1,
      });

      return rows[0] ? toRecordDoc(asAppClient(rows[0])) : null;
    }),

  byId: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const rows = await ctx.db.collection("clients").getFullList<ClientRow>({
        filter: `firmId = "${escapeFilterValue(ctx.user.firmId)}" && clientId = "${escapeFilterValue(input.id)}"`,
        perPage: 1,
      });

      const row = rows[0];
      if (!row) {
        throw new Error("Client not found.");
      }

      return toRecordDoc(asAppClient(row));
    }),

  history: protectedProcedure
    .input(z.object({ clientId: z.string() }))
    .query(async ({ ctx, input }) => {
      const rows = await ctx.db.collection("client_history").getList<ClientHistoryRow>(1, 50, {
        filter: `firmId = "${escapeFilterValue(ctx.user.firmId)}" && clientId = "${escapeFilterValue(input.clientId)}"`,
        sort: "-createdAt",
      });

      return toRecordList(rows.items.map(asAppHistory));
    }),

  create: protectedProcedure.input(ClientCreateSchema).mutation(async ({ ctx, input }) => {
    const clientId = await nextClientId(ctx);
    const timestamp = nowIso();

    const row = await ctx.db.collection("clients").create<ClientRow>({
      clientId,
      firmId: ctx.user.firmId,
      createdBy: ctx.user.userId,
      name: input.name,
      email: input.email,
      phone: input.phone,
      passportNumber: input.passportNumber,
      retainer: 0,
      status: input.status,
      passportFileId: input.passportFileId,
      contractFileId: input.contractFileId,
      clientSince: input.clientSince ? toDateTime(input.clientSince) : undefined,
      createdAt: timestamp,
      updatedAt: timestamp,
      activeCases: 0,
    });

    return toRecordDoc(asAppClient(row));
  }),

  update: protectedProcedure.input(ClientUpdateSchema).mutation(async ({ ctx, input }) => {
    const { id, ...data } = input;

    const currentRows = await ctx.db.collection("clients").getFullList<ClientRow>({
      filter: `firmId = "${escapeFilterValue(ctx.user.firmId)}" && clientId = "${escapeFilterValue(id)}"`,
      perPage: 1,
    });

    const current = currentRows[0];
    if (!current) {
      throw new Error("Client not found.");
    }

    try {
      const historyPromises: Promise<unknown>[] = [];
      for (const field of TRACKED_FIELDS) {
        if (!(field in data)) continue;

        const oldVal = String((current as Record<string, unknown>)[field] ?? "");
        const newVal = String((data as Record<string, unknown>)[field] ?? "");
        if (oldVal === newVal) continue;

        historyPromises.push(
          ctx.db.collection("client_history").create({
            historyId: newId("hst"),
            firmId: ctx.user.firmId,
            clientId: id,
            field,
            oldValue: oldVal || null,
            newValue: newVal || null,
            createdAt: nowIso(),
            updatedAt: nowIso(),
          }),
        );
      }
      await Promise.all(historyPromises);
    } catch {
      // Never block the update if history write fails.
    }

    const updated = await ctx.db.collection("clients").update<ClientRow>(current.id, {
      name: data.name,
      email: data.email,
      phone: data.phone,
      passportNumber: data.passportNumber,
      status: data.status,
      passportFileId: data.passportFileId,
      contractFileId: data.contractFileId,
      clientSince: data.clientSince ? toDateTime(data.clientSince) : data.clientSince,
      updatedAt: nowIso(),
    });

    return toRecordDoc(asAppClient(updated));
  }),

  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const rows = await ctx.db.collection("clients").getFullList<ClientRow>({
        filter: `firmId = "${escapeFilterValue(ctx.user.firmId)}" && clientId = "${escapeFilterValue(input.id)}"`,
        perPage: 1,
      });

      if (rows[0]) {
        await ctx.db.collection("clients").delete(rows[0].id);
      }

      return { ok: true };
    }),

  deleteMany: protectedProcedure
    .input(z.object({ ids: z.array(z.string()) }))
    .mutation(async ({ ctx, input }) => {
      await Promise.all(
        input.ids.map(async (id) => {
          const rows = await ctx.db.collection("clients").getFullList<ClientRow>({
            filter: `firmId = "${escapeFilterValue(ctx.user.firmId)}" && clientId = "${escapeFilterValue(id)}"`,
            perPage: 1,
          });

          if (rows[0]) {
            await ctx.db.collection("clients").delete(rows[0].id);
          }
        }),
      );

      return { ok: true };
    }),
});
