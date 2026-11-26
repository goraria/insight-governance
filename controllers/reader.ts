import { readRequestBody } from "@/utils/request";
import type { ApiContext } from "@/types/auth";
import { readerEventSchema } from "@/schemas/reader";
import { recordReaderEvent as recordReaderEventServices } from "@/services/reader";
export async function actRecordReaderEvent(e: ApiContext) {
  return e.json(
    await recordReaderEventServices(
      readerEventSchema.parse(await readRequestBody(e.req)),
    ),
    { status: 201 },
  );
}
