import { router, protectedProcedure } from "../trpc";
import { CampaignListInputSchema, CampaignCreateSchema, CampaignUpdateSchema } from "@/lib/schemas/marketing";
import { escapeFilterValue, nowIso, toRecordDoc, toRecordList } from "@/lib/pocketbase";
import { z } from "zod";

type CampaignRow = {
  id: string;
  campaignId: string;
  firmId: string;
  platform: string;
  date: string;
  time?: string;
  manager: string;
  budget: number;
  actual: number;
  results: number;
  roi: number;
  status: string;
  createdAt: string;
  updatedAt: string;
};

async function nextCampaignId(ctx: { db: any; user: { firmId: string } }) {
  const rows = await ctx.db.collection("campaigns").getFullList<CampaignRow>({
    filter: `firmId = "${escapeFilterValue(ctx.user.firmId)}"`,
    fields: "id",
  });
  return `MKT-${String(rows.length + 1).padStart(3, "0")}`;
}

function toDateTime(dateStr: string): string {
  if (!dateStr) return dateStr;
  if (dateStr.includes("T")) return dateStr;
  return `${dateStr}T00:00:00.000+00:00`;
}

function asAppCampaign(row: CampaignRow) {
  return {
    ...row,
    id: row.campaignId,
  };
}

export const marketingRouter = router({
  list: protectedProcedure.input(CampaignListInputSchema).query(async ({ ctx, input }) => {
    const filters = [`firmId = "${escapeFilterValue(ctx.user.firmId)}"`];

    if (input.search) {
      filters.push(`manager ~ "${escapeFilterValue(input.search.toLowerCase())}"`);
    }

    if (input.platform) {
      filters.push(`platform = "${escapeFilterValue(String(input.platform))}"`);
    }

    if (input.status) {
      filters.push(`status = "${escapeFilterValue(String(input.status))}"`);
    }

    const result = await ctx.db.collection("campaigns").getList<CampaignRow>(1, input.limit, {
      filter: filters.join(" && "),
      sort: "-createdAt",
    });

    return toRecordList(result.items.map(asAppCampaign));
  }),

  byId: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const rows = await ctx.db.collection("campaigns").getFullList<CampaignRow>({
        filter: `firmId = "${escapeFilterValue(ctx.user.firmId)}" && campaignId = "${escapeFilterValue(input.id)}"`,
        perPage: 1,
      });

      if (!rows[0]) {
        throw new Error("Campaign not found.");
      }

      return toRecordDoc(asAppCampaign(rows[0]));
    }),

  create: protectedProcedure.input(CampaignCreateSchema).mutation(async ({ ctx, input }) => {
    const campaignId = await nextCampaignId(ctx);
    const timestamp = nowIso();

    const row = await ctx.db.collection("campaigns").create<CampaignRow>({
      campaignId,
      firmId: ctx.user.firmId,
      createdBy: ctx.user.userId,
      platform: input.platform,
      date: toDateTime(input.date),
      time: input.time,
      manager: input.manager,
      budget: input.budget,
      actual: input.actual,
      results: input.results,
      roi: input.roi,
      status: input.status,
      createdAt: timestamp,
      updatedAt: timestamp,
    });

    return toRecordDoc(asAppCampaign(row));
  }),

  update: protectedProcedure.input(CampaignUpdateSchema).mutation(async ({ ctx, input }) => {
    const { id, ...data } = input;

    const rows = await ctx.db.collection("campaigns").getFullList<CampaignRow>({
      filter: `firmId = "${escapeFilterValue(ctx.user.firmId)}" && campaignId = "${escapeFilterValue(id)}"`,
      perPage: 1,
    });

    if (!rows[0]) {
      throw new Error("Campaign not found.");
    }

    const updated = await ctx.db.collection("campaigns").update<CampaignRow>(rows[0].id, {
      platform: data.platform,
      date: data.date ? toDateTime(data.date) : data.date,
      time: data.time,
      manager: data.manager,
      budget: data.budget,
      actual: data.actual,
      results: data.results,
      roi: data.roi,
      status: data.status,
      updatedAt: nowIso(),
    });

    return toRecordDoc(asAppCampaign(updated));
  }),

  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const rows = await ctx.db.collection("campaigns").getFullList<CampaignRow>({
        filter: `firmId = "${escapeFilterValue(ctx.user.firmId)}" && campaignId = "${escapeFilterValue(input.id)}"`,
        perPage: 1,
      });

      if (rows[0]) {
        await ctx.db.collection("campaigns").delete(rows[0].id);
      }

      return { ok: true };
    }),

  deleteMany: protectedProcedure
    .input(z.object({ ids: z.array(z.string()) }))
    .mutation(async ({ ctx, input }) => {
      await Promise.all(
        input.ids.map(async (id) => {
          const rows = await ctx.db.collection("campaigns").getFullList<CampaignRow>({
            filter: `firmId = "${escapeFilterValue(ctx.user.firmId)}" && campaignId = "${escapeFilterValue(id)}"`,
            perPage: 1,
          });

          if (rows[0]) {
            await ctx.db.collection("campaigns").delete(rows[0].id);
          }
        }),
      );

      return { ok: true };
    }),
});
