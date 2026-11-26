import { rawRecordEvent } from "@/models/analytics-event"
import type { z } from "@gorth-com/structure/cores/zod";
import type { readerEventSchema } from "@/schemas/reader";
export function recordReaderEvent(input: z.infer<typeof readerEventSchema>) {
  return rawRecordEvent(
    { ...input, resourceType: "reader", properties: {} },
    "reader",
    "reader-backend",
  );
}
