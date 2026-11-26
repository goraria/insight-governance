import { z } from "@gorth-com/structure/cores/zod";
import { eventSchema } from "@/schemas/insight";
export const taskEventSchema = eventSchema.safeExtend({
  idempotencyKey: z.uuid(),
  actorExternalUserId: z.string().min(1).max(255).optional(),
});
export const taskActivitySchema = z.object({
  workspaceId: z.uuid(),
  limit: z.number().int().min(1).max(100).default(20),
  offset: z.number().int().min(0).max(100000).default(0),
});
