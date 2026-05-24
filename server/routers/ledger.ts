import { router, protectedProcedure } from "../trpc";
import { TransactionListInputSchema, TransactionCreateSchema, TransactionUpdateSchema } from "@/lib/schemas/ledger";
import { escapeFilterValue, nowIso, toRecordDoc, toRecordList } from "@/lib/pocketbase";
import { z } from "zod";

type LedgerRow = {
  id: string;
  invoiceId: string;
  firmId: string;
  createdBy: string;
  clientId: string;
  clientName: string;
  date: string;
  amount: number;
  attorney?: string;
  method?: string;
  status: string;
  type: string;
  createdAt: string;
  updatedAt: string;
};

type ClientRow = {
  id: string;
  clientId: string;
};

async function nextInvoiceId(ctx: { db: any; user: { firmId: string } }) {
  const rows = await ctx.db.collection("ledger_transactions").getFullList<LedgerRow>({
    filter: `firmId = "${escapeFilterValue(ctx.user.firmId)}"`,
    fields: "id",
  });
  return `INV-${String(rows.length + 1).padStart(4, "0")}`;
}

function toDateTime(dateStr: string): string {
  if (!dateStr) return dateStr;
  if (dateStr.includes("T")) return dateStr;
  return `${dateStr}T00:00:00.000+00:00`;
}

function asAppTx(row: LedgerRow) {
  return {
    ...row,
    id: row.invoiceId,
  };
}

async function syncClientRetainer(db: any, firmId: string, clientId: string) {
  const txRows = await db.collection("ledger_transactions").getFullList<LedgerRow>({
    filter: `firmId = "${escapeFilterValue(firmId)}" && clientId = "${escapeFilterValue(clientId)}" && type = "retainer" && status = "completed"`,
    fields: "amount",
  });

  const total = txRows.reduce((sum, row) => sum + (row.amount ?? 0), 0);

  const clientRows = await db.collection("clients").getFullList<ClientRow>({
    filter: `firmId = "${escapeFilterValue(firmId)}" && clientId = "${escapeFilterValue(clientId)}"`,
    perPage: 1,
  });

  if (!clientRows[0]) return;

  await db.collection("clients").update(clientRows[0].id, {
    retainer: total,
    updatedAt: nowIso(),
  });
}

export const ledgerRouter = router({
  list: protectedProcedure.input(TransactionListInputSchema).query(async ({ ctx, input }) => {
    const filters = [`firmId = "${escapeFilterValue(ctx.user.firmId)}"`];

    if (input.search) {
      filters.push(`clientName ~ "${escapeFilterValue(input.search.toLowerCase())}"`);
    }

    if (input.status) {
      filters.push(`status = "${escapeFilterValue(String(input.status))}"`);
    }

    if (input.type) {
      filters.push(`type = "${escapeFilterValue(String(input.type))}"`);
    }

    const result = await ctx.db.collection("ledger_transactions").getList<LedgerRow>(1, input.limit, {
      filter: filters.join(" && "),
      sort: "-createdAt",
    });

    return toRecordList(result.items.map(asAppTx));
  }),

  byId: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const rows = await ctx.db.collection("ledger_transactions").getFullList<LedgerRow>({
        filter: `firmId = "${escapeFilterValue(ctx.user.firmId)}" && invoiceId = "${escapeFilterValue(input.id)}"`,
        perPage: 1,
      });

      if (!rows[0]) {
        throw new Error("Transaction not found.");
      }

      return toRecordDoc(asAppTx(rows[0]));
    }),

  summary: protectedProcedure.query(async ({ ctx }) => {
    const rows = await ctx.db.collection("ledger_transactions").getFullList<LedgerRow>({
      filter: `firmId = "${escapeFilterValue(ctx.user.firmId)}"`,
      fields: "amount,type,status",
    });

    const completedRows = rows.filter((d) => d.status === "completed");
    const pendingRows = rows.filter((d) => d.status === "pending");

    const totalRetainer = completedRows.filter((d) => d.type === "retainer").reduce((s, d) => s + d.amount, 0);
    const totalIncome = completedRows.filter((d) => d.type === "income").reduce((s, d) => s + d.amount, 0);
    const totalExpense = completedRows.filter((d) => d.type === "expense").reduce((s, d) => s + d.amount, 0);
    const totalFee = completedRows.filter((d) => d.type === "fee").reduce((s, d) => s + d.amount, 0);
    const profit = totalRetainer + totalIncome + totalFee - totalExpense;
    const totalPending = pendingRows.reduce((s, d) => s + d.amount, 0);

    return {
      totalRetainer,
      totalIncome,
      totalExpense,
      totalFee,
      profit,
      totalPending,
      completedCount: completedRows.length,
      pendingCount: pendingRows.length,
    };
  }),

  all: protectedProcedure.query(async ({ ctx }) => {
    const rows = await ctx.db.collection("ledger_transactions").getFullList<LedgerRow>({
      filter: `firmId = "${escapeFilterValue(ctx.user.firmId)}"`,
      sort: "-createdAt",
    });

    return toRecordList(rows.map(asAppTx));
  }),

  create: protectedProcedure.input(TransactionCreateSchema).mutation(async ({ ctx, input }) => {
    const invoiceId = await nextInvoiceId(ctx);
    const timestamp = nowIso();

    const row = await ctx.db.collection("ledger_transactions").create<LedgerRow>({
      invoiceId,
      firmId: ctx.user.firmId,
      createdBy: ctx.user.userId,
      clientId: input.clientId,
      clientName: input.clientName,
      date: toDateTime(input.date),
      amount: input.amount,
      attorney: input.attorney,
      method: input.method,
      status: input.status,
      type: input.type,
      createdAt: timestamp,
      updatedAt: timestamp,
    });

    if (input.type === "retainer" && input.status === "completed") {
      await syncClientRetainer(ctx.db, ctx.user.firmId, input.clientId);
    }

    return toRecordDoc(asAppTx(row));
  }),

  update: protectedProcedure.input(TransactionUpdateSchema).mutation(async ({ ctx, input }) => {
    const { id, ...data } = input;

    const rows = await ctx.db.collection("ledger_transactions").getFullList<LedgerRow>({
      filter: `firmId = "${escapeFilterValue(ctx.user.firmId)}" && invoiceId = "${escapeFilterValue(id)}"`,
      perPage: 1,
    });

    if (!rows[0]) {
      throw new Error("Transaction not found.");
    }

    const updated = await ctx.db.collection("ledger_transactions").update<LedgerRow>(rows[0].id, {
      clientId: data.clientId,
      clientName: data.clientName,
      date: data.date ? toDateTime(data.date) : data.date,
      amount: data.amount,
      attorney: data.attorney,
      method: data.method,
      status: data.status,
      type: data.type,
      updatedAt: nowIso(),
    });

    if (data.clientId) {
      await syncClientRetainer(ctx.db, ctx.user.firmId, data.clientId);
    }

    return toRecordDoc(asAppTx(updated));
  }),

  delete: protectedProcedure
    .input(z.object({ id: z.string(), clientId: z.string().optional() }))
    .mutation(async ({ ctx, input }) => {
      const rows = await ctx.db.collection("ledger_transactions").getFullList<LedgerRow>({
        filter: `firmId = "${escapeFilterValue(ctx.user.firmId)}" && invoiceId = "${escapeFilterValue(input.id)}"`,
        perPage: 1,
      });

      if (rows[0]) {
        await ctx.db.collection("ledger_transactions").delete(rows[0].id);
      }

      if (input.clientId) {
        await syncClientRetainer(ctx.db, ctx.user.firmId, input.clientId);
      }

      return { ok: true };
    }),

  deleteMany: protectedProcedure
    .input(z.object({ ids: z.array(z.string()) }))
    .mutation(async ({ ctx, input }) => {
      await Promise.all(
        input.ids.map(async (id) => {
          const rows = await ctx.db.collection("ledger_transactions").getFullList<LedgerRow>({
            filter: `firmId = "${escapeFilterValue(ctx.user.firmId)}" && invoiceId = "${escapeFilterValue(id)}"`,
            perPage: 1,
          });

          if (rows[0]) {
            await ctx.db.collection("ledger_transactions").delete(rows[0].id);
          }
        }),
      );

      return { ok: true };
    }),
});
