import { z } from "zod";

export const TransactionMethodSchema = z.enum(["cash", "wire", "check"]);
export const TransactionStatusSchema = z.enum(["completed", "pending"]);
export const TransactionTypeSchema = z.enum(["retainer", "income", "expense", "fee"]);

export const TransactionSchema = z.object({
  $id: z.string(),
  $createdAt: z.string(),
  $updatedAt: z.string(),
  clientId: z.string(),
  clientName: z.string(),
  date: z.string(),
  amount: z.number(),
  attorney: z.string(),
  method: TransactionMethodSchema,
  status: TransactionStatusSchema,
  type: TransactionTypeSchema,
});

export const TransactionCreateSchema = z.object({
  clientId: z.string().min(1, "Client ID is required"),
  clientName: z.string().min(1, "Client name is required"),
  date: z.string().min(1, "Date is required"),
  amount: z.number().min(0, "Amount must be non-negative"),
  attorney: z.string().min(1, "Attorney is required"),
  method: TransactionMethodSchema,
  status: TransactionStatusSchema,
  type: TransactionTypeSchema,
});

export const TransactionUpdateSchema = TransactionCreateSchema.partial().extend({
  id: z.string(),
});

export const TransactionListInputSchema = z.object({
  search: z.string().optional(),
  status: TransactionStatusSchema.nullish(),
  type: TransactionTypeSchema.nullish(),
  limit: z.number().min(1).max(500).default(25),
  cursor: z.string().optional(),
});

export type Transaction = z.infer<typeof TransactionSchema>;
export type TransactionCreateInput = z.infer<typeof TransactionCreateSchema>;
export type TransactionUpdateInput = z.infer<typeof TransactionUpdateSchema>;
export type TransactionListInput = z.infer<typeof TransactionListInputSchema>;
