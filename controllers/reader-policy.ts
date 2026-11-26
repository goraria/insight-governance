import { readRequestBody } from "@/utils/request";
import type { ApiContext } from "@/types/auth";
import { readerPolicySchema } from "@/schemas/reader-policy";
import { rawReadReaderPolicy as readReaderPolicyServices } from "@/services/reader-policy";
export async function actReadReaderPolicy(e: ApiContext) {
  return e.json(
    await readReaderPolicyServices(
      readerPolicySchema.parse(await readRequestBody(e.req)),
    ),
  );
}
