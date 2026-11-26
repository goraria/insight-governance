CREATE TYPE "audit_outcome" AS ENUM('success', 'failure', 'denied');--> statement-breakpoint
CREATE TYPE "enforcement_type" AS ENUM('warning', 'visibility_reduction', 'content_removal', 'feature_restriction', 'suspension', 'ban');--> statement-breakpoint
CREATE TYPE "metric_aggregation" AS ENUM('sum', 'count', 'average', 'minimum', 'maximum', 'unique', 'ratio');--> statement-breakpoint
CREATE TYPE "moderation_status" AS ENUM('pending', 'reviewing', 'resolved', 'dismissed', 'appealed');--> statement-breakpoint
CREATE TYPE "report_run_status" AS ENUM('pending', 'processing', 'completed', 'failed', 'cancelled');--> statement-breakpoint
CREATE TYPE "risk_decision_type" AS ENUM('allow', 'review', 'challenge', 'restrict', 'block');--> statement-breakpoint
CREATE TYPE "risk_severity" AS ENUM('low', 'medium', 'high', 'critical');--> statement-breakpoint
CREATE TYPE "user_status" AS ENUM('active', 'inactive', 'suspended', 'deleted');--> statement-breakpoint
CREATE TABLE "analytics_event" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"user_id" uuid,
	"application" varchar(64) NOT NULL,
	"name" varchar(128) NOT NULL,
	"anonymous_id" text,
	"session_id" text,
	"resource_type" varchar(64),
	"resource_id" text,
	"properties" jsonb DEFAULT '{}' NOT NULL,
	"context" jsonb DEFAULT '{}' NOT NULL,
	"idempotency_key" text,
	"occurred_at" timestamp with time zone NOT NULL,
	"received_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "audit_event" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"actor_user_id" uuid,
	"actor_type" varchar(64) DEFAULT 'user' NOT NULL,
	"actor_id" text,
	"application" varchar(64) NOT NULL,
	"action" varchar(128) NOT NULL,
	"outcome" "audit_outcome" NOT NULL,
	"resource_type" varchar(64),
	"resource_id" text,
	"before_state" jsonb,
	"after_state" jsonb,
	"is_security_event" boolean DEFAULT false NOT NULL,
	"ip_address" text,
	"user_agent" text,
	"trace_id" text,
	"metadata" jsonb DEFAULT '{}' NOT NULL,
	"occurred_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "content_review" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"report_id" uuid,
	"reviewer_user_id" uuid,
	"application" varchar(64) NOT NULL,
	"resource_type" varchar(64) NOT NULL,
	"resource_id" text NOT NULL,
	"status" "moderation_status" DEFAULT 'reviewing'::"moderation_status" NOT NULL,
	"decision" text,
	"notes" text,
	"signals" jsonb DEFAULT '[]' NOT NULL,
	"reviewed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "dashboard" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"owner_user_id" uuid,
	"application" varchar(64) NOT NULL,
	"name" varchar(255) NOT NULL,
	"description" text,
	"layout" jsonb DEFAULT '{}' NOT NULL,
	"is_shared" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "dashboard_widget" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"dashboard_id" uuid NOT NULL,
	"metric_id" uuid,
	"type" varchar(64) NOT NULL,
	"title" varchar(255) NOT NULL,
	"configuration" jsonb DEFAULT '{}' NOT NULL,
	"position" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "enforcement" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"violation_id" uuid,
	"target_user_id" uuid,
	"application" varchar(64) NOT NULL,
	"resource_type" varchar(64),
	"resource_id" text,
	"type" "enforcement_type" NOT NULL,
	"reason" text NOT NULL,
	"starts_at" timestamp with time zone DEFAULT now() NOT NULL,
	"expires_at" timestamp with time zone,
	"revoked_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "funnel" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"application" varchar(64) NOT NULL,
	"name" varchar(255) NOT NULL,
	"description" text,
	"conversion_window_seconds" integer DEFAULT 604800 NOT NULL,
	"filters" jsonb DEFAULT '{}' NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "funnel_result" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"funnel_id" uuid NOT NULL,
	"period_start" timestamp with time zone NOT NULL,
	"period_end" timestamp with time zone NOT NULL,
	"step_counts" jsonb NOT NULL,
	"conversion_rate" numeric(9,6) DEFAULT '0' NOT NULL,
	"calculated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "funnel_step" (
	"funnel_id" uuid,
	"position" integer,
	"event_name" varchar(128) NOT NULL,
	"filters" jsonb DEFAULT '{}' NOT NULL,
	CONSTRAINT "funnel_step_pkey" PRIMARY KEY("funnel_id","position")
);
--> statement-breakpoint
CREATE TABLE "metric_aggregate" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"metric_id" uuid NOT NULL,
	"period_start" timestamp with time zone NOT NULL,
	"period_end" timestamp with time zone NOT NULL,
	"dimensions" jsonb DEFAULT '{}' NOT NULL,
	"dimension_hash" varchar(64) NOT NULL,
	"value" numeric(24,8) NOT NULL,
	"sample_count" integer DEFAULT 0 NOT NULL,
	"calculated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "metric_definition" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"application" varchar(64) NOT NULL,
	"key" varchar(128) NOT NULL,
	"name" varchar(255) NOT NULL,
	"description" text,
	"event_name" varchar(128) NOT NULL,
	"aggregation" "metric_aggregation" NOT NULL,
	"unit" varchar(64),
	"configuration" jsonb DEFAULT '{}' NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "moderation_appeal" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"enforcement_id" uuid NOT NULL,
	"appellant_user_id" uuid,
	"reviewer_user_id" uuid,
	"reason" text NOT NULL,
	"status" "moderation_status" DEFAULT 'pending'::"moderation_status" NOT NULL,
	"resolution" text,
	"resolved_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "moderation_history" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"actor_user_id" uuid,
	"target_type" varchar(64) NOT NULL,
	"target_id" text NOT NULL,
	"action" varchar(128) NOT NULL,
	"from_status" varchar(64),
	"to_status" varchar(64),
	"details" jsonb DEFAULT '{}' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "moderation_policy" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"application" varchar(64) NOT NULL,
	"key" varchar(128) NOT NULL,
	"name" varchar(255) NOT NULL,
	"description" text,
	"severity" "risk_severity" NOT NULL,
	"rules" jsonb DEFAULT '{}' NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "moderation_report" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"reporter_user_id" uuid,
	"application" varchar(64) NOT NULL,
	"resource_type" varchar(64) NOT NULL,
	"resource_id" text NOT NULL,
	"reason" varchar(128) NOT NULL,
	"details" text,
	"status" "moderation_status" DEFAULT 'pending'::"moderation_status" NOT NULL,
	"priority" "risk_severity" DEFAULT 'medium'::"risk_severity" NOT NULL,
	"evidence" jsonb DEFAULT '[]' NOT NULL,
	"assigned_to_user_id" uuid,
	"resolved_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "report_definition" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"application" varchar(64) NOT NULL,
	"scope_type" varchar(64) NOT NULL,
	"name" varchar(255) NOT NULL,
	"description" text,
	"query" jsonb NOT NULL,
	"schedule" varchar(128),
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "report_run" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"report_id" uuid NOT NULL,
	"requested_by_user_id" uuid,
	"status" "report_run_status" DEFAULT 'pending'::"report_run_status" NOT NULL,
	"parameters" jsonb DEFAULT '{}' NOT NULL,
	"result" jsonb DEFAULT '{}' NOT NULL,
	"export_url" text,
	"error" text,
	"started_at" timestamp with time zone,
	"completed_at" timestamp with time zone,
	"expires_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "retention_cohort" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"application" varchar(64) NOT NULL,
	"name" varchar(255) NOT NULL,
	"entry_event" varchar(128) NOT NULL,
	"return_event" varchar(128) NOT NULL,
	"filters" jsonb DEFAULT '{}' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "retention_measurement" (
	"cohort_id" uuid,
	"cohort_date" timestamp with time zone,
	"period_number" integer,
	"cohort_size" integer NOT NULL,
	"retained_count" integer NOT NULL,
	"retention_rate" numeric(9,6) DEFAULT '0' NOT NULL,
	"calculated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "retention_measurement_pkey" PRIMARY KEY("cohort_id","cohort_date","period_number")
);
--> statement-breakpoint
CREATE TABLE "risk_assessment" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"user_id" uuid,
	"application" varchar(64) NOT NULL,
	"subject_type" varchar(64) NOT NULL,
	"subject_id" text NOT NULL,
	"score" numeric(9,6) NOT NULL,
	"severity" "risk_severity" NOT NULL,
	"signal_ids" uuid[] NOT NULL,
	"context" jsonb DEFAULT '{}' NOT NULL,
	"assessed_at" timestamp with time zone DEFAULT now() NOT NULL,
	"expires_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "risk_decision" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"assessment_id" uuid NOT NULL,
	"decided_by_user_id" uuid,
	"decision" "risk_decision_type" NOT NULL,
	"reason" text,
	"automated" boolean DEFAULT true NOT NULL,
	"metadata" jsonb DEFAULT '{}' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "risk_history" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"subject_type" varchar(64) NOT NULL,
	"subject_id" text NOT NULL,
	"event_type" varchar(128) NOT NULL,
	"previous_score" numeric(9,6),
	"current_score" numeric(9,6),
	"details" jsonb DEFAULT '{}' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "risk_rule" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"application" varchar(64) NOT NULL,
	"key" varchar(128) NOT NULL,
	"name" varchar(255) NOT NULL,
	"category" varchar(64) NOT NULL,
	"severity" "risk_severity" NOT NULL,
	"condition" jsonb NOT NULL,
	"weight" numeric(9,6) DEFAULT '1' NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "risk_signal" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"user_id" uuid,
	"rule_id" uuid,
	"application" varchar(64) NOT NULL,
	"category" varchar(64) NOT NULL,
	"severity" "risk_severity" NOT NULL,
	"resource_type" varchar(64),
	"resource_id" text,
	"value" numeric(16,6),
	"evidence" jsonb DEFAULT '{}' NOT NULL,
	"detected_at" timestamp with time zone DEFAULT now() NOT NULL,
	"expires_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "user" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"external_user_id" text NOT NULL UNIQUE,
	"name" text DEFAULT '' NOT NULL,
	"username" varchar(64),
	"role" varchar(32) DEFAULT 'user' NOT NULL,
	"email" varchar(255) NOT NULL UNIQUE,
	"image" text,
	"status" "user_status" DEFAULT 'active'::"user_status" NOT NULL,
	"ban_expires" timestamp with time zone,
	"banned_at" timestamp with time zone,
	"deleted_at" timestamp with time zone,
	"metadata" jsonb DEFAULT '{}' NOT NULL,
	"last_seen_at" timestamp with time zone,
	"synced_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "violation" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"review_id" uuid NOT NULL,
	"policy_id" uuid NOT NULL,
	"severity" "risk_severity" NOT NULL,
	"evidence" jsonb DEFAULT '{}' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX "analytics_event_application_idempotency_key" ON "analytics_event" ("application","idempotency_key");--> statement-breakpoint
CREATE INDEX "analytics_event_application_name_time_idx" ON "analytics_event" ("application","name","occurred_at");--> statement-breakpoint
CREATE INDEX "analytics_event_user_time_idx" ON "analytics_event" ("user_id","occurred_at");--> statement-breakpoint
CREATE INDEX "analytics_event_resource_idx" ON "analytics_event" ("application","resource_type","resource_id");--> statement-breakpoint
CREATE INDEX "audit_event_application_time_idx" ON "audit_event" ("application","occurred_at");--> statement-breakpoint
CREATE INDEX "audit_event_actor_time_idx" ON "audit_event" ("actor_user_id","occurred_at");--> statement-breakpoint
CREATE INDEX "audit_event_resource_idx" ON "audit_event" ("application","resource_type","resource_id");--> statement-breakpoint
CREATE INDEX "audit_event_security_time_idx" ON "audit_event" ("is_security_event","occurred_at");--> statement-breakpoint
CREATE INDEX "content_review_resource_status_idx" ON "content_review" ("application","resource_type","resource_id","status");--> statement-breakpoint
CREATE INDEX "dashboard_application_owner_idx" ON "dashboard" ("application","owner_user_id");--> statement-breakpoint
CREATE INDEX "dashboard_widget_dashboard_position_idx" ON "dashboard_widget" ("dashboard_id","position");--> statement-breakpoint
CREATE INDEX "enforcement_target_active_idx" ON "enforcement" ("target_user_id","expires_at","revoked_at");--> statement-breakpoint
CREATE UNIQUE INDEX "funnel_application_name_key" ON "funnel" ("application","name");--> statement-breakpoint
CREATE UNIQUE INDEX "funnel_result_funnel_period_key" ON "funnel_result" ("funnel_id","period_start","period_end");--> statement-breakpoint
CREATE UNIQUE INDEX "metric_aggregate_metric_period_dimension_key" ON "metric_aggregate" ("metric_id","period_start","period_end","dimension_hash");--> statement-breakpoint
CREATE INDEX "metric_aggregate_metric_period_idx" ON "metric_aggregate" ("metric_id","period_start","period_end");--> statement-breakpoint
CREATE UNIQUE INDEX "metric_definition_application_key_key" ON "metric_definition" ("application","key");--> statement-breakpoint
CREATE INDEX "moderation_appeal_status_created_at_idx" ON "moderation_appeal" ("status","created_at");--> statement-breakpoint
CREATE INDEX "moderation_history_target_created_at_idx" ON "moderation_history" ("target_type","target_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "moderation_policy_application_key_version_key" ON "moderation_policy" ("application","key","version");--> statement-breakpoint
CREATE INDEX "moderation_report_status_priority_idx" ON "moderation_report" ("status","priority","created_at");--> statement-breakpoint
CREATE INDEX "moderation_report_resource_idx" ON "moderation_report" ("application","resource_type","resource_id");--> statement-breakpoint
CREATE UNIQUE INDEX "report_definition_application_name_key" ON "report_definition" ("application","name");--> statement-breakpoint
CREATE INDEX "report_run_report_status_idx" ON "report_run" ("report_id","status");--> statement-breakpoint
CREATE UNIQUE INDEX "retention_cohort_application_name_key" ON "retention_cohort" ("application","name");--> statement-breakpoint
CREATE INDEX "risk_assessment_subject_time_idx" ON "risk_assessment" ("application","subject_type","subject_id","assessed_at");--> statement-breakpoint
CREATE INDEX "risk_decision_assessment_created_at_idx" ON "risk_decision" ("assessment_id","created_at");--> statement-breakpoint
CREATE INDEX "risk_history_subject_created_at_idx" ON "risk_history" ("subject_type","subject_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "risk_rule_application_key_version_key" ON "risk_rule" ("application","key","version");--> statement-breakpoint
CREATE INDEX "risk_signal_user_detected_at_idx" ON "risk_signal" ("user_id","detected_at");--> statement-breakpoint
CREATE INDEX "risk_signal_resource_idx" ON "risk_signal" ("application","resource_type","resource_id");--> statement-breakpoint
CREATE UNIQUE INDEX "user_username_lower_key" ON "user" (lower("username"));--> statement-breakpoint
CREATE INDEX "user_external_user_id_idx" ON "user" ("external_user_id");--> statement-breakpoint
CREATE INDEX "user_last_seen_at_idx" ON "user" ("last_seen_at");--> statement-breakpoint
CREATE UNIQUE INDEX "violation_review_policy_key" ON "violation" ("review_id","policy_id");--> statement-breakpoint
ALTER TABLE "analytics_event" ADD CONSTRAINT "analytics_event_user_id_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE "audit_event" ADD CONSTRAINT "audit_event_actor_user_id_user_id_fkey" FOREIGN KEY ("actor_user_id") REFERENCES "user"("id") ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE "content_review" ADD CONSTRAINT "content_review_report_id_moderation_report_id_fkey" FOREIGN KEY ("report_id") REFERENCES "moderation_report"("id") ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE "content_review" ADD CONSTRAINT "content_review_reviewer_user_id_user_id_fkey" FOREIGN KEY ("reviewer_user_id") REFERENCES "user"("id") ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE "dashboard" ADD CONSTRAINT "dashboard_owner_user_id_user_id_fkey" FOREIGN KEY ("owner_user_id") REFERENCES "user"("id") ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE "dashboard_widget" ADD CONSTRAINT "dashboard_widget_dashboard_id_dashboard_id_fkey" FOREIGN KEY ("dashboard_id") REFERENCES "dashboard"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "dashboard_widget" ADD CONSTRAINT "dashboard_widget_metric_id_metric_definition_id_fkey" FOREIGN KEY ("metric_id") REFERENCES "metric_definition"("id") ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE "enforcement" ADD CONSTRAINT "enforcement_violation_id_violation_id_fkey" FOREIGN KEY ("violation_id") REFERENCES "violation"("id") ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE "enforcement" ADD CONSTRAINT "enforcement_target_user_id_user_id_fkey" FOREIGN KEY ("target_user_id") REFERENCES "user"("id") ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE "funnel_result" ADD CONSTRAINT "funnel_result_funnel_id_funnel_id_fkey" FOREIGN KEY ("funnel_id") REFERENCES "funnel"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "funnel_step" ADD CONSTRAINT "funnel_step_funnel_id_funnel_id_fkey" FOREIGN KEY ("funnel_id") REFERENCES "funnel"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "metric_aggregate" ADD CONSTRAINT "metric_aggregate_metric_id_metric_definition_id_fkey" FOREIGN KEY ("metric_id") REFERENCES "metric_definition"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "moderation_appeal" ADD CONSTRAINT "moderation_appeal_enforcement_id_enforcement_id_fkey" FOREIGN KEY ("enforcement_id") REFERENCES "enforcement"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "moderation_appeal" ADD CONSTRAINT "moderation_appeal_appellant_user_id_user_id_fkey" FOREIGN KEY ("appellant_user_id") REFERENCES "user"("id") ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE "moderation_appeal" ADD CONSTRAINT "moderation_appeal_reviewer_user_id_user_id_fkey" FOREIGN KEY ("reviewer_user_id") REFERENCES "user"("id") ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE "moderation_history" ADD CONSTRAINT "moderation_history_actor_user_id_user_id_fkey" FOREIGN KEY ("actor_user_id") REFERENCES "user"("id") ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE "moderation_report" ADD CONSTRAINT "moderation_report_reporter_user_id_user_id_fkey" FOREIGN KEY ("reporter_user_id") REFERENCES "user"("id") ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE "moderation_report" ADD CONSTRAINT "moderation_report_assigned_to_user_id_user_id_fkey" FOREIGN KEY ("assigned_to_user_id") REFERENCES "user"("id") ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE "report_run" ADD CONSTRAINT "report_run_report_id_report_definition_id_fkey" FOREIGN KEY ("report_id") REFERENCES "report_definition"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "report_run" ADD CONSTRAINT "report_run_requested_by_user_id_user_id_fkey" FOREIGN KEY ("requested_by_user_id") REFERENCES "user"("id") ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE "retention_measurement" ADD CONSTRAINT "retention_measurement_cohort_id_retention_cohort_id_fkey" FOREIGN KEY ("cohort_id") REFERENCES "retention_cohort"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "risk_assessment" ADD CONSTRAINT "risk_assessment_user_id_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE "risk_decision" ADD CONSTRAINT "risk_decision_assessment_id_risk_assessment_id_fkey" FOREIGN KEY ("assessment_id") REFERENCES "risk_assessment"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "risk_decision" ADD CONSTRAINT "risk_decision_decided_by_user_id_user_id_fkey" FOREIGN KEY ("decided_by_user_id") REFERENCES "user"("id") ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE "risk_signal" ADD CONSTRAINT "risk_signal_user_id_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE "risk_signal" ADD CONSTRAINT "risk_signal_rule_id_risk_rule_id_fkey" FOREIGN KEY ("rule_id") REFERENCES "risk_rule"("id") ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE "violation" ADD CONSTRAINT "violation_review_id_content_review_id_fkey" FOREIGN KEY ("review_id") REFERENCES "content_review"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "violation" ADD CONSTRAINT "violation_policy_id_moderation_policy_id_fkey" FOREIGN KEY ("policy_id") REFERENCES "moderation_policy"("id") ON DELETE RESTRICT;