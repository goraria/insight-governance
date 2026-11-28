import { readRequestBody } from "@/modules/principle/request";
import type { Event } from "@/utils/interface";
import { videoEventSchema } from "@/schemas/video";
import { recordVideoEvent as recordVideoEventServices } from "@/services/video";
export async function actRecordVideoEvent(e: Event) {
  return e.json(
    await recordVideoEventServices(videoEventSchema.parse(await readRequestBody(e.req))),
  );
}
