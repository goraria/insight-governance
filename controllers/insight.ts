import type { Event } from "@/utils/interface";
import { getQueryValues, readRequestBody } from "@/modules/principle/request";

import * as schemas from "@/schemas/insight";
import { rawRecordEvent, rawListEventsManagement, rawListMyEvents, rawAnalyticsSummaryManagement } from "@/models/analytics-event"
import { rawRecordAuditManagement, rawListAuditManagement } from "@/models/audit-event"
import { rawCreateReport, rawListReportsManagement, rawReviewReportManagement } from "@/models/moderation-report"
import { rawCreateEnforcementManagement, rawListEnforcementsManagement } from "@/models/enforcement"
import { rawCreateAppeal, rawDecideAppealManagement } from "@/models/moderation-appeal"
import { rawCreateRiskRuleManagement, rawListRiskRulesManagement } from "@/models/risk-rule"
import { rawAssessRiskManagement, rawListAssessmentsManagement } from "@/models/risk-assessment"
type InsightContext = Event;
export async function actRecordEvent(c: InsightContext) {
  return c.json(
    await rawRecordEvent(
      schemas.eventSchema.parse(await readRequestBody(c.req)),
      c.get("app")!,
      c.get("sub")!,
    ),
    {
      status: 201,
      headers: { "content-type": "application/json; charset=UTF-8" },
    },
  );
}
export async function actListEvents(c: InsightContext) {
  return c.json(
    await rawListEventsManagement(
      schemas.pageSchema.parse(getQueryValues(c.req.raw)),
      c.get("app")!,
    ),
    { headers: { "content-type": "application/json; charset=UTF-8" } },
  );
}
export async function actListMyEvents(c: InsightContext) {
  return c.json(await rawListMyEvents(schemas.pageSchema.parse(getQueryValues(c.req.raw)), c.get("app")!, c.get("sub")!))
}
export async function actAnalyticsSummary(c: InsightContext) {
  return c.json(
    await rawAnalyticsSummaryManagement(
      schemas.rangeSchema.parse(getQueryValues(c.req.raw)),
      c.get("app")!,
    ),
    { headers: { "content-type": "application/json; charset=UTF-8" } },
  );
}
export async function actRecordAudit(c: InsightContext) {
  return c.json(
    await rawRecordAuditManagement(
      schemas.auditSchema.parse(await readRequestBody(c.req)),
      c.get("app")!,
      c.get("sub")!,
    ),
    {
      status: 201,
      headers: { "content-type": "application/json; charset=UTF-8" },
    },
  );
}
export async function actListAudit(c: InsightContext) {
  return c.json(
    await rawListAuditManagement(
      schemas.pageSchema.parse(getQueryValues(c.req.raw)),
      c.get("app")!,
    ),
    { headers: { "content-type": "application/json; charset=UTF-8" } },
  );
}
export async function actCreateReport(c: InsightContext) {
  return c.json(
    await rawCreateReport(
      schemas.reportSchema.parse(await readRequestBody(c.req)),
      c.get("app")!,
      c.get("sub")!,
    ),
    {
      status: 201,
      headers: { "content-type": "application/json; charset=UTF-8" },
    },
  );
}
export async function actListReports(c: InsightContext) {
  return c.json(
    await rawListReportsManagement(
      schemas.pageSchema.parse(getQueryValues(c.req.raw)),
      c.get("app")!,
    ),
    { headers: { "content-type": "application/json; charset=UTF-8" } },
  );
}
export async function actReviewReport(c: InsightContext) {
  return c.json(
    await rawReviewReportManagement(
      schemas.idSchema.parse(c.req.param("id")!),
      schemas.reviewSchema.parse(await readRequestBody(c.req)),
      c.get("app")!,
      c.get("sub")!,
    ),
    { headers: { "content-type": "application/json; charset=UTF-8" } },
  );
}
export async function actCreateEnforcement(c: InsightContext) {
  return c.json(
    await rawCreateEnforcementManagement(
      schemas.enforcementSchema.parse(await readRequestBody(c.req)),
      c.get("app")!,
      c.get("sub")!,
    ),
    {
      status: 201,
      headers: { "content-type": "application/json; charset=UTF-8" },
    },
  );
}
export async function actCreateAppeal(c: InsightContext) {
  const input = schemas.appealSchema.parse(await readRequestBody(c.req));
  return c.json(
    await rawCreateAppeal(
      schemas.idSchema.parse(c.req.param("id")!),
      input.reason,
      c.get("app")!,
      c.get("sub")!,
      c.req.raw.headers.get("authorization") ?? undefined,
    ),
    {
      status: 201,
      headers: { "content-type": "application/json; charset=UTF-8" },
    },
  );
}
export async function actDecideAppeal(c: InsightContext) {
  const input = schemas.appealDecisionSchema.parse(await readRequestBody(c.req));
  return c.json(
    await rawDecideAppealManagement(
      schemas.idSchema.parse(c.req.param("id")!),
      input.accepted,
      input.resolution,
      c.get("app")!,
      c.get("sub")!,
    ),
    { headers: { "content-type": "application/json; charset=UTF-8" } },
  );
}
export async function actCreateRiskRule(c: InsightContext) {
  return c.json(
    await rawCreateRiskRuleManagement(
      schemas.ruleSchema.parse(await readRequestBody(c.req)),
      c.get("app")!,
    ),
    {
      status: 201,
      headers: { "content-type": "application/json; charset=UTF-8" },
    },
  );
}
export async function actAssessRisk(c: InsightContext) {
  return c.json(
    await rawAssessRiskManagement(
      schemas.assessmentSchema.parse(await readRequestBody(c.req)),
      c.get("app")!,
      c.get("sub")!,
    ),
    {
      status: 201,
      headers: { "content-type": "application/json; charset=UTF-8" },
    },
  );
}
export async function actListRiskRules(c: InsightContext) {
  return c.json(
    await rawListRiskRulesManagement(
      schemas.pageSchema.parse(getQueryValues(c.req.raw)),
      c.get("app")!,
    ),
    { headers: { "content-type": "application/json; charset=UTF-8" } },
  );
}
export async function actListAssessments(c: InsightContext) {
  return c.json(
    await rawListAssessmentsManagement(
      schemas.pageSchema.parse(getQueryValues(c.req.raw)),
      c.get("app")!,
    ),
    { headers: { "content-type": "application/json; charset=UTF-8" } },
  );
}
export async function actListEnforcements(c: InsightContext) {
  return c.json(
    await rawListEnforcementsManagement(
      schemas.pageSchema.parse(getQueryValues(c.req.raw)),
      c.get("app")!,
    ),
    { headers: { "content-type": "application/json; charset=UTF-8" } },
  );
}
