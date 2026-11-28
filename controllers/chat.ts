import { readRequestBody } from "@/modules/principle/request";
import type { Event } from "@/utils/interface";
import { chatEventSchema } from "@/schemas/chat";
import { recordChatEvent as recordChatEventServices } from "@/services/chat";
export async function actRecordChatEvent(event: Event) {
  return event.json(
    await recordChatEventServices(
      chatEventSchema.parse(await readRequestBody(event.req)),
    ),
    { status: 201 },
  );
}
