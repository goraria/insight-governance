import { readRequestBody } from "@/utils/request";
import type { ApiContext } from "@/types/auth";
import { videoEventSchema } from "@/schemas/video";
import { recordVideoEvent as recordVideoEventServices } from "@/services/video";
export async function actRecordVideoEvent(e: ApiContext) {
  return e.json(
    await recordVideoEventServices(videoEventSchema.parse(await readRequestBody(e.req))),
  );
}
