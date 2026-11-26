import { count, desc, eq } from "drizzle-orm"
import { database } from "@/database"
import { auditEvent, enforcement } from "@/database/schema"
import { type Application } from "@/types/insight"
import { type EnforcementInput, type PageInput } from "@/schemas/insight"
import { rawRequireUserManagement } from "@/models/user"
import { page } from "@/services/query"

export async function rawCreateEnforcementManagement(
  input: EnforcementInput,
  application: Application,
  subject: string,
) {
  const actor = await rawRequireUserManagement(subject);
  return database.transaction(async (tx) => {
    const [created] = await tx
      .insert(enforcement)
      .values({ ...input, application })
      .returning();
    await tx.insert(auditEvent).values({
      actorUserId: actor.id,
      application,
      action: "enforcement.create",
      outcome: "success",
      resourceType: "enforcement",
      resourceId: created!.id,
    });
    return created;
  });
}

export async function rawListEnforcementsManagement(
  input: PageInput,
  application: Application,
) {
  const where = eq(enforcement.application, application);
  const [data, totals] = await Promise.all([
    database
      .select()
      .from(enforcement)
      .where(where)
      .orderBy(desc(enforcement.createdAt), desc(enforcement.id))
      .limit(input.limit)
      .offset(input.offset),
    database.select({ total: count() }).from(enforcement).where(where),
  ]);
  return page(data, Number(totals[0]?.total ?? 0), input);
}
