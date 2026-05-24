import { z } from "zod";

export const CampaignPlatformSchema = z.enum(["Discord", "LI Ads", "LI Broadcasts", "Other"]);
export const CampaignStatusSchema = z.enum(["active", "completed"]);

export const CampaignSchema = z.object({
  $id: z.string(),
  $createdAt: z.string(),
  $updatedAt: z.string(),
  campaignId: z.string(),
  platform: CampaignPlatformSchema,
  date: z.string(),
  time: z.string().optional(),
  manager: z.string(), // displayed as "Advertiser" in UI
  budget: z.number(),
  actual: z.number(),
  results: z.string().optional(),
  roi: z.number(),
  status: CampaignStatusSchema,
});

// campaignId is auto-generated server-side
export const CampaignCreateSchema = z.object({
  platform: CampaignPlatformSchema,
  date: z.string().min(1, "Date is required"),
  time: z.string().optional(),
  manager: z.string().min(1, "Advertiser is required"),
  budget: z.number().min(0),
  actual: z.number().min(0),
  results: z.string().optional(),
  roi: z.number(),
  status: CampaignStatusSchema,
});

export const CampaignUpdateSchema = CampaignCreateSchema.partial().extend({
  id: z.string(),
});

export const CampaignListInputSchema = z.object({
  search: z.string().optional(),
  platform: CampaignPlatformSchema.nullish(),
  status: CampaignStatusSchema.nullish(),
  limit: z.number().min(1).max(500).default(100),
  cursor: z.string().optional(),
});

export type Campaign = z.infer<typeof CampaignSchema>;
export type CampaignCreateInput = z.infer<typeof CampaignCreateSchema>;
export type CampaignUpdateInput = z.infer<typeof CampaignUpdateSchema>;
export type CampaignListInput = z.infer<typeof CampaignListInputSchema>;
