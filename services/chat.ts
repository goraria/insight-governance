import { rawRecordEvent } from "@/models/analytics-event"
import type { z } from "@gorth-com/structure/cores/zod";
import type { chatEventSchema } from "@/schemas/chat";
export async function recordChatEvent(input: z.infer<typeof chatEventSchema>) {
  return rawRecordEvent(
    {
      name: input.name,
      idempotencyKey: input.idempotencyKey,
      resourceType: "chat",
      resourceId: input.resourceId,
      occurredAt: input.occurredAt,
      properties: { conversationId: input.conversationId },
    },
    "chat",
    "chat-backend",
  );
}
