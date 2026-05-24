import { router, protectedProcedure } from "../trpc";
import { CaseListInputSchema, CaseCreateSchema, CaseUpdateSchema } from "@/lib/schemas/cases";
import { escapeFilterValue, nowIso, toRecordDoc, toRecordList } from "@/lib/pocketbase";
import { z } from "zod";

type CaseRow = {
  id: string;
  caseId: string;
  firmId: string;
  clientId: string;
  clientName: string;
  clientIds: string;
  clientNames: string;
  description: string;
  status: string;
  assignedAttorneys: string;
  currentStatus: string;
  startDate: string;
  endDate?: string;
  createdAt: string;
  updatedAt: string;
};

function parseStringArray(value: string | string[] | undefined) {
  if (Array.isArray(value)) return value;
  if (!value) return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.map((v) => String(v)) : [];
  } catch {
    return [];
  }
}

function toDateTime(d: string) {
  if (!d || d.includes("T")) return d;
  return `${d}T00:00:00.000+00:00`;
}

function asAppCase(row: CaseRow) {
  return {
    ...row,
    clientIds: parseStringArray(row.clientIds),
    clientNames: parseStringArray(row.clientNames),
    assignedAttorneys: parseStringArray(row.assignedAttorneys),
    id: row.caseId,
  };
}

async function nextCaseId(ctx: { db: any; user: { firmId: string } }, clientId: string) {
  const year = new Date().getFullYear();
  const rows = await ctx.db.collection("cases").getFullList<CaseRow>({
    filter: `firmId = "${escapeFilterValue(ctx.user.firmId)}"`,
    fields: "id",
  });
  const seq = String(rows.length + 1).padStart(4, "0");
  return `VLI-${year}-${seq}-${clientId}`;
}

export const casesRouter = router({
  list: protectedProcedure.input(CaseListInputSchema).query(async ({ ctx, input }) => {
    let cursorCreatedAt: string | undefined;

    if (input.cursor) {
      const cursorRows = await ctx.db.collection("cases").getFullList<CaseRow>({
        filter: `firmId = "${escapeFilterValue(ctx.user.firmId)}" && caseId = "${escapeFilterValue(input.cursor)}"`,
        perPage: 1,
      });
      cursorCreatedAt = cursorRows[0]?.createdAt;
    }

    const filters = [`firmId = "${escapeFilterValue(ctx.user.firmId)}"`];

    if (input.search) {
      const q = escapeFilterValue(input.search.toLowerCase());
      filters.push(`(description ~ "${q}" || clientName ~ "${q}" || caseId ~ "${q}")`);
    }

    if (input.status) {
      filters.push(`status = "${escapeFilterValue(String(input.status))}"`);
    }

    if (cursorCreatedAt) {
      filters.push(`createdAt < "${escapeFilterValue(cursorCreatedAt)}"`);
    }

    const result = await ctx.db.collection("cases").getList<CaseRow>(1, input.limit, {
      filter: filters.join(" && "),
      sort: "-createdAt",
    });

    return toRecordList(result.items.map(asAppCase));
  }),

  byClient: protectedProcedure
    .input(z.object({ clientId: z.string() }))
    .query(async ({ ctx, input }) => {
      const result = await ctx.db.collection("cases").getList<CaseRow>(1, 50, {
        filter: `firmId = "${escapeFilterValue(ctx.user.firmId)}" && clientId = "${escapeFilterValue(input.clientId)}"`,
        sort: "-createdAt",
      });
      return toRecordList(result.items.map(asAppCase));
    }),

  byId: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const rows = await ctx.db.collection("cases").getFullList<CaseRow>({
        filter: `firmId = "${escapeFilterValue(ctx.user.firmId)}" && caseId = "${escapeFilterValue(input.id)}"`,
        perPage: 1,
      });

      if (!rows[0]) {
        throw new Error("Case not found.");
      }

      return toRecordDoc(asAppCase(rows[0]));
    }),

  create: protectedProcedure.input(CaseCreateSchema).mutation(async ({ ctx, input }) => {
    const primaryClientId = input.clientIds[0];
    const caseId = await nextCaseId(ctx, primaryClientId);
    const timestamp = nowIso();

    const row = await ctx.db.collection("cases").create<CaseRow>({
      caseId,
      firmId: ctx.user.firmId,
      createdBy: ctx.user.userId,
      clientId: primaryClientId,
      clientName: input.clientNames[0],
      clientIds: JSON.stringify(input.clientIds),
      clientNames: JSON.stringify(input.clientNames),
      description: input.description,
      status: input.status,
      assignedAttorneys: JSON.stringify(input.assignedAttorneys),
      currentStatus: input.currentStatus,
      startDate: toDateTime(input.startDate),
      endDate: input.endDate ? toDateTime(input.endDate) : undefined,
      createdAt: timestamp,
      updatedAt: timestamp,
    });

    return toRecordDoc(asAppCase(row));
  }),

  update: protectedProcedure.input(CaseUpdateSchema).mutation(async ({ ctx, input }) => {
    const { id, ...data } = input;

    const rows = await ctx.db.collection("cases").getFullList<CaseRow>({
      filter: `firmId = "${escapeFilterValue(ctx.user.firmId)}" && caseId = "${escapeFilterValue(id)}"`,
      perPage: 1,
    });

    if (!rows[0]) {
      throw new Error("Case not found.");
    }

    const primaryClientId = data.clientIds?.[0];

    const updated = await ctx.db.collection("cases").update<CaseRow>(rows[0].id, {
      clientId: primaryClientId,
      clientName: data.clientNames?.[0],
      clientIds: data.clientIds ? JSON.stringify(data.clientIds) : data.clientIds,
      clientNames: data.clientNames ? JSON.stringify(data.clientNames) : data.clientNames,
      description: data.description,
      status: data.status,
      assignedAttorneys: data.assignedAttorneys
        ? JSON.stringify(data.assignedAttorneys)
        : data.assignedAttorneys,
      currentStatus: data.currentStatus,
      startDate: data.startDate ? toDateTime(data.startDate) : data.startDate,
      endDate: data.endDate ? toDateTime(data.endDate) : data.endDate,
      updatedAt: nowIso(),
    });

    return toRecordDoc(asAppCase(updated));
  }),

  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const rows = await ctx.db.collection("cases").getFullList<CaseRow>({
        filter: `firmId = "${escapeFilterValue(ctx.user.firmId)}" && caseId = "${escapeFilterValue(input.id)}"`,
        perPage: 1,
      });

      if (rows[0]) {
        await ctx.db.collection("cases").delete(rows[0].id);
      }

      return { ok: true };
    }),

  deleteMany: protectedProcedure
    .input(z.object({ ids: z.array(z.string()) }))
    .mutation(async ({ ctx, input }) => {
      await Promise.all(
        input.ids.map(async (id) => {
          const rows = await ctx.db.collection("cases").getFullList<CaseRow>({
            filter: `firmId = "${escapeFilterValue(ctx.user.firmId)}" && caseId = "${escapeFilterValue(id)}"`,
            perPage: 1,
          });

          if (rows[0]) {
            await ctx.db.collection("cases").delete(rows[0].id);
          }
        }),
      );

      return { ok: true };
    }),
});
