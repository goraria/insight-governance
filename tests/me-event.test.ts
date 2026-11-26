import { beforeEach, expect, it, vi } from "vitest"
import { PgDialect } from "drizzle-orm/pg-core"
const state = vi.hoisted(() => ({ filters: [] as unknown[] }))
vi.mock("@/database", () => ({ database: { select: () => ({ from: () => ({ where: (filter: unknown) => {
 state.filters.push(filter)
 return { orderBy: () => ({ limit: () => ({ offset: async () => [] }) }), then: (resolve: (value: unknown) => void) => resolve([{ total: 0 }]) }
} }) }) }, pool: {} }))
import { rawListMyEvents } from "@/models/analytics-event"
beforeEach(() => { state.filters = [] })
it("uses identical caller and application predicates for personal activity rows and counts", async () => {
 expect(await rawListMyEvents({ limit: 20, offset: 0 }, "restaurant", "caller-a")).toMatchObject({ data: [], pagination: { total: 0 } })
 const queries = state.filters.map(filter => new PgDialect().sqlToQuery(filter as never))
 expect(queries).toHaveLength(2)
 for (const query of queries) { expect(query.sql).toContain('"anonymous_id"'); expect(query.params).toContain("caller-a"); expect(query.params).toContain("restaurant") }
 expect(queries[0]).toEqual(queries[1])
})
it("never reuses another account's activity when switching caller or application", async () => {
 await rawListMyEvents({ limit: 20, offset: 20, name: "commerce.operation.completed" }, "marketplace", "caller-b")
 for (const filter of state.filters) { const query = new PgDialect().sqlToQuery(filter as never); expect(query.params).toContain("caller-b"); expect(query.params).toContain("marketplace"); expect(query.params).not.toContain("caller-a"); expect(query.params).toContain("commerce.operation.completed") }
})
