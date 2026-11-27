import { HTTPError } from "nitro/h3"
import { canAppealReaderContent } from "@/services/reader-appeal"
import { and, eq, or, desc } from "drizzle-orm"
import { database } from "@/database"
import { auditEvent, enforcement, moderationAppeal, user } from "@/database/schema"
import { type Application } from "@/utils/constant"
import { type PageInput } from "@/schemas/insight"
import { rawRequireUserManagement, rawRequireLocalUser } from "@/models/user"
import { notFound } from "@/services/query"

export async function rawMyEnforcements(
  subject: string,
  application: Application,
  input: PageInput,
  bearer?: string,
) {
  const [actor] = await database
    .select()
    .from(user)
    .where(eq(user.externalUserId, subject))
    .limit(1);
  if (!actor)
    throw new HTTPError({ status: 403, message: "local_user_required" });
  const data = await database
    .select()
    .from(enforcement)
    .where(
      and(
        or(
          eq(enforcement.targetUserId, actor.id),
          application === "reader"
            ? or(
                eq(enforcement.resourceType, "story"),
                eq(enforcement.resourceType, "chapter"),
              )
            : undefined,
          ["social", "reader"].includes(application)
            ? and(
                eq(enforcement.resourceType, "user"),
                eq(enforcement.resourceId, subject),
              )
            : undefined,
        ),
        eq(enforcement.application, application),
      ),
    )
    .orderBy(desc(enforcement.createdAt), desc(enforcement.id))
    .limit(input.limit)
    .offset(input.offset);
  if (application !== "reader") return { data };
  const allowed = new Set<string>();
  for (let i = 0; i < data.length; i += 8)
    await Promise.all(
      data.slice(i, i + 8).map(async (e) => {
        if (
          e.targetUserId === actor.id ||
          (e.resourceType === "user" && e.resourceId === subject) ||
          (typeof e.resourceType === "string" &&
            typeof e.resourceId === "string" &&
            ["story", "chapter"].includes(e.resourceType) &&
            (await canAppealReaderContent(
              e.resourceType,
              e.resourceId,
              bearer,
            )))
        )
          allowed.add(e.id);
      }),
    );
  return { data: data.filter((e) => allowed.has(e.id)) };
}

export async function rawListAppealsManagement(application: Application, input: PageInput) {
  return {
    data: await database
      .select({
        id: moderationAppeal.id,
        reason: moderationAppeal.reason,
        status: moderationAppeal.status,
        enforcementId: moderationAppeal.enforcementId,
      })
      .from(moderationAppeal)
      .innerJoin(
        enforcement,
        eq(enforcement.id, moderationAppeal.enforcementId),
      )
      .where(eq(enforcement.application, application))
      .orderBy(desc(moderationAppeal.createdAt), desc(moderationAppeal.id))
      .limit(input.limit)
      .offset(input.offset),
  };
}

export async function rawCreateAppeal(
  id: string,
  reason: string,
  application: Application,
  subject: string,
  bearer?: string,
) {
  const actor = await rawRequireLocalUser(subject);
  return database.transaction(async (tx) => {
    const [record] = await tx
      .select()
      .from(enforcement)
      .where(
        and(
          eq(enforcement.id, id),
          eq(enforcement.application, application),
          or(
            eq(enforcement.targetUserId, actor.id),
            application === "reader"
              ? or(
                  eq(enforcement.resourceType, "story"),
                  eq(enforcement.resourceType, "chapter"),
                )
              : undefined,
            ["social", "reader"].includes(application)
              ? and(
                  eq(enforcement.resourceType, "user"),
                  eq(enforcement.resourceId, subject),
                )
              : undefined,
          ),
        ),
      )
      .for("update");
    if (!record) throw notFound();
    if (
      application === "reader" &&
      record.resourceType &&
      ["story", "chapter"].includes(record.resourceType) &&
      record.targetUserId !== actor.id
    ) {
      if (
        !record.resourceId ||
        !(await canAppealReaderContent(
          record.resourceType,
          record.resourceId,
          bearer,
        ))
      )
        throw notFound();
    }
    if (
      record.revokedAt ||
      (record.expiresAt && record.expiresAt <= new Date())
    )
      throw new HTTPError({
        status: 409,
        message: "enforcement_inactive",
      });
    const existing = await tx
      .select()
      .from(moderationAppeal)
      .where(
        and(
          eq(moderationAppeal.enforcementId, id),
          eq(moderationAppeal.status, "pending"),
        ),
      )
      .limit(1);
    if (existing.length)
      throw new HTTPError({
        status: 409,
        message: "appeal_pending",
      });
    const [created] = await tx
      .insert(moderationAppeal)
      .values({ enforcementId: id, appellantUserId: actor.id, reason })
      .returning();
    return created;
  });
}

export async function rawDecideAppealManagement(
  id: string,
  accepted: boolean,
  resolution: string,
  application: Application,
  subject: string,
) {
  const actor = await rawRequireUserManagement(subject);
  return database.transaction(async (tx) => {
    const [row] = await tx
      .select({ appeal: moderationAppeal, enforcement })
      .from(moderationAppeal)
      .innerJoin(
        enforcement,
        eq(moderationAppeal.enforcementId, enforcement.id),
      )
      .where(
        and(
          eq(moderationAppeal.id, id),
          eq(enforcement.application, application),
        ),
      )
      .for("update");
    if (!row) throw notFound();
    if (row.appeal.status !== "pending")
      throw new HTTPError({
        status: 409,
        message: "appeal_closed",
      });
    const now = new Date();
    const [updated] = await tx
      .update(moderationAppeal)
      .set({
        status: accepted ? "resolved" : "dismissed",
        resolution,
        reviewerUserId: actor.id,
        resolvedAt: now,
        updatedAt: now,
      })
      .where(eq(moderationAppeal.id, id))
      .returning();
    if (accepted)
      await tx
        .update(enforcement)
        .set({ revokedAt: now })
        .where(eq(enforcement.id, row.enforcement.id));
    await tx.insert(auditEvent).values({
      actorUserId: actor.id,
      application,
      action: "moderation.appeal",
      outcome: "success",
      resourceType: "moderation_appeal",
      resourceId: id,
      metadata: { accepted },
    });
    return updated;
  });
}
