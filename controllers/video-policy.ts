import { readRequestBody } from "@/utils/request";
import type { ApiContext } from "@/types/auth";
import { videoPolicySchema } from "@/schemas/video-policy";
import { rawReadVideoPolicy as readVideoPolicyServices } from "@/services/video-policy";
export async function actReadVideoPolicy(e: ApiContext) {
  return e.json(
    await readVideoPolicyServices(videoPolicySchema.parse(await readRequestBody(e.req))),
  );
}
