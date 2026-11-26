import { count, desc, eq } from "drizzle-orm"
import { database } from "@/database"
import { riskRule } from "@/database/schema"
import { type Application } from "@/types/insight"
import { type PageInput, type RuleInput } from "@/schemas/insight"
import { page } from "@/services/query"

export async function rawCreateRiskRuleManagement(
  input: RuleInput,
  application: Application,
) {
  const [created] = await database
    .insert(riskRule)
    .values({ ...input, weight: String(input.weight), application })
    .returning();
  return created;
}

export async function rawListRiskRulesManagement(
  input: PageInput,
  application: Application,
) {
  const where = eq(riskRule.application, application);
  const [data, totals] = await Promise.all([
    database
      .select()
      .from(riskRule)
      .where(where)
      .orderBy(riskRule.key, desc(riskRule.version))
      .limit(input.limit)
      .offset(input.offset),
    database.select({ total: count() }).from(riskRule).where(where),
  ]);
  return page(data, Number(totals[0]?.total ?? 0), input);
}
