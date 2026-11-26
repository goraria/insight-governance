import { readRequestBody } from "@/utils/request";
import type { ApiContext } from "@/types/auth";
import { socialPolicySchema } from "@/schemas/social-policy";
import { rawReadSocialPolicy as readSocialPolicyServices } from "@/services/social-policy";
export async function actReadSocialPolicy(e: ApiContext) {
  return e.json(
    await readSocialPolicyServices(
      socialPolicySchema.parse(await readRequestBody(e.req)),
    ),
  );
}
