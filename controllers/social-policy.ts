import { readRequestBody } from "@/utils/request";
import type { Event } from "@/utils/interface";
import { socialPolicySchema } from "@/schemas/social-policy";
import { rawReadSocialPolicy as readSocialPolicyServices } from "@/services/social-policy";
export async function actReadSocialPolicy(e: Event) {
  return e.json(
    await readSocialPolicyServices(
      socialPolicySchema.parse(await readRequestBody(e.req)),
    ),
  );
}
