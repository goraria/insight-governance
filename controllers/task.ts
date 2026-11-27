import { readRequestBody } from "@/utils/request";
import type { Event } from "@/utils/interface";
import { taskEventSchema, taskActivitySchema } from "@/schemas/task";
import {
  rawRecordTaskEvent as recordTaskEventServices,
  rawTaskWorkspaceActivity as taskWorkspaceActivityServices,
} from "@/models/audit-event";
export async function actRecordTaskEvent(event: Event) {
  return event.json(
    await recordTaskEventServices(
      taskEventSchema.parse(await readRequestBody(event.req)),
    ),
    { status: 201 },
  );
}
export async function actTaskWorkspaceActivity(event: Event) {
  const input = taskActivitySchema.parse(await readRequestBody(event.req));
  return event.json(
    await taskWorkspaceActivityServices(
      input.workspaceId,
      input.limit,
      input.offset,
    ),
  );
}
