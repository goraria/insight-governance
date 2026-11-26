import { HTTPError } from "nitro/h3";
import type { ApiContext } from "@/types/auth";
import { beforeEach, expect, it, vi } from "vitest";
import { ZodError } from "@gorth-com/structure/cores/zod";
const state = vi.hoisted(() => ({
  role: "user",
  insert: vi.fn(),
  queries: vi.fn(),
}));
vi.mock("@/middlewares/auth", () => ({
  requireAuth: () => async (c: ApiContext, next: () => Promise<void>) => {
    if (!c.req.header("authorization"))
      return Response.json(
        { error: "unauthorized" },
        {
          status: 401,
          headers: { "content-type": "application/json; charset=UTF-8" },
        },
      );
    c.set("subject", "subject");
    c.set("application", "video");
    return await next();
  },
}));
vi.mock("@/middlewares/identity", () => ({
  requireLocalIdentity: () => async (_c: unknown, next: () => Promise<void>) =>
    next(),
}));
vi.mock("@/database", () => ({
  database: {
    select: () => ({
      from: () => ({
        where: () => ({
          limit: async () => [
            {
              id: "local",
              externalUserId: "subject",
              role: state.role,
              status: "active",
            },
          ],
        }),
      }),
    }),
    insert: () => ({ values: state.insert }),
  },
  pool: { query: state.queries },
}));
import { filesystemRouter } from "./filesystem-router";
import { matchesRiskCondition, riskDecisionFor } from "@/utils/risk";
import { eventSchema, rangeSchema } from "@/schemas/insight";
import { sanitizeInsightData } from "@/utils/privacy";
function app() {
  return filesystemRouter().onError((error) => {
    if (error instanceof HTTPError)
      return new Response(error.message, {
        status: error.status,
        headers: error.headers,
      });
    return Response.json(
      { error: error.message },
      {
        status: error instanceof ZodError ? 400 : 500,
        headers: { "content-type": "application/json; charset=UTF-8" },
      },
    );
  });
}
beforeEach(() => {
  vi.clearAllMocks();
  state.role = "user";
  state.queries.mockResolvedValue({ rows: [] });
  state.insert.mockImplementation((value) => ({
    onConflictDoNothing: () => ({
      returning: async () => [{ id: "event", ...value }],
    }),
  }));
});
it("rejects unauthenticated event ingestion", async () => {
  expect(
    (await app().request("/insight/event", { method: "POST", body: "{}" }))
      .status,
  ).toBe(401);
  expect(state.insert).not.toHaveBeenCalled();
});
it("ingests a validated event bound to the verified subject/application", async () => {
  const response = await app().request("/insight/event", {
    method: "POST",
    headers: {
      Authorization: "Bearer valid",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      name: "view",
      idempotencyKey: "view-1",
      application: "chat",
      anonymousId: "victim",
    }),
  });
  expect(response.status).toBe(201);
  expect(await response.json()).toMatchObject({
    application: "video",
    anonymousId: "subject",
  });
});
it.each([
  "/event",
  "/audit",
  "/moderation/report",
  "/analytics?from=2026-10-01&to=2026-10-02",
])("denies a regular user management access to %s", async (path) => {
  expect(
    (
      await app().request("/insight" + path, {
        headers: { Authorization: "Bearer valid" },
      })
    ).status,
  ).toBe(403);
});
it("queries analytics using bound parameters and a bounded date range", async () => {
  state.role = "admin";
  expect(
    (
      await app().request("/insight/analytics?from=2026-10-01&to=2026-10-02", {
        headers: { Authorization: "Bearer valid" },
      })
    ).status,
  ).toBe(200);
  expect(state.queries.mock.calls[0]![1][0]).toBe("video");
  expect(
    rangeSchema.safeParse({ from: "2020-01-01", to: "2026-10-20" }).success,
  ).toBe(false);
});
it("rejects future/ancient events and invalid numeric rule fields", () => {
  expect(
    eventSchema.safeParse({
      name: "x",
      idempotencyKey: "k",
      occurredAt: "2099-01-01",
    }).success,
  ).toBe(false);
  expect(
    matchesRiskCondition(
      { field: "amount", operator: "gte", value: 100 },
      { amount: 101 },
    ),
  ).toBe(true);
  expect(
    matchesRiskCondition({ field: "amount", operator: "gte", value: 100 }, {}),
  ).toBe(false);
  expect(
    matchesRiskCondition(
      { field: "amount", operator: "eval", value: 100 },
      { amount: 101 },
    ),
  ).toBe(false);
  expect(
    matchesRiskCondition(
      { field: "amount", operator: "gt", value: 100 },
      { amount: Infinity },
    ),
  ).toBe(false);
});
it.each([
  [0, "allow"],
  [25, "review"],
  [50, "challenge"],
  [75, "block"],
  [100, "block"],
])("maps score %i to %s deterministically", (score, decision) => {
  expect(riskDecisionFor(Number(score)).decision).toBe(decision);
});
it("redacts nested credentials and bounds oversized analytics properties", () => {
  expect(
    sanitizeInsightData({
      authorization: "Bearer credential",
      nested: { password: "private", normal: 12 },
      values: Array(200).fill(1),
    }),
  ).toEqual({
    authorization: "[redacted]",
    nested: { password: "[redacted]", normal: 12 },
    values: Array(100).fill(1),
  });
});
