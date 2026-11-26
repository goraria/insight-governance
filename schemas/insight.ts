import { z } from "@gorth-com/structure/cores/zod";

const key = z.string().trim().min(1).max(128);
const json = z.record(z.string(), z.unknown());
const target = z.object({
  resourceType: key.max(64),
  resourceId: key.max(512),
});
export const idSchema = z.uuid();
export const pageSchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(20),
  offset: z.coerce.number().int().min(0).max(100_000).default(0),
  name: key.optional(),
  status: z
    .enum(["pending", "reviewing", "resolved", "dismissed", "appealed"])
    .optional(),
});
export const rangeSchema = z
  .object({
    from: z.coerce.date(),
    to: z.coerce.date(),
    name: key.optional(),
  })
  .refine(
    (input) =>
      input.to > input.from &&
      input.to.getTime() - input.from.getTime() <= 93 * 86_400_000,
    { message: "invalid_time_range" },
  );
export const eventSchema = target
  .partial()
  .extend({
    name: key,
    idempotencyKey: key.max(255),
    properties: json.default({}),
    occurredAt: z.coerce.date().default(() => new Date()),
  })
  .refine(
    (input) =>
      input.occurredAt.getTime() <= Date.now() + 60_000 &&
      input.occurredAt.getTime() >= Date.now() - 31 * 86_400_000,
    { message: "invalid_event_time" },
  );
export const auditSchema = target.partial().extend({
  action: key,
  outcome: z.enum(["success", "failure", "denied"]),
  beforeState: json.optional(),
  afterState: json.optional(),
  metadata: json.default({}),
});
export const reportSchema = target.extend({
  reason: key,
  details: z.string().max(10_000).optional(),
});
export const reviewSchema = z.object({
  status: z.enum(["reviewing", "resolved", "dismissed"]),
  decision: z.string().trim().min(1).max(2000),
});
export const enforcementSchema = target
  .extend({
    targetUserId: z.uuid().optional(),
    type: z.enum([
      "warning",
      "visibility_reduction",
      "content_removal",
      "feature_restriction",
      "suspension",
      "ban",
    ]),
    reason: z.string().trim().min(1).max(2000),
    expiresAt: z.coerce.date().optional(),
  })
  .refine((input) => !input.expiresAt || input.expiresAt > new Date(), {
    message: "enforcement_already_expired",
  });
export const appealSchema = z.object({
  reason: z.string().trim().min(1).max(2000),
});
export const appealDecisionSchema = z.object({
  accepted: z.boolean(),
  resolution: z.string().trim().min(1).max(2000),
});
export const conditionSchema = z.object({
  field: key,
  operator: z.enum(["gt", "gte", "lt", "lte", "eq"]),
  value: z.number().finite(),
});
export const ruleSchema = z.object({
  key,
  name: key.max(255),
  category: key.max(64),
  severity: z.enum(["low", "medium", "high", "critical"]),
  condition: conditionSchema,
  weight: z.number().finite().min(0).max(100).default(1),
  version: z.number().int().min(1).default(1),
});
export const assessmentSchema = z.object({
  subjectType: key.max(64),
  subjectId: key.max(512),
  values: z.record(z.string(), z.number().finite()),
});
export type PageInput = z.infer<typeof pageSchema>;
export type RangeInput = z.infer<typeof rangeSchema>;
export type EventInput = z.infer<typeof eventSchema>;
export type AuditInput = z.infer<typeof auditSchema>;
export type ReportInput = z.infer<typeof reportSchema>;
export type ReviewInput = z.infer<typeof reviewSchema>;
export type EnforcementInput = z.infer<typeof enforcementSchema>;
export type RuleInput = z.infer<typeof ruleSchema>;
export type AssessmentInput = z.infer<typeof assessmentSchema>;

export const metricSchema = z
  .object({
    key,
    name: key.max(255),
    eventName: key,
    aggregation: z.enum([
      "count",
      "sum",
      "average",
      "minimum",
      "maximum",
      "unique",
      "ratio",
    ]),
    configuration: z
      .object({ field: key.optional(), denominatorEventName: key.optional() })
      .default({}),
  })
  .refine(
    (input) =>
      !["sum", "average", "minimum", "maximum"].includes(input.aggregation) ||
      !!input.configuration.field,
    { message: "numeric_field_required" },
  )
  .refine(
    (input) =>
      input.aggregation !== "ratio" ||
      !!input.configuration.denominatorEventName,
    { message: "denominator_event_required" },
  );
export type MetricInput = z.infer<typeof metricSchema>;
