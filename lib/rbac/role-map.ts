import type { Permission, Role } from "./permissions";

/**
 * RBAC permission map — single source of truth.
 *
 * Rules:
 *  - module.all   => implicitly grants all actions (create/read/update/delete)
 *    for that module. The hasPermission() helper expands this at runtime.
 *  - Absence of a permission === denied.
 */
export const ROLE_PERMISSIONS: Record<Role, Permission[]> = {
  // ─── Full administrative access ──────────────────────────────────────────
  CEO: [
    "cases.all",
    "clients.all",
    "ledger.all",
    "marketing.all",
    "personnel.all",
  ],
  Partner: [
    "cases.all",
    "clients.all",
    "ledger.all",
    "marketing.all",
    "personnel.all",
  ],

  // ─── Senior Attorney ─────────────────────────────────────────────────────
  // Cases & Clients: create, read, update (no delete)
  // Ledger, Marketing, Personnel: read-only
  "Senior Attorney": [
    "cases.create",   "cases.read",   "cases.update",
    "clients.create", "clients.read", "clients.update",
    "ledger.read",
    "marketing.read",
    "personnel.read",
  ],

  // ─── Attorney ────────────────────────────────────────────────────────────
  // Cases & Clients: create + read only. No other modules.
  Attorney: [
    "cases.create",   "cases.read",
    "clients.create", "clients.read",
  ],

  // ─── Law Student ─────────────────────────────────────────────────────────
  // Read-only on Cases and Clients. No other modules.
  "Law Student": [
    "cases.read",
    "clients.read",
  ],
};

/**
 * Check whether a given role has a specific permission.
 * Expands `module.all` to cover any action on that module.
 */
export function hasPermission(role: Role, required: Permission): boolean {
  const granted = ROLE_PERMISSIONS[role] ?? [];

  // Direct match
  if (granted.includes(required)) return true;

  // Expand .all — e.g. "cases.all" satisfies "cases.delete"
  const [module] = required.split(".");
  if (granted.includes(`${module}.all` as Permission)) return true;

  return false;
}
