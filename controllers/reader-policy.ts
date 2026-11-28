import { readRequestBody } from "@/modules/principle/request";
import type { Event } from "@/utils/interface";
import { readerPolicySchema } from "@/schemas/reader-policy";
import { rawReadReaderPolicy as readReaderPolicyServices } from "@/services/reader-policy";
export async function actReadReaderPolicy(e: Event) {
  return e.json(
    await readReaderPolicyServices(
      readerPolicySchema.parse(await readRequestBody(e.req)),
    ),
  );
}
