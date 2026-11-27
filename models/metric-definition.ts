import { HTTPError } from "nitro/h3";
import { createHash } from "node:crypto";
import { and, eq } from "drizzle-orm";
import { database, pool } from "@/database";
import { metricDefinition, metricAggregate } from "@/database/schema";
import {
  metricSchema,
  type MetricInput,
  type RangeInput,
} from "@/schemas/insight";
import type { Application } from "@/utils/constant";
export async function rawCreateMetricManagement(
  input: MetricInput,
  application: Application,
) {
  const [created] = await database
    .insert(metricDefinition)
    .values({ ...input, application })
    .returning();
  return created;
}
export async function rawListMetricsManagement(application: Application) {
  return database
    .select()
    .from(metricDefinition)
    .where(
      and(
        eq(metricDefinition.application, application),
        eq(metricDefinition.isActive, true),
      ),
    )
    .orderBy(metricDefinition.key)
    .limit(1000);
}
export async function rawCalculateMetricManagement(
  id: string,
  range: RangeInput,
  application: Application,
) {
  const [metric] = await database
    .select()
    .from(metricDefinition)
    .where(
      and(
        eq(metricDefinition.id, id),
        eq(metricDefinition.application, application),
        eq(metricDefinition.isActive, true),
      ),
    )
    .limit(1);
  if (!metric)
    throw new HTTPError({
      status: 404,
      message: "metric_not_found",
    });
  const configuration = metricSchema.parse({
    ...metric,
    configuration: metric.configuration,
  }).configuration;
  // Identifiers/expressions are a closed internal set. Caller data is parameterized.
  const number =
    "CASE WHEN jsonb_typeof(properties->$5::text)='number' THEN (properties->>$5::text)::numeric END";
  const aggregates: Record<string, string> = {
    count: "count(*)",
    unique: "count(DISTINCT coalesce(user_id::text,anonymous_id))",
    sum: `sum(${number})`,
    average: `avg(${number})`,
    minimum: `min(${number})`,
    maximum: `max(${number})`,
    ratio:
      "(count(*) FILTER (WHERE name=$4))::numeric / nullif(count(*) FILTER (WHERE name=$6),0)",
  };
  const aggregate = aggregates[metric.aggregation];
  if (!aggregate)
    throw new HTTPError({
      status: 422,
      message: "unsupported_metric_aggregation",
    });
  const { rows } = await pool.query(
    `SELECT coalesce(${aggregate},0)::text AS value,count(*)::int AS samples FROM analytics_event
    WHERE application=$1 AND occurred_at >= $2 AND occurred_at < $3 AND (name=$4 OR ($7::boolean AND name=$6))
    AND ($5::text IS NULL OR true)`,
    [
      application,
      range.from,
      range.to,
      metric.eventName,
      configuration.field ?? null,
      configuration.denominatorEventName ?? null,
      metric.aggregation === "ratio",
    ],
  );
  const dimensionHash = createHash("sha256").update("{}").digest("hex");
  const result = rows[0];
  const [saved] = await database
    .insert(metricAggregate)
    .values({
      metricId: id,
      periodStart: range.from,
      periodEnd: range.to,
      dimensions: {},
      dimensionHash,
      value: result.value,
      sampleCount: result.samples,
    })
    .onConflictDoUpdate({
      target: [
        metricAggregate.metricId,
        metricAggregate.periodStart,
        metricAggregate.periodEnd,
        metricAggregate.dimensionHash,
      ],
      set: {
        value: result.value,
        sampleCount: result.samples,
        calculatedAt: new Date(),
      },
    })
    .returning();
  return saved;
}
