import { and, count, desc, eq, sql } from "drizzle-orm"
import { database } from "@/database"
import { auditEvent, analyticsEvent } from "@/database/schema"
import { type Application } from "@/utils/constant"
import { type AuditInput, type PageInput } from "@/schemas/insight"
import { sanitizeInsightData } from "@/utils/privacy"
import { rawRecordEvent } from "@/models/analytics-event"
import { type taskEventSchema } from "@/schemas/task"
import { type z } from "@gorth-com/structure/cores/zod"
import { rawRequireUserManagement } from "@/models/user"
import { page } from "@/services/query"

export async function rawRecordTaskEvent(input: z.infer<typeof taskEventSchema>) {
  const { actorExternalUserId, ...event } = input;
  const result = await rawRecordEvent(
    event,
    "task",
    actorExternalUserId ?? "task-worker",
  );
  await database
    .insert(auditEvent)
    .values({
      id: input.idempotencyKey,
      application: "task",
      actorType: actorExternalUserId ? "user" : "service",
      actorId: actorExternalUserId ?? "task-worker",
      action: input.name,
      occurredAt: input.occurredAt,
      outcome: "success",
      resourceType: input.resourceType,
      resourceId: input.resourceId,
      metadata: sanitizeInsightData(input.properties),
    })
    .onConflictDoNothing();
  return result;
}

export async function rawTaskWorkspaceActivity(
  workspaceId: string,
  limit: number,
  offset: number,
) {
  const where = and(
    eq(auditEvent.application, "task"),
    sql`${auditEvent.metadata}->>'workspaceId' = ${workspaceId}`,
  );
  const data = await database
    .select({
      id: auditEvent.id,
      action: auditEvent.action,
      outcome: auditEvent.outcome,
      occurredAt: auditEvent.occurredAt,
      resourceId: auditEvent.resourceId,
    })
    .from(auditEvent)
    .where(where)
    .orderBy(desc(auditEvent.occurredAt), auditEvent.id)
    .limit(limit)
    .offset(offset);
  return {
    data,
    pagination: { limit, offset, hasMore: data.length === limit },
  };
}

export async function rawRecordAuditManagement(
  input: AuditInput,
  application: Application,
  subject: string,
) {
  const actor = await rawRequireUserManagement(subject);
  const [created] = await database
    .insert(auditEvent)
    .values({
      ...input,
      beforeState: input.beforeState
        ? sanitizeInsightData(input.beforeState)
        : undefined,
      afterState: input.afterState
        ? sanitizeInsightData(input.afterState)
        : undefined,
      metadata: sanitizeInsightData(input.metadata),
      actorUserId: actor.id,
      actorId: subject,
      application,
    })
    .returning();
  return created;
}

export async function rawListAuditManagement(input: PageInput, application: Application) {
  const where = and(
    eq(auditEvent.application, application),
    input.name ? eq(auditEvent.action, input.name) : undefined,
  );
  const [data, totals] = await Promise.all([
    database
      .select()
      .from(auditEvent)
      .where(where)
      .orderBy(desc(auditEvent.occurredAt), desc(auditEvent.id))
      .limit(input.limit)
      .offset(input.offset),
    database.select({ total: count() }).from(auditEvent).where(where),
  ]);
  return page(data, Number(totals[0]?.total ?? 0), input);
}
