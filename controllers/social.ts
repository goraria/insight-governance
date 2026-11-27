import { readRequestBody } from "@/utils/request";
import type { Event } from "@/utils/interface";
import { socialEventSchema } from "@/schemas/social";
import { recordSocialEvent as recordSocialEventServices } from "@/services/social";
export async function actRecordSocialEvent(e: Event) {
  return e.json(
    await recordSocialEventServices(
      socialEventSchema.parse(await readRequestBody(e.req)),
    ),
    { status: 201 },
  );
}
