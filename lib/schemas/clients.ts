import { z } from "zod";

const discordUsernameRegex = /^[a-z0-9_.]{2,32}$/;
const phoneRegex = /^\d{2}-\d{2}-\d{3}$/;

export const ClientSchema = z.object({
  $id: z.string(),
  $createdAt: z.string(),
  $updatedAt: z.string(),
  name: z.string(),
  email: z.string(),
  phone: z.string().optional(),
  passportNumber: z.string().optional(),
  retainer: z.number(),
  activeCases: z.number().optional(),
  status: z.boolean(),
  lastContacted: z.string().optional(),
  clientSince: z.string().optional(),
});

export const ClientCreateSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z
    .string()
    .refine(
      (v) => v === "N/A" || discordUsernameRegex.test(v),
      "Must be a valid Discord username (2–32 chars, lowercase, _ or .) or N/A"
    ),
  phone: z
    .string()
    .refine(
      (v) => !v || v === "N/A" || phoneRegex.test(v),
      "Phone must be in format 00-00-000 or N/A"
    )
    .optional(),
  passportNumber: z.string().optional(),
  status: z.boolean().default(true),
  lastContacted: z.string().optional(),
  clientSince: z.string().optional(),
  passportFileId: z.string().optional(),
  contractFileId: z.string().optional(),
});

export const ClientUpdateSchema = ClientCreateSchema.partial().extend({
  id: z.string(),
});

export const ClientListInputSchema = z.object({
  search: z.string().optional(),
  status: z.boolean().nullish(),
  limit: z.number().min(1).max(500).default(25),
  cursor: z.string().optional(),
});

export type Client = z.infer<typeof ClientSchema>;
export type ClientCreateInput = z.infer<typeof ClientCreateSchema>;
export type ClientUpdateInput = z.infer<typeof ClientUpdateSchema>;
export type ClientListInput = z.infer<typeof ClientListInputSchema>;
