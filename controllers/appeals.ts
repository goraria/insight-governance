import type { Event } from "@/utils/interface";
import { getQueryValues } from "@/utils/request";
import { pageSchema } from "@/schemas/insight";
import {
  rawMyEnforcements as myEnforcementsServices,
  rawListAppealsManagement as listAppealsServices,
} from "@/models/moderation-appeal";
export async function actMyEnforcements(e: Event) {
  return e.json(
    await myEnforcementsServices(
      e.get("sub")!,
      e.get("app")!,
      pageSchema.parse(getQueryValues(e.req.raw)),
      e.req.raw.headers.get("authorization") ?? undefined,
    ),
  );
}
export async function actListAppeals(e: Event) {
  return e.json(
    await listAppealsServices(
      e.get("app")!,
      pageSchema.parse(getQueryValues(e.req.raw)),
    ),
  );
}
