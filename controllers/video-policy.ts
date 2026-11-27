import { readRequestBody } from "@/utils/request";
import type { Event } from "@/utils/interface";
import { videoPolicySchema } from "@/schemas/video-policy";
import { rawReadVideoPolicy as readVideoPolicyServices } from "@/services/video-policy";
export async function actReadVideoPolicy(e: Event) {
  return e.json(
    await readVideoPolicyServices(videoPolicySchema.parse(await readRequestBody(e.req))),
  );
}
