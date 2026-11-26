import { z } from "@gorth-com/structure/cores/zod";
export const videoEventSchema = z
  .object({
    idempotencyKey: z.uuid(),
    name: z.enum([
      "video.publish",
      "video.index",
      "video.delete",
      "video.view",
      "video.qoe",
      "video.processed",
    ]),
    resourceId: z.uuid(),
    occurredAt: z.coerce.date(),
    qoe: z
      .object({
        startupMs: z.number().finite().min(0).max(600000),
        rebufferMs: z.number().finite().min(0).max(21600000),
        errors: z.number().int().min(0).max(100),
      })
      .strict()
      .optional(),
  })
  .strict();
