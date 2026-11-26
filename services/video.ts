import type { z } from "@gorth-com/structure/cores/zod";
import { videoEventSchema } from "@/schemas/video";
import { rawRecordEvent } from "@/models/analytics-event"
export async function recordVideoEvent(
  input: z.infer<typeof videoEventSchema>,
) {
  const { qoe, ...event } = input;
  return rawRecordEvent(
    {
      ...event,
      resourceType: "video",
      properties: qoe ? { ...qoe, measurement: "client_reported" } : {},
    },
    "video",
    "video-backend",
  );
}
