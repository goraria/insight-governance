import { z } from "@gorth-com/structure/cores/zod";
export const socialPolicySchema = z.object({
  subjects: z.array(z.string().min(1).max(255)).max(100).default([]),
  resourceIds: z.array(z.uuid()).max(100).default([]),
});
