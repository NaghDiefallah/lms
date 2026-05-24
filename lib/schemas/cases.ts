import { z } from "zod";

export const CaseStatusSchema = z.enum(["completed", "in_progress", "pending"]);

export const CaseSchema = z.object({
  $id: z.string(),
  $createdAt: z.string(),
  $updatedAt: z.string(),
  clientId: z.string(),
  clientName: z.string(),
  clientIds: z.array(z.string()).optional(),
  clientNames: z.array(z.string()).optional(),
  description: z.string(),
  notes: z.string().optional(),
  refNumber: z.string().optional(),
  startDate: z.string(),
  endDate: z.string().optional(),
  status: CaseStatusSchema,
  currentStatus: z.string().optional(),
  assignedAttorneys: z.array(z.string()).optional(),
});

export const CaseCreateSchema = z.object({
  clientIds: z.array(z.string()).min(1, "At least one client is required"),
  clientNames: z.array(z.string()).min(1),
  description: z.string().min(1, "Description is required"),
  notes: z.string().optional(),
  startDate: z.string().min(1, "Start date is required"),
  endDate: z.string().optional(),
  status: CaseStatusSchema,
  currentStatus: z.string().optional(),
  assignedAttorneys: z.array(z.string()).optional(),
});

export const CaseUpdateSchema = CaseCreateSchema.partial().extend({
  id: z.string(),
  refNumber: z.string().optional(),
});

export const CaseListInputSchema = z.object({
  search: z.string().optional(),
  status: CaseStatusSchema.nullish(),
  limit: z.number().min(1).max(500).default(25),
  cursor: z.string().optional(),
});

export type Case = z.infer<typeof CaseSchema>;
export type CaseCreateInput = z.infer<typeof CaseCreateSchema>;
export type CaseUpdateInput = z.infer<typeof CaseUpdateSchema>;
export type CaseListInput = z.infer<typeof CaseListInputSchema>;
