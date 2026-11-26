import { rawRecordEvent } from "@/models/analytics-event"
import type { z } from "@gorth-com/structure/cores/zod";
import type { socialEventSchema } from "@/schemas/social";
export function recordSocialEvent(input: z.infer<typeof socialEventSchema>) {
  return rawRecordEvent(
    { ...input, resourceType: "social", properties: {} },
    "social",
    "social-backend",
  );
}
