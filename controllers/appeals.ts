import type { ApiContext } from "@/types/auth";
import { getQueryValues } from "@/utils/request";
import { pageSchema } from "@/schemas/insight";
import {
  rawMyEnforcements as myEnforcementsServices,
  rawListAppealsManagement as listAppealsServices,
} from "@/models/moderation-appeal";
export async function actMyEnforcements(e: ApiContext) {
  return e.json(
    await myEnforcementsServices(
      e.get("subject")!,
      e.get("application")!,
      pageSchema.parse(getQueryValues(e.req.raw)),
      e.req.raw.headers.get("authorization") ?? undefined,
    ),
  );
}
export async function actListAppeals(e: ApiContext) {
  return e.json(
    await listAppealsServices(
      e.get("application")!,
      pageSchema.parse(getQueryValues(e.req.raw)),
    ),
  );
}
