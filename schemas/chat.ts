import { z } from "@gorth-com/structure/cores/zod";
export const chatEventSchema = z.object({
  idempotencyKey: z.string().uuid(),
  name: z.enum([
    "conversation.created",
    "conversation.updated",
    "member.updated",
    "message.created",
    "message.updated",
    "message.deleted",
    "reaction.updated",
    "receipt.updated",
    "call.created",
    "call.updated",
  ]),
  resourceId: z.string().uuid(),
  conversationId: z.string().uuid(),
  occurredAt: z.coerce.date(),
});
