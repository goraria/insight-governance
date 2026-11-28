import { readRequestBody } from "@/modules/principle/request";
import type { Event } from "@/utils/interface";
import { readerEventSchema } from "@/schemas/reader";
import { recordReaderEvent as recordReaderEventServices } from "@/services/reader";
export async function actRecordReaderEvent(e: Event) {
  return e.json(
    await recordReaderEventServices(
      readerEventSchema.parse(await readRequestBody(e.req)),
    ),
    { status: 201 },
  );
}
