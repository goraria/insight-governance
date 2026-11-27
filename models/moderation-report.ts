import { HTTPError } from "nitro/h3"
import { and, count, desc, eq, sql } from "drizzle-orm"
import { database } from "@/database"
import { auditEvent, contentReview, moderationHistory, moderationReport } from "@/database/schema"
import { type Application } from "@/utils/constant"
import { type PageInput, type ReportInput, type ReviewInput } from "@/schemas/insight"
import { rawRequireUserManagement, rawRequireLocalUser } from "@/models/user"
import { notFound, page } from "@/services/query"

export async function rawCreateReport(
  input: ReportInput,
  application: Application,
  subject: string,
) {
  const actor = await rawRequireLocalUser(subject);
  if (["social", "reader"].includes(application))
    return database.transaction(async (tx) => {
      await tx.execute(
        sql`SELECT pg_advisory_xact_lock(hashtextextended(${actor.id},0))`,
      );
      const recent = await tx.execute(
        sql`SELECT count(*)::int n FROM ${moderationReport} WHERE ${moderationReport.reporterUserId}=${actor.id}::uuid AND ${moderationReport.createdAt}>clock_timestamp()-interval '10 minutes'`,
      );
      if (Number(recent.rows[0]?.n) >= 10)
        throw new HTTPError({ status: 429, message: "report_rate_limited" });
      const [created] = await tx
        .insert(moderationReport)
        .values({ ...input, application, reporterUserId: actor.id })
        .returning();
      return created;
    });
  const [created] = await database
    .insert(moderationReport)
    .values({ ...input, application, reporterUserId: actor.id })
    .returning();
  return created;
}

export async function rawListReportsManagement(input: PageInput, application: Application) {
  const where = and(
    eq(moderationReport.application, application),
    input.status ? eq(moderationReport.status, input.status) : undefined,
  );
  const [data, totals] = await Promise.all([
    database
      .select()
      .from(moderationReport)
      .where(where)
      .orderBy(desc(moderationReport.createdAt), desc(moderationReport.id))
      .limit(input.limit)
      .offset(input.offset),
    database.select({ total: count() }).from(moderationReport).where(where),
  ]);
  return page(data, Number(totals[0]?.total ?? 0), input);
}

export async function rawReviewReportManagement(
  id: string,
  input: ReviewInput,
  application: Application,
  subject: string,
) {
  const actor = await rawRequireUserManagement(subject);
  return database.transaction(async (tx) => {
    const [report] = await tx
      .select()
      .from(moderationReport)
      .where(
        and(
          eq(moderationReport.id, id),
          eq(moderationReport.application, application),
        ),
      )
      .for("update");
    if (!report) throw notFound();
    if (!["pending", "reviewing"].includes(report.status))
      throw new HTTPError({
        status: 409,
        message: "report_already_closed",
      });
    const now = new Date();
    const [review] = await tx
      .insert(contentReview)
      .values({
        reportId: id,
        reviewerUserId: actor.id,
        application,
        resourceType: report.resourceType,
        resourceId: report.resourceId,
        ...input,
        reviewedAt: now,
      })
      .returning();
    await tx
      .update(moderationReport)
      .set({
        status: input.status,
        assignedToUserId: actor.id,
        resolvedAt: input.status === "reviewing" ? null : now,
        updatedAt: now,
      })
      .where(eq(moderationReport.id, id));
    await tx.insert(moderationHistory).values({
      actorUserId: actor.id,
      targetType: "report",
      targetId: id,
      action: "review",
      fromStatus: report.status,
      toStatus: input.status,
    });
    await tx.insert(auditEvent).values({
      actorUserId: actor.id,
      application,
      action: "moderation.review",
      outcome: "success",
      resourceType: "moderation_report",
      resourceId: id,
    });
    return review;
  });
}
