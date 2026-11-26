import { readRequestBody } from "@/utils/request";
import type { ApiContext } from "@/types/auth";
import { chatEventSchema } from "@/schemas/chat";
import { recordChatEvent as recordChatEventServices } from "@/services/chat";
export async function actRecordChatEvent(event: ApiContext) {
  return event.json(
    await recordChatEventServices(
      chatEventSchema.parse(await readRequestBody(event.req)),
    ),
    { status: 201 },
  );
}
