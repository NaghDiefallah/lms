import { z } from "zod";
import { newId, nowIso, toRecordList, escapeFilterValue } from "@/lib/pocketbase";
import { protectedProcedure, router } from "../trpc";

type InviteRow = {
  id: string;
  code: string;
  firmId: string;
  email: string;
  role: string;
  status: "pending" | "accepted";
  createdAt: string;
  invitedBy: string;
};

type MembershipRow = {
  id: string;
  userId: string;
  role: string;
  status: "active" | "inactive";
  createdAt: string;
};

type UserRow = {
  id: string;
  name: string;
  email: string;
};

type PersonnelRow = {
  id: string;
  userId: string;
  name: string;
  email: string;
};

export const firmsRouter = router({
  current: protectedProcedure.query(async ({ ctx }) => {
    try {
      return await ctx.db.collection("firms").getOne<{ id: string; name: string }>(ctx.user.firmId);
    } catch {
      return null;
    }
  }),

  members: protectedProcedure.query(async ({ ctx }) => {
    const memberships = await ctx.db.collection("memberships").getFullList<MembershipRow>({
      filter: `firmId = "${escapeFilterValue(ctx.user.firmId)}" && status = "active"`,
      sort: "-createdAt",
    });

    if (memberships.length === 0) {
      return toRecordList([]);
    }

    const userIds = memberships.map((m) => m.userId);

    const [personnelRows, userRows] = await Promise.all([
      ctx.db.collection("personnel").getFullList<PersonnelRow>({
        filter: userIds.map((id) => `userId = "${escapeFilterValue(id)}"`).join(" || "),
      }),
      ctx.db.collection("users").getFullList<UserRow>({
        filter: userIds.map((id) => `id = "${escapeFilterValue(id)}"`).join(" || "),
      }),
    ]);

    const personnelByUserId = new Map(personnelRows.map((p) => [p.userId, p]));
    const usersById = new Map(userRows.map((u) => [u.id, u]));

    const rows = memberships.map((m) => {
      const p = personnelByUserId.get(m.userId);
      const u = usersById.get(m.userId);

      return {
        id: m.userId,
        name: p?.name ?? u?.name ?? "",
        email: p?.email ?? u?.email ?? "",
        role: m.role,
        createdAt: m.createdAt,
        updatedAt: m.createdAt,
      };
    });

    return toRecordList(rows);
  }),

  invitations: protectedProcedure.query(async ({ ctx }) => {
    const rows = await ctx.db.collection("invites").getList<InviteRow>(1, 100, {
      filter: `firmId = "${escapeFilterValue(ctx.user.firmId)}"`,
      sort: "-createdAt",
    });

    return toRecordList(
      rows.items.map((invite) => ({
        ...invite,
        id: invite.code,
      })),
    );
  }),

  invite: protectedProcedure
    .input(
      z.object({
        email: z.string().email(),
        role: z.enum(["CEO", "Partner", "Senior Attorney", "Attorney", "Law Student"]),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      if (!["CEO", "Partner"].includes(ctx.user.role)) {
        throw new Error("Only CEO or Partner can invite users.");
      }

      const normalizedEmail = input.email.toLowerCase();
      const users = await ctx.db.collection("users").getFullList<UserRow>({
        filter: `email = "${escapeFilterValue(normalizedEmail)}"`,
        perPage: 1,
      });

      if (users[0]) {
        const memberships = await ctx.db.collection("memberships").getFullList<MembershipRow>({
          filter: `userId = "${escapeFilterValue(users[0].id)}" && firmId = "${escapeFilterValue(ctx.user.firmId)}"`,
          perPage: 1,
        });

        if (memberships[0]) {
          throw new Error("This user is already a member of your firm.");
        }
      }

      const pendingInvites = await ctx.db.collection("invites").getFullList<InviteRow>({
        filter: `firmId = "${escapeFilterValue(ctx.user.firmId)}" && email = "${escapeFilterValue(normalizedEmail)}" && status = "pending"`,
        perPage: 1,
      });

      if (pendingInvites.length > 0) {
        throw new Error("A pending invite already exists for this email.");
      }

      const inviteCode = newId("inv");
      const createdAt = nowIso();

      const invite = await ctx.db.collection("invites").create<InviteRow>({
        code: inviteCode,
        firmId: ctx.user.firmId,
        email: normalizedEmail,
        role: input.role,
        status: "pending",
        invitedBy: ctx.user.userId,
        createdAt,
        updatedAt: createdAt,
      });

      return {
        inviteCode,
        invite: {
          ...invite,
          id: inviteCode,
        },
      };
    }),
});
