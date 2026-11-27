import { and, count, desc, eq } from "drizzle-orm"
import { database } from "@/database"
import { riskAssessment, riskDecision, riskHistory, riskRule, riskSignal } from "@/database/schema"
import { type Application } from "@/utils/constant"
import { type AssessmentInput, type PageInput } from "@/schemas/insight"
import { matchesRiskCondition, riskDecisionFor } from "@/utils/risk"
import { rawRequireUserManagement } from "@/models/user"
import { page } from "@/services/query"

export async function rawAssessRiskManagement(
  input: AssessmentInput,
  application: Application,
  subject: string,
) {
  const actor = await rawRequireUserManagement(subject);
  // Only the most recent active version of each rule is evaluated.
  const rules = await database
    .selectDistinctOn([riskRule.key])
    .from(riskRule)
    .where(
      and(eq(riskRule.application, application), eq(riskRule.isActive, true)),
    )
    .orderBy(riskRule.key, desc(riskRule.version))
    .limit(1000);
  const matches = rules.filter((rule) =>
    matchesRiskCondition(rule.condition, input.values),
  );
  const score = Math.min(
    100,
    matches.reduce((sum, rule) => sum + Number(rule.weight), 0),
  );
  const decision = riskDecisionFor(score);
  return database.transaction(async (tx) => {
    const signals = matches.length
      ? await tx
          .insert(riskSignal)
          .values(
            matches.map((rule) => ({
              application,
              ruleId: rule.id,
              category: rule.category,
              severity: rule.severity,
              value: rule.weight,
              evidence: {
                subjectType: input.subjectType,
                subjectId: input.subjectId,
                ruleVersion: rule.version,
              },
            })),
          )
          .returning({ id: riskSignal.id })
      : [];
    const [assessment] = await tx
      .insert(riskAssessment)
      .values({
        application,
        subjectType: input.subjectType,
        subjectId: input.subjectId,
        score: String(score),
        severity: decision.severity,
        signalIds: signals.map((signal) => signal.id),
        expiresAt: new Date(Date.now() + 3600000),
      })
      .returning();
    await tx.insert(riskDecision).values({
      assessmentId: assessment!.id,
      decidedByUserId: actor.id,
      decision: decision.decision,
      reason: "numeric_rules_v1",
    });
    await tx.insert(riskHistory).values({
      subjectType: input.subjectType,
      subjectId: input.subjectId,
      eventType: "assessment",
      currentScore: String(score),
      details: { application, assessmentId: assessment!.id },
    });
    return { assessment, decision: decision.decision };
  });
}

export async function rawListAssessmentsManagement(
  input: PageInput,
  application: Application,
) {
  const where = eq(riskAssessment.application, application);
  const [data, totals] = await Promise.all([
    database
      .select()
      .from(riskAssessment)
      .where(where)
      .orderBy(desc(riskAssessment.assessedAt), desc(riskAssessment.id))
      .limit(input.limit)
      .offset(input.offset),
    database.select({ total: count() }).from(riskAssessment).where(where),
  ]);
  return page(data, Number(totals[0]?.total ?? 0), input);
}
