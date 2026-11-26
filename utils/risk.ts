import { conditionSchema } from "@/schemas/insight";

/** Deliberately bounded numeric rule DSL; never eval SQL/JS supplied by a caller. */
export function matchesRiskCondition(
  condition: unknown,
  values: Record<string, number>,
) {
  const parsed = conditionSchema.safeParse(condition);
  if (!parsed.success) return false;
  const { field, operator, value } = parsed.data;
  if (!Object.hasOwn(values, field)) return false;
  const actual = values[field];
  if (typeof actual !== "number" || !Number.isFinite(actual)) return false;
  if (operator === "gt") return actual > value;
  if (operator === "gte") return actual >= value;
  if (operator === "lt") return actual < value;
  if (operator === "lte") return actual <= value;
  return actual === value;
}

export function riskDecisionFor(score: number) {
  if (score >= 75)
    return { severity: "critical" as const, decision: "block" as const };
  if (score >= 50)
    return { severity: "high" as const, decision: "challenge" as const };
  if (score >= 25)
    return { severity: "medium" as const, decision: "review" as const };
  return { severity: "low" as const, decision: "allow" as const };
}
