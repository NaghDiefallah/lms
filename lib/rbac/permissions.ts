/**
 * LMS RBAC — Permission Definitions
 *
 * Format: module.action
 * Special value: module.all  (grants all actions on that module)
 */

export const PERMISSIONS = {
  // Cases
  CASES_CREATE:  "cases.create",
  CASES_READ:    "cases.read",
  CASES_UPDATE:  "cases.update",
  CASES_DELETE:  "cases.delete",
  CASES_ALL:     "cases.all",
  // Clients
  CLIENTS_CREATE: "clients.create",
  CLIENTS_READ:   "clients.read",
  CLIENTS_UPDATE: "clients.update",
  CLIENTS_DELETE: "clients.delete",
  CLIENTS_ALL:    "clients.all",
  // Ledger
  LEDGER_CREATE:  "ledger.create",
  LEDGER_READ:    "ledger.read",
  LEDGER_UPDATE:  "ledger.update",
  LEDGER_DELETE:  "ledger.delete",
  LEDGER_ALL:     "ledger.all",
  // Marketing
  MARKETING_CREATE: "marketing.create",
  MARKETING_READ:   "marketing.read",
  MARKETING_UPDATE: "marketing.update",
  MARKETING_DELETE: "marketing.delete",
  MARKETING_ALL:    "marketing.all",
  // Personnel
  PERSONNEL_CREATE: "personnel.create",
  PERSONNEL_READ:   "personnel.read",
  PERSONNEL_UPDATE: "personnel.update",
  PERSONNEL_DELETE: "personnel.delete",
  PERSONNEL_ALL:    "personnel.all",
} as const;

export type Permission = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];
export type Role = "CEO" | "Partner" | "Senior Attorney" | "Attorney" | "Law Student";
