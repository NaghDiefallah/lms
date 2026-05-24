import { useAuth } from "@/lib/auth-context";
import type { Role } from "@/lib/rbac/permissions";
import { hasPermission } from "@/lib/rbac/role-map";
import type { Permission } from "@/lib/rbac/permissions";

export function useRole(): Role | null {
  const { user } = useAuth();
  return (user?.role as Role | undefined) ?? null;
}

export function useHasPermission(permission: Permission): boolean {
  const role = useRole();
  if (!role) return false;
  return hasPermission(role, permission);
}
