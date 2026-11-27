import { HTTPError } from "nitro/h3"
import { and, count, desc, eq } from "drizzle-orm"
import { database, pool } from "@/database"
import { analyticsEvent } from "@/database/schema"
import { type Application } from "@/utils/constant"
import { type EventInput, type PageInput, type RangeInput } from "@/schemas/insight"
import { sanitizeInsightData } from "@/utils/privacy"
import { page } from "@/services/query"

export async function rawRecordEvent(
  input: EventInput,
  application: Application,
  subject: string,
) {
  const [created] = await database
    .insert(analyticsEvent)
    .values({
      ...input,
      properties: sanitizeInsightData(input.properties),
      application,
      anonymousId: subject,
    })
    .onConflictDoNothing()
    .returning();
  if (created) return created;
  const [existing] = await database
    .select()
    .from(analyticsEvent)
    .where(
      and(
        eq(analyticsEvent.application, application),
        eq(analyticsEvent.idempotencyKey, input.idempotencyKey),
      ),
    )
    .limit(1);
  if (!existing || existing.anonymousId !== subject)
    throw new HTTPError({
      status: 409,
      message: "event_conflict",
    });
  return existing;
}

export async function rawListMyEvents(input: PageInput, application: Application, subject: string) {
  const where = and(eq(analyticsEvent.application, application), eq(analyticsEvent.anonymousId, subject), input.name ? eq(analyticsEvent.name, input.name) : undefined)
  const [data, totals] = await Promise.all([
    database.select().from(analyticsEvent).where(where).orderBy(desc(analyticsEvent.occurredAt), desc(analyticsEvent.id)).limit(input.limit).offset(input.offset),
    database.select({ total: count() }).from(analyticsEvent).where(where),
  ])
  return page(data, Number(totals[0]?.total ?? 0), input)
}

export async function rawListEventsManagement(input: PageInput, application: Application) {
  const where = and(
    eq(analyticsEvent.application, application),
    input.name ? eq(analyticsEvent.name, input.name) : undefined,
  );
  const [data, totals] = await Promise.all([
    database
      .select()
      .from(analyticsEvent)
      .where(where)
      .orderBy(desc(analyticsEvent.occurredAt), desc(analyticsEvent.id))
      .limit(input.limit)
      .offset(input.offset),
    database.select({ total: count() }).from(analyticsEvent).where(where),
  ]);
  return page(data, Number(totals[0]?.total ?? 0), input);
}

export async function rawAnalyticsSummaryManagement(
  input: RangeInput,
  application: Application,
) {
  const { rows } = await pool.query(
    `SELECT name, date_trunc('day',occurred_at AT TIME ZONE 'UTC') AS day,
    count(*)::int AS events, count(DISTINCT coalesce(user_id::text, anonymous_id))::int AS users
    FROM analytics_event WHERE application=$1 AND occurred_at >= $2 AND occurred_at < $3
    AND ($4::text IS NULL OR name=$4) GROUP BY name,day ORDER BY day,name`,
    [application, input.from, input.to, input.name ?? null],
  );
  return { data: rows, from: input.from, to: input.to, timezone: "UTC" };
}
