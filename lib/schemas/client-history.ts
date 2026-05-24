import { z } from "zod";

export const ClientHistorySchema = z.object({
  $id: z.string(),
  $createdAt: z.string(),
  clientId: z.string(),
  field: z.string(),
  oldValue: z.string().nullable().optional(),
  newValue: z.string().nullable().optional(),
});

export type ClientHistory = z.infer<typeof ClientHistorySchema>;
