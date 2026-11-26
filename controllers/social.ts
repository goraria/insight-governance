import { readRequestBody } from "@/utils/request";
import type { ApiContext } from "@/types/auth";
import { socialEventSchema } from "@/schemas/social";
import { recordSocialEvent as recordSocialEventServices } from "@/services/social";
export async function actRecordSocialEvent(e: ApiContext) {
  return e.json(
    await recordSocialEventServices(
      socialEventSchema.parse(await readRequestBody(e.req)),
    ),
    { status: 201 },
  );
}
