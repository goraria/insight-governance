/** Bound JSON size/depth and remove common credentials before analytics/audit storage. */
export function sanitizeInsightData(input: Record<string, unknown>) {
  function visit(value: unknown, depth: number): unknown {
    if (depth > 6) return "[truncated]";
    if (typeof value === "string") return value.slice(0, 4096);
    if (Array.isArray(value))
      return value.slice(0, 100).map((item) => visit(item, depth + 1));
    if (value && typeof value === "object")
      return Object.fromEntries(
        Object.entries(value)
          .slice(0, 100)
          .map(([key, item]) => [
            key,
            /password|secret|token|authorization|cookie|api.?key|private.?key/i.test(
              key,
            )
              ? "[redacted]"
              : visit(item, depth + 1),
          ]),
      );
    return value;
  }
  return visit(input, 0) as Record<string, unknown>;
}
