import { z } from "zod";

export const PersonnelRoleSchema = z.enum([
  "CEO", "Partner", "Senior Attorney", "Attorney", "Law Student",
]);

const phoneRegex = /^\d{2}-\d{2}-\d{3}$/;

export const PersonnelSchema = z.object({
  $id: z.string(),
  $createdAt: z.string(),
  $updatedAt: z.string(),
  name: z.string(),
  email: z.string(),
  contact: z.string().optional(),
  licensed: z.boolean(),
  startDate: z.string(),
  role: PersonnelRoleSchema,
  passportNumber: z.string().optional(),
  cases: z.number().optional(),
  revenue: z.number().optional(),
  recentWins: z.number().optional(),
});

// password is required so we can create the LMS auth account
export const PersonnelCreateSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Must be a valid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  contact: z
    .string()
    .refine((v) => !v || v === "N/A" || phoneRegex.test(v), "Phone must be 00-00-000 or N/A")
    .optional(),
  licensed: z.boolean(),
  startDate: z.string().min(1, "Start date is required"),
  role: PersonnelRoleSchema,
  passportNumber: z.string().optional(),
});

export const PersonnelUpdateSchema = PersonnelCreateSchema
  .omit({ password: true })
  .partial()
  .extend({ id: z.string() });

export const PersonnelListInputSchema = z.object({
  search: z.string().optional(),
  licensed: z.boolean().nullish(),
  limit: z.number().min(1).max(500).default(25),
  cursor: z.string().optional(),
});

export type Personnel = z.infer<typeof PersonnelSchema>;
export type PersonnelCreateInput = z.infer<typeof PersonnelCreateSchema>;
export type PersonnelUpdateInput = z.infer<typeof PersonnelUpdateSchema>;
export type PersonnelListInput = z.infer<typeof PersonnelListInputSchema>;
