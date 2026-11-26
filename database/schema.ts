export { httpRateLimitTable } from "@/database/http-rate-limit-schema";
import { sql } from "drizzle-orm";
import {
  boolean,
  index,
  integer,
  jsonb,
  numeric,
  pgEnum,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";

const timestampConfig = { mode: "date", withTimezone: true } as const;

export const userStatus = pgEnum("user_status", [
  "active",
  "inactive",
  "suspended",
  "deleted",
]);

export const metricAggregation = pgEnum("metric_aggregation", [
  "sum",
  "count",
  "average",
  "minimum",
  "maximum",
  "unique",
  "ratio",
]);

export const reportRunStatus = pgEnum("report_run_status", [
  "pending",
  "processing",
  "completed",
  "failed",
  "cancelled",
]);

export const auditOutcome = pgEnum("audit_outcome", [
  "success",
  "failure",
  "denied",
]);

export const moderationStatus = pgEnum("moderation_status", [
  "pending",
  "reviewing",
  "resolved",
  "dismissed",
  "appealed",
]);

export const enforcementType = pgEnum("enforcement_type", [
  "warning",
  "visibility_reduction",
  "content_removal",
  "feature_restriction",
  "suspension",
  "ban",
]);

export const riskSeverity = pgEnum("risk_severity", [
  "low",
  "medium",
  "high",
  "critical",
]);

export const riskDecisionType = pgEnum("risk_decision_type", [
  "allow",
  "review",
  "challenge",
  "restrict",
  "block",
]);

export const user = pgTable(
  "user",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    externalUserId: text("external_user_id").notNull().unique(),
    name: text("name").notNull().default(""),
    username: varchar("username", { length: 64 }),
    role: varchar("role", { length: 32 }).notNull().default("user"),
    email: varchar("email", { length: 255 }).notNull().unique(),
    image: text("image"),
    status: userStatus("status").notNull().default("active"),
    banExpires: timestamp("ban_expires", timestampConfig),
    bannedAt: timestamp("banned_at", timestampConfig),
    deletedAt: timestamp("deleted_at", timestampConfig),
    metadata: jsonb("metadata").notNull().default(sql.raw("'{}'::jsonb")),
    lastSeenAt: timestamp("last_seen_at", timestampConfig),
    syncedAt: timestamp("synced_at", timestampConfig).notNull().defaultNow(),
    createdAt: timestamp("created_at", timestampConfig).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", timestampConfig).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("user_username_lower_key").on(sql`lower(${table.username})`),
    index("user_external_user_id_idx").on(table.externalUserId),
    index("user_last_seen_at_idx").on(table.lastSeenAt),
  ],
);

export const analyticsEvent = pgTable(
  "analytics_event",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id").references(() => user.id, {
      onDelete: "set null",
    }),
    application: varchar("application", { length: 64 }).notNull(),
    name: varchar("name", { length: 128 }).notNull(),
    anonymousId: text("anonymous_id"),
    sessionId: text("session_id"),
    resourceType: varchar("resource_type", { length: 64 }),
    resourceId: text("resource_id"),
    properties: jsonb("properties").notNull().default(sql.raw("'{}'::jsonb")),
    context: jsonb("context").notNull().default(sql.raw("'{}'::jsonb")),
    idempotencyKey: text("idempotency_key"),
    occurredAt: timestamp("occurred_at", timestampConfig).notNull(),
    receivedAt: timestamp("received_at", timestampConfig)
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("analytics_event_application_idempotency_key").on(
      table.application,
      table.idempotencyKey,
    ),
    index("analytics_event_application_name_time_idx").on(
      table.application,
      table.name,
      table.occurredAt,
    ),
    index("analytics_event_user_time_idx").on(table.userId, table.occurredAt),
    index("analytics_event_resource_idx").on(
      table.application,
      table.resourceType,
      table.resourceId,
    ),
  ],
);

export const metricDefinition = pgTable(
  "metric_definition",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    application: varchar("application", { length: 64 }).notNull(),
    key: varchar("key", { length: 128 }).notNull(),
    name: varchar("name", { length: 255 }).notNull(),
    description: text("description"),
    eventName: varchar("event_name", { length: 128 }).notNull(),
    aggregation: metricAggregation("aggregation").notNull(),
    unit: varchar("unit", { length: 64 }),
    configuration: jsonb("configuration")
      .notNull()
      .default(sql.raw("'{}'::jsonb")),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at", timestampConfig).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", timestampConfig).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("metric_definition_application_key_key").on(
      table.application,
      table.key,
    ),
  ],
);

export const metricAggregate = pgTable(
  "metric_aggregate",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    metricId: uuid("metric_id")
      .notNull()
      .references(() => metricDefinition.id, { onDelete: "cascade" }),
    periodStart: timestamp("period_start", timestampConfig).notNull(),
    periodEnd: timestamp("period_end", timestampConfig).notNull(),
    dimensions: jsonb("dimensions").notNull().default(sql.raw("'{}'::jsonb")),
    dimensionHash: varchar("dimension_hash", { length: 64 }).notNull(),
    value: numeric("value", { precision: 24, scale: 8 }).notNull(),
    sampleCount: integer("sample_count").notNull().default(0),
    calculatedAt: timestamp("calculated_at", timestampConfig)
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("metric_aggregate_metric_period_dimension_key").on(
      table.metricId,
      table.periodStart,
      table.periodEnd,
      table.dimensionHash,
    ),
    index("metric_aggregate_metric_period_idx").on(
      table.metricId,
      table.periodStart,
      table.periodEnd,
    ),
  ],
);

export const funnel = pgTable(
  "funnel",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    application: varchar("application", { length: 64 }).notNull(),
    name: varchar("name", { length: 255 }).notNull(),
    description: text("description"),
    conversionWindowSeconds: integer("conversion_window_seconds")
      .notNull()
      .default(604800),
    filters: jsonb("filters").notNull().default(sql.raw("'{}'::jsonb")),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at", timestampConfig).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", timestampConfig).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("funnel_application_name_key").on(
      table.application,
      table.name,
    ),
  ],
);

export const funnelStep = pgTable(
  "funnel_step",
  {
    funnelId: uuid("funnel_id")
      .notNull()
      .references(() => funnel.id, { onDelete: "cascade" }),
    position: integer("position").notNull(),
    eventName: varchar("event_name", { length: 128 }).notNull(),
    filters: jsonb("filters").notNull().default(sql.raw("'{}'::jsonb")),
  },
  (table) => [primaryKey({ columns: [table.funnelId, table.position] })],
);

export const funnelResult = pgTable(
  "funnel_result",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    funnelId: uuid("funnel_id")
      .notNull()
      .references(() => funnel.id, { onDelete: "cascade" }),
    periodStart: timestamp("period_start", timestampConfig).notNull(),
    periodEnd: timestamp("period_end", timestampConfig).notNull(),
    stepCounts: jsonb("step_counts").notNull(),
    conversionRate: numeric("conversion_rate", { precision: 9, scale: 6 })
      .notNull()
      .default("0"),
    calculatedAt: timestamp("calculated_at", timestampConfig)
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("funnel_result_funnel_period_key").on(
      table.funnelId,
      table.periodStart,
      table.periodEnd,
    ),
  ],
);

export const retentionCohort = pgTable(
  "retention_cohort",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    application: varchar("application", { length: 64 }).notNull(),
    name: varchar("name", { length: 255 }).notNull(),
    entryEvent: varchar("entry_event", { length: 128 }).notNull(),
    returnEvent: varchar("return_event", { length: 128 }).notNull(),
    filters: jsonb("filters").notNull().default(sql.raw("'{}'::jsonb")),
    createdAt: timestamp("created_at", timestampConfig).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", timestampConfig).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("retention_cohort_application_name_key").on(
      table.application,
      table.name,
    ),
  ],
);

export const retentionMeasurement = pgTable(
  "retention_measurement",
  {
    cohortId: uuid("cohort_id")
      .notNull()
      .references(() => retentionCohort.id, { onDelete: "cascade" }),
    cohortDate: timestamp("cohort_date", timestampConfig).notNull(),
    periodNumber: integer("period_number").notNull(),
    cohortSize: integer("cohort_size").notNull(),
    retainedCount: integer("retained_count").notNull(),
    retentionRate: numeric("retention_rate", { precision: 9, scale: 6 })
      .notNull()
      .default("0"),
    calculatedAt: timestamp("calculated_at", timestampConfig)
      .notNull()
      .defaultNow(),
  },
  (table) => [
    primaryKey({
      columns: [table.cohortId, table.cohortDate, table.periodNumber],
    }),
  ],
);

export const dashboard = pgTable(
  "dashboard",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    ownerUserId: uuid("owner_user_id").references(() => user.id, {
      onDelete: "set null",
    }),
    application: varchar("application", { length: 64 }).notNull(),
    name: varchar("name", { length: 255 }).notNull(),
    description: text("description"),
    layout: jsonb("layout").notNull().default(sql.raw("'{}'::jsonb")),
    isShared: boolean("is_shared").notNull().default(false),
    createdAt: timestamp("created_at", timestampConfig).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", timestampConfig).notNull().defaultNow(),
  },
  (table) => [
    index("dashboard_application_owner_idx").on(
      table.application,
      table.ownerUserId,
    ),
  ],
);

export const dashboardWidget = pgTable(
  "dashboard_widget",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    dashboardId: uuid("dashboard_id")
      .notNull()
      .references(() => dashboard.id, { onDelete: "cascade" }),
    metricId: uuid("metric_id").references(() => metricDefinition.id, {
      onDelete: "set null",
    }),
    type: varchar("type", { length: 64 }).notNull(),
    title: varchar("title", { length: 255 }).notNull(),
    configuration: jsonb("configuration")
      .notNull()
      .default(sql.raw("'{}'::jsonb")),
    position: integer("position").notNull().default(0),
    createdAt: timestamp("created_at", timestampConfig).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", timestampConfig).notNull().defaultNow(),
  },
  (table) => [
    index("dashboard_widget_dashboard_position_idx").on(
      table.dashboardId,
      table.position,
    ),
  ],
);

export const reportDefinition = pgTable(
  "report_definition",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    application: varchar("application", { length: 64 }).notNull(),
    scopeType: varchar("scope_type", { length: 64 }).notNull(),
    name: varchar("name", { length: 255 }).notNull(),
    description: text("description"),
    query: jsonb("query").notNull(),
    schedule: varchar("schedule", { length: 128 }),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at", timestampConfig).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", timestampConfig).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("report_definition_application_name_key").on(
      table.application,
      table.name,
    ),
  ],
);

export const reportRun = pgTable(
  "report_run",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    reportId: uuid("report_id")
      .notNull()
      .references(() => reportDefinition.id, { onDelete: "cascade" }),
    requestedByUserId: uuid("requested_by_user_id").references(() => user.id, {
      onDelete: "set null",
    }),
    status: reportRunStatus("status").notNull().default("pending"),
    parameters: jsonb("parameters").notNull().default(sql.raw("'{}'::jsonb")),
    result: jsonb("result").notNull().default(sql.raw("'{}'::jsonb")),
    exportUrl: text("export_url"),
    error: text("error"),
    startedAt: timestamp("started_at", timestampConfig),
    completedAt: timestamp("completed_at", timestampConfig),
    expiresAt: timestamp("expires_at", timestampConfig),
    createdAt: timestamp("created_at", timestampConfig).notNull().defaultNow(),
  },
  (table) => [
    index("report_run_report_status_idx").on(table.reportId, table.status),
  ],
);

export const auditEvent = pgTable(
  "audit_event",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    actorUserId: uuid("actor_user_id").references(() => user.id, {
      onDelete: "set null",
    }),
    actorType: varchar("actor_type", { length: 64 }).notNull().default("user"),
    actorId: text("actor_id"),
    application: varchar("application", { length: 64 }).notNull(),
    action: varchar("action", { length: 128 }).notNull(),
    outcome: auditOutcome("outcome").notNull(),
    resourceType: varchar("resource_type", { length: 64 }),
    resourceId: text("resource_id"),
    beforeState: jsonb("before_state"),
    afterState: jsonb("after_state"),
    isSecurityEvent: boolean("is_security_event").notNull().default(false),
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
    traceId: text("trace_id"),
    metadata: jsonb("metadata").notNull().default(sql.raw("'{}'::jsonb")),
    occurredAt: timestamp("occurred_at", timestampConfig)
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("audit_event_application_time_idx").on(
      table.application,
      table.occurredAt,
    ),
    index("audit_event_actor_time_idx").on(table.actorUserId, table.occurredAt),
    index("audit_event_resource_idx").on(
      table.application,
      table.resourceType,
      table.resourceId,
    ),
    index("audit_event_security_time_idx").on(
      table.isSecurityEvent,
      table.occurredAt,
    ),
  ],
);

export const moderationPolicy = pgTable(
  "moderation_policy",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    application: varchar("application", { length: 64 }).notNull(),
    key: varchar("key", { length: 128 }).notNull(),
    name: varchar("name", { length: 255 }).notNull(),
    description: text("description"),
    severity: riskSeverity("severity").notNull(),
    rules: jsonb("rules").notNull().default(sql.raw("'{}'::jsonb")),
    version: integer("version").notNull().default(1),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at", timestampConfig).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", timestampConfig).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("moderation_policy_application_key_version_key").on(
      table.application,
      table.key,
      table.version,
    ),
  ],
);

export const moderationReport = pgTable(
  "moderation_report",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    reporterUserId: uuid("reporter_user_id").references(() => user.id, {
      onDelete: "set null",
    }),
    application: varchar("application", { length: 64 }).notNull(),
    resourceType: varchar("resource_type", { length: 64 }).notNull(),
    resourceId: text("resource_id").notNull(),
    reason: varchar("reason", { length: 128 }).notNull(),
    details: text("details"),
    status: moderationStatus("status").notNull().default("pending"),
    priority: riskSeverity("priority").notNull().default("medium"),
    evidence: jsonb("evidence").notNull().default(sql.raw("'[]'::jsonb")),
    assignedToUserId: uuid("assigned_to_user_id").references(() => user.id, {
      onDelete: "set null",
    }),
    resolvedAt: timestamp("resolved_at", timestampConfig),
    createdAt: timestamp("created_at", timestampConfig).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", timestampConfig).notNull().defaultNow(),
  },
  (table) => [
    index("moderation_report_status_priority_idx").on(
      table.status,
      table.priority,
      table.createdAt,
    ),
    index("moderation_report_resource_idx").on(
      table.application,
      table.resourceType,
      table.resourceId,
    ),
  ],
);

export const contentReview = pgTable(
  "content_review",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    reportId: uuid("report_id").references(() => moderationReport.id, {
      onDelete: "set null",
    }),
    reviewerUserId: uuid("reviewer_user_id").references(() => user.id, {
      onDelete: "set null",
    }),
    application: varchar("application", { length: 64 }).notNull(),
    resourceType: varchar("resource_type", { length: 64 }).notNull(),
    resourceId: text("resource_id").notNull(),
    status: moderationStatus("status").notNull().default("reviewing"),
    decision: text("decision"),
    notes: text("notes"),
    signals: jsonb("signals").notNull().default(sql.raw("'[]'::jsonb")),
    reviewedAt: timestamp("reviewed_at", timestampConfig),
    createdAt: timestamp("created_at", timestampConfig).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", timestampConfig).notNull().defaultNow(),
  },
  (table) => [
    index("content_review_resource_status_idx").on(
      table.application,
      table.resourceType,
      table.resourceId,
      table.status,
    ),
  ],
);

export const violation = pgTable(
  "violation",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    reviewId: uuid("review_id")
      .notNull()
      .references(() => contentReview.id, { onDelete: "cascade" }),
    policyId: uuid("policy_id")
      .notNull()
      .references(() => moderationPolicy.id, { onDelete: "restrict" }),
    severity: riskSeverity("severity").notNull(),
    evidence: jsonb("evidence").notNull().default(sql.raw("'{}'::jsonb")),
    createdAt: timestamp("created_at", timestampConfig).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("violation_review_policy_key").on(
      table.reviewId,
      table.policyId,
    ),
  ],
);

export const enforcement = pgTable(
  "enforcement",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    violationId: uuid("violation_id").references(() => violation.id, {
      onDelete: "set null",
    }),
    targetUserId: uuid("target_user_id").references(() => user.id, {
      onDelete: "set null",
    }),
    application: varchar("application", { length: 64 }).notNull(),
    resourceType: varchar("resource_type", { length: 64 }),
    resourceId: text("resource_id"),
    type: enforcementType("type").notNull(),
    reason: text("reason").notNull(),
    startsAt: timestamp("starts_at", timestampConfig).notNull().defaultNow(),
    expiresAt: timestamp("expires_at", timestampConfig),
    revokedAt: timestamp("revoked_at", timestampConfig),
    createdAt: timestamp("created_at", timestampConfig).notNull().defaultNow(),
  },
  (table) => [
    index("enforcement_target_active_idx").on(
      table.targetUserId,
      table.expiresAt,
      table.revokedAt,
    ),
  ],
);

export const moderationAppeal = pgTable(
  "moderation_appeal",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    enforcementId: uuid("enforcement_id")
      .notNull()
      .references(() => enforcement.id, { onDelete: "cascade" }),
    appellantUserId: uuid("appellant_user_id").references(() => user.id, {
      onDelete: "set null",
    }),
    reviewerUserId: uuid("reviewer_user_id").references(() => user.id, {
      onDelete: "set null",
    }),
    reason: text("reason").notNull(),
    status: moderationStatus("status").notNull().default("pending"),
    resolution: text("resolution"),
    resolvedAt: timestamp("resolved_at", timestampConfig),
    createdAt: timestamp("created_at", timestampConfig).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", timestampConfig).notNull().defaultNow(),
  },
  (table) => [
    index("moderation_appeal_status_created_at_idx").on(
      table.status,
      table.createdAt,
    ),
  ],
);

export const moderationHistory = pgTable(
  "moderation_history",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    actorUserId: uuid("actor_user_id").references(() => user.id, {
      onDelete: "set null",
    }),
    targetType: varchar("target_type", { length: 64 }).notNull(),
    targetId: text("target_id").notNull(),
    action: varchar("action", { length: 128 }).notNull(),
    fromStatus: varchar("from_status", { length: 64 }),
    toStatus: varchar("to_status", { length: 64 }),
    details: jsonb("details").notNull().default(sql.raw("'{}'::jsonb")),
    createdAt: timestamp("created_at", timestampConfig).notNull().defaultNow(),
  },
  (table) => [
    index("moderation_history_target_created_at_idx").on(
      table.targetType,
      table.targetId,
      table.createdAt,
    ),
  ],
);

export const riskRule = pgTable(
  "risk_rule",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    application: varchar("application", { length: 64 }).notNull(),
    key: varchar("key", { length: 128 }).notNull(),
    name: varchar("name", { length: 255 }).notNull(),
    category: varchar("category", { length: 64 }).notNull(),
    severity: riskSeverity("severity").notNull(),
    condition: jsonb("condition").notNull(),
    weight: numeric("weight", { precision: 9, scale: 6 })
      .notNull()
      .default("1"),
    isActive: boolean("is_active").notNull().default(true),
    version: integer("version").notNull().default(1),
    createdAt: timestamp("created_at", timestampConfig).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", timestampConfig).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("risk_rule_application_key_version_key").on(
      table.application,
      table.key,
      table.version,
    ),
  ],
);

export const riskSignal = pgTable(
  "risk_signal",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id").references(() => user.id, {
      onDelete: "set null",
    }),
    ruleId: uuid("rule_id").references(() => riskRule.id, {
      onDelete: "set null",
    }),
    application: varchar("application", { length: 64 }).notNull(),
    category: varchar("category", { length: 64 }).notNull(),
    severity: riskSeverity("severity").notNull(),
    resourceType: varchar("resource_type", { length: 64 }),
    resourceId: text("resource_id"),
    value: numeric("value", { precision: 16, scale: 6 }),
    evidence: jsonb("evidence").notNull().default(sql.raw("'{}'::jsonb")),
    detectedAt: timestamp("detected_at", timestampConfig)
      .notNull()
      .defaultNow(),
    expiresAt: timestamp("expires_at", timestampConfig),
  },
  (table) => [
    index("risk_signal_user_detected_at_idx").on(
      table.userId,
      table.detectedAt,
    ),
    index("risk_signal_resource_idx").on(
      table.application,
      table.resourceType,
      table.resourceId,
    ),
  ],
);

export const riskAssessment = pgTable(
  "risk_assessment",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id").references(() => user.id, {
      onDelete: "set null",
    }),
    application: varchar("application", { length: 64 }).notNull(),
    subjectType: varchar("subject_type", { length: 64 }).notNull(),
    subjectId: text("subject_id").notNull(),
    score: numeric("score", { precision: 9, scale: 6 }).notNull(),
    severity: riskSeverity("severity").notNull(),
    signalIds: uuid("signal_ids").array().notNull(),
    context: jsonb("context").notNull().default(sql.raw("'{}'::jsonb")),
    assessedAt: timestamp("assessed_at", timestampConfig)
      .notNull()
      .defaultNow(),
    expiresAt: timestamp("expires_at", timestampConfig),
  },
  (table) => [
    index("risk_assessment_subject_time_idx").on(
      table.application,
      table.subjectType,
      table.subjectId,
      table.assessedAt,
    ),
  ],
);

export const riskDecision = pgTable(
  "risk_decision",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    assessmentId: uuid("assessment_id")
      .notNull()
      .references(() => riskAssessment.id, { onDelete: "cascade" }),
    decidedByUserId: uuid("decided_by_user_id").references(() => user.id, {
      onDelete: "set null",
    }),
    decision: riskDecisionType("decision").notNull(),
    reason: text("reason"),
    automated: boolean("automated").notNull().default(true),
    metadata: jsonb("metadata").notNull().default(sql.raw("'{}'::jsonb")),
    createdAt: timestamp("created_at", timestampConfig).notNull().defaultNow(),
  },
  (table) => [
    index("risk_decision_assessment_created_at_idx").on(
      table.assessmentId,
      table.createdAt,
    ),
  ],
);

export const riskHistory = pgTable(
  "risk_history",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    subjectType: varchar("subject_type", { length: 64 }).notNull(),
    subjectId: text("subject_id").notNull(),
    eventType: varchar("event_type", { length: 128 }).notNull(),
    previousScore: numeric("previous_score", { precision: 9, scale: 6 }),
    currentScore: numeric("current_score", { precision: 9, scale: 6 }),
    details: jsonb("details").notNull().default(sql.raw("'{}'::jsonb")),
    createdAt: timestamp("created_at", timestampConfig).notNull().defaultNow(),
  },
  (table) => [
    index("risk_history_subject_created_at_idx").on(
      table.subjectType,
      table.subjectId,
      table.createdAt,
    ),
  ],
);

export type User = typeof user.$inferSelect;
export type AnalyticsEvent = typeof analyticsEvent.$inferSelect;
export type MetricDefinition = typeof metricDefinition.$inferSelect;
export type MetricAggregate = typeof metricAggregate.$inferSelect;
export type Funnel = typeof funnel.$inferSelect;
export type FunnelStep = typeof funnelStep.$inferSelect;
export type FunnelResult = typeof funnelResult.$inferSelect;
export type RetentionCohort = typeof retentionCohort.$inferSelect;
export type RetentionMeasurement = typeof retentionMeasurement.$inferSelect;
export type Dashboard = typeof dashboard.$inferSelect;
export type DashboardWidget = typeof dashboardWidget.$inferSelect;
export type ReportDefinition = typeof reportDefinition.$inferSelect;
export type ReportRun = typeof reportRun.$inferSelect;
export type AuditEvent = typeof auditEvent.$inferSelect;
export type ModerationPolicy = typeof moderationPolicy.$inferSelect;
export type ModerationReport = typeof moderationReport.$inferSelect;
export type ContentReview = typeof contentReview.$inferSelect;
export type Violation = typeof violation.$inferSelect;
export type Enforcement = typeof enforcement.$inferSelect;
export type ModerationAppeal = typeof moderationAppeal.$inferSelect;
export type ModerationHistory = typeof moderationHistory.$inferSelect;
export type RiskRule = typeof riskRule.$inferSelect;
export type RiskSignal = typeof riskSignal.$inferSelect;
export type RiskAssessment = typeof riskAssessment.$inferSelect;
export type RiskDecision = typeof riskDecision.$inferSelect;
export type RiskHistory = typeof riskHistory.$inferSelect;
