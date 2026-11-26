import { z } from "@gorth-com/structure/cores/zod";
export const readerEventSchema = z.object({
  idempotencyKey: z.uuid(),
  name: z.enum([
    "story.updated",
    "chapter.updated",
    "chapter.published",
    "reading.progress",
  ]),
  resourceId: z.uuid(),
  occurredAt: z.coerce.date(),
});
