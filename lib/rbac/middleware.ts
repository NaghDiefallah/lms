import { TRPCError } from "@trpc/server";
import { hasPermission } from "./role-map";
import type { Permission, Role } from "./permissions";

/**
 * RBAC middleware factory for tRPC procedures.
 *
 * Usage:
 *   export const deleteCaseProcedure = protectedProcedure("cases.delete")
 *     .mutation(async ({ ctx, input }) => { ... })
 *
 * The procedure requires ctx.user.role to be set by the outer auth middleware
 * (populated from the LMS session token in createContext).
 */
export function requirePermission(required: Permission) {
  return function rbacMiddleware<TCtx extends { user?: { role: Role } | null }>(
    ctx: TCtx
  ): asserts ctx is TCtx & { user: { role: Role } } {
    if (!ctx.user) {
      throw new TRPCError({
        code: "UNAUTHORIZED",
        message: "You must be logged in to perform this action.",
      });
    }

    if (!hasPermission(ctx.user.role, required)) {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: `Your role (${ctx.user.role}) does not have the '${required}' permission.`,
      });
    }
  };
}

/**
 * Example: how the middleware validates a Senior Attorney attempting cases.delete
 *
 * 1. Request arrives at the tRPC handler (DELETE /api/trpc/cases.delete).
 * 2. createContext() runs: decodes the LMS session token, looks up the user
 *    document in the 'personnel' collection, reads their 'role' field.
 *    → ctx.user = { $id: "EMP-001", name: "Jane Smith", role: "Senior Attorney" }
 *
 * 3. The procedure calls requirePermission("cases.delete")(ctx).
 *
 * 4. hasPermission("Senior Attorney", "cases.delete") evaluates:
 *    - granted = ["cases.create", "cases.read", "cases.update", ...]
 *    - "cases.delete" ∉ granted                           → false
 *    - "cases.all"   ∉ granted (no .all for Senior Atty)  → false
 *    → returns false
 *
 * 5. requirePermission throws TRPCError({ code: "FORBIDDEN" }).
 *
 * 6. tRPC serialises this as HTTP 403 with:
 *    { error: { code: -32603, message: "Your role (Senior Attorney) does not have the 'cases.delete' permission." } }
 *
 * 7. The client-side useMutation.onError handler receives this and shows a toast.
 */
