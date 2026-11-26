import { readRequestBody } from "@/utils/request";
import type { ApiContext } from "@/types/auth";
import { taskEventSchema, taskActivitySchema } from "@/schemas/task";
import {
  rawRecordTaskEvent as recordTaskEventServices,
  rawTaskWorkspaceActivity as taskWorkspaceActivityServices,
} from "@/models/audit-event";
export async function actRecordTaskEvent(event: ApiContext) {
  return event.json(
    await recordTaskEventServices(
      taskEventSchema.parse(await readRequestBody(event.req)),
    ),
    { status: 201 },
  );
}
export async function actTaskWorkspaceActivity(event: ApiContext) {
  const input = taskActivitySchema.parse(await readRequestBody(event.req));
  return event.json(
    await taskWorkspaceActivityServices(
      input.workspaceId,
      input.limit,
      input.offset,
    ),
  );
}
