import { TRPCError } from "@trpc/server";
import { router, protectedProcedure } from "../trpc";
import { PersonnelListInputSchema, PersonnelCreateSchema, PersonnelUpdateSchema } from "@/lib/schemas/personnel";
import { escapeFilterValue, newId, nowIso, toRecordDoc, toRecordList } from "@/lib/pocketbase";
import { z } from "zod";

type PersonnelRow = {
  id: string;
  personnelId: string;
  firmId: string;
  userId: string;
  name: string;
  email: string;
  contact: string;
  licensed: boolean;
  startDate: string;
  role: string;
  passportNumber?: string;
  createdAt: string;
  updatedAt: string;
};

type UserRow = {
  id: string;
  email: string;
};

type MembershipRow = {
  id: string;
  userId: string;
  firmId: string;
  role: string;
};

async function nextEmployeeId(ctx: { db: any; user: { firmId: string } }) {
  const rows = await ctx.db.collection("personnel").getFullList<PersonnelRow>({
    filter: `firmId = "${escapeFilterValue(ctx.user.firmId)}"`,
    fields: "id",
  });

  return `EMP-${String(rows.length + 1).padStart(3, "0")}`;
}

function toDateTime(d: string) {
  if (!d || d.includes("T")) return d;
  return `${d}T00:00:00.000+00:00`;
}

function asAppPersonnel(row: PersonnelRow) {
  return {
    ...row,
    id: row.personnelId,
  };
}

export const personnelRouter = router({
  list: protectedProcedure.input(PersonnelListInputSchema).query(async ({ ctx, input }) => {
    const filters = [`firmId = "${escapeFilterValue(ctx.user.firmId)}"`];

    if (input.search) {
      filters.push(`name ~ "${escapeFilterValue(input.search.toLowerCase())}"`);
    }

    if (input.licensed != null) {
      filters.push(`licensed = ${input.licensed ? "true" : "false"}`);
    }

    const rows = await ctx.db.collection("personnel").getList<PersonnelRow>(1, input.limit, {
      filter: filters.join(" && "),
      sort: "-createdAt",
    });

    return toRecordList(rows.items.map(asAppPersonnel));
  }),

  byId: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const rows = await ctx.db.collection("personnel").getFullList<PersonnelRow>({
        filter: `firmId = "${escapeFilterValue(ctx.user.firmId)}" && personnelId = "${escapeFilterValue(input.id)}"`,
        perPage: 1,
      });

      if (!rows[0]) {
        throw new Error("Personnel record not found.");
      }

      return toRecordDoc(asAppPersonnel(rows[0]));
    }),

  byEmail: protectedProcedure
    .input(z.object({ email: z.string() }))
    .query(async ({ ctx, input }) => {
      if (!input.email) return null;

      const rows = await ctx.db.collection("personnel").getFullList<PersonnelRow>({
        filter: `firmId = "${escapeFilterValue(ctx.user.firmId)}" && email = "${escapeFilterValue(input.email.toLowerCase())}"`,
        perPage: 1,
      });

      return rows[0] ? { role: rows[0].role } : null;
    }),

  create: protectedProcedure.input(PersonnelCreateSchema).mutation(async ({ ctx, input }) => {
    const { password, ...personnelData } = input;
    const personnelId = await nextEmployeeId(ctx);
    const timestamp = nowIso();

    if (!["CEO", "Partner"].includes(ctx.user.role)) {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "Only CEO or Partner can create team member accounts.",
      });
    }

    const normalizedEmail = personnelData.email.toLowerCase();

    const existingUsers = await ctx.db.collection("users").getFullList<UserRow>({
      filter: `email = "${escapeFilterValue(normalizedEmail)}"`,
      perPage: 1,
    });

    let userId = existingUsers[0]?.id;

    if (!userId) {
      const user = await ctx.db.collection("users").create<UserRow>({
        email: normalizedEmail,
        password,
        passwordConfirm: password,
        name: personnelData.name,
        defaultFirmId: ctx.user.firmId,
        createdAt: timestamp,
        updatedAt: timestamp,
      });
      userId = user.id;
    }

    const existingMemberships = await ctx.db.collection("memberships").getFullList<MembershipRow>({
      filter: `userId = "${escapeFilterValue(userId)}" && firmId = "${escapeFilterValue(ctx.user.firmId)}"`,
      perPage: 1,
    });

    if (!existingMemberships[0]) {
      try {
        await ctx.db.collection("memberships").create({
          membershipId: newId("mbr"),
          userId,
          firmId: ctx.user.firmId,
          role: personnelData.role,
          status: "active",
          invitedBy: ctx.user.userId,
          createdAt: timestamp,
          updatedAt: timestamp,
        });
      } catch (e: any) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `Failed to attach team member to firm: ${e?.message ?? "Unknown error"}`,
        });
      }
    }

    const existingPersonnel = await ctx.db.collection("personnel").getFullList<PersonnelRow>({
      filter: `firmId = "${escapeFilterValue(ctx.user.firmId)}" && email = "${escapeFilterValue(normalizedEmail)}"`,
      perPage: 1,
    });

    if (existingPersonnel[0]) {
      throw new TRPCError({ code: "CONFLICT", message: "Personnel entry with this email already exists." });
    }

    const row = await ctx.db.collection("personnel").create<PersonnelRow>({
      personnelId,
      firmId: ctx.user.firmId,
      userId,
      name: personnelData.name,
      email: normalizedEmail,
      contact: personnelData.contact,
      licensed: personnelData.licensed,
      startDate: toDateTime(personnelData.startDate),
      role: personnelData.role,
      passportNumber: personnelData.passportNumber,
      cases: 0,
      revenue: 0,
      recentWins: 0,
      createdAt: timestamp,
      updatedAt: timestamp,
    });

    return toRecordDoc(asAppPersonnel(row));
  }),

  update: protectedProcedure.input(PersonnelUpdateSchema).mutation(async ({ ctx, input }) => {
    const { id, ...data } = input;

    const rows = await ctx.db.collection("personnel").getFullList<PersonnelRow>({
      filter: `firmId = "${escapeFilterValue(ctx.user.firmId)}" && personnelId = "${escapeFilterValue(id)}"`,
      perPage: 1,
    });

    if (!rows[0]) {
      throw new Error("Personnel record not found.");
    }

    const row = rows[0];

    const updated = await ctx.db.collection("personnel").update<PersonnelRow>(row.id, {
      name: data.name,
      email: data.email,
      contact: data.contact,
      licensed: data.licensed,
      startDate: data.startDate ? toDateTime(data.startDate) : data.startDate,
      role: data.role,
      passportNumber: data.passportNumber,
      updatedAt: nowIso(),
    });

    if (data.role) {
      const memberships = await ctx.db.collection("memberships").getFullList<MembershipRow>({
        filter: `userId = "${escapeFilterValue(row.userId)}" && firmId = "${escapeFilterValue(ctx.user.firmId)}"`,
        perPage: 1,
      });

      if (memberships[0]) {
        await ctx.db.collection("memberships").update(memberships[0].id, {
          role: data.role,
          updatedAt: nowIso(),
        });
      }
    }

    return toRecordDoc(asAppPersonnel(updated));
  }),

  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const rows = await ctx.db.collection("personnel").getFullList<PersonnelRow>({
        filter: `firmId = "${escapeFilterValue(ctx.user.firmId)}" && personnelId = "${escapeFilterValue(input.id)}"`,
        perPage: 1,
      });

      if (!rows[0]) {
        return { ok: true };
      }

      const row = rows[0];
      await ctx.db.collection("personnel").delete(row.id);

      const memberships = await ctx.db.collection("memberships").getFullList<MembershipRow>({
        filter: `userId = "${escapeFilterValue(row.userId)}" && firmId = "${escapeFilterValue(ctx.user.firmId)}"`,
        perPage: 1,
      });

      if (memberships[0]) {
        await ctx.db.collection("memberships").update(memberships[0].id, {
          status: "inactive",
          updatedAt: nowIso(),
        });
      }

      return { ok: true };
    }),

  deleteMany: protectedProcedure
    .input(z.object({ ids: z.array(z.string()) }))
    .mutation(async ({ ctx, input }) => {
      await Promise.all(
        input.ids.map(async (id) => {
          const rows = await ctx.db.collection("personnel").getFullList<PersonnelRow>({
            filter: `firmId = "${escapeFilterValue(ctx.user.firmId)}" && personnelId = "${escapeFilterValue(id)}"`,
            perPage: 1,
          });

          if (rows[0]) {
            await ctx.db.collection("personnel").delete(rows[0].id);
          }
        }),
      );

      return { ok: true };
    }),
});
