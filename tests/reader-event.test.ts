import { beforeEach, expect, it, vi } from "vitest";
const f = vi.hoisted(() => ({
  record: vi.fn(),
  query: vi.fn(),
  verify: vi.fn(),
}));
vi.mock("@/models/analytics-event", () => ({ rawRecordEvent: f.record }));
vi.mock("@/database", () => ({ database: { execute: f.query } }));
vi.mock("@/lib/auth/machine", () => ({ verifyMachineRequest: f.verify }));
vi.mock("@/lib/auth/verification", () => ({
  serviceAuthFailure: () => new Response(null, { status: 403 }),
}));
import { recordReaderEvent } from "@/services/reader";
import { rawReadReaderPolicy } from "@/services/reader-policy";
import { readerEventSchema } from "@/schemas/reader";
import { readerPolicySchema } from "@/schemas/reader-policy";
import { requireReaderPolicy } from "@/middlewares/reader-policy";
beforeEach(() => {
  vi.clearAllMocks();
  f.record.mockResolvedValue({ id: "event" });
  f.query.mockResolvedValue({ rows: [] });
});
it("omits post content and arbitrary analytics properties", async () => {
  await recordReaderEvent(
    readerEventSchema.parse({
      idempotencyKey: crypto.randomUUID(),
      name: "chapter.published",
      resourceId: crypto.randomUUID(),
      occurredAt: new Date(),
      content: "private post",
      properties: { secret: "never" },
    }),
  );
  expect(JSON.stringify(f.record.mock.calls)).not.toContain("private post");
  expect(f.record).toHaveBeenCalledWith(
    expect.objectContaining({ properties: {}, resourceType: "reader" }),
    "reader",
    "reader-backend",
  );
});
it("projects active enforcement decisions without sending reasons or identity records", async () => {
  f.query.mockResolvedValue({
    rows: [
      { resource_id: "post", type: "content_removal", external_user_id: null },
      { resource_id: null, type: "suspension", external_user_id: "subject" },
      { resource_id: "other", type: "warning", external_user_id: "subject" },
    ],
  });
  expect(
    await rawReadReaderPolicy({ subjects: ["subject"], resourceIds: [] }),
  ).toEqual({ removedResourceIds: ["post"], restrictedSubjects: ["subject"] });
  expect(() =>
    readerPolicySchema.parse({ subjects: Array(101).fill("subject") }),
  ).toThrow();
});
it("uses a separate machine policy scope and fails closed", async () => {
  const req = new Request("https://insight.test/insight/reader/policy"),
    next = vi.fn(async () => new Response("ok"));
  await requireReaderPolicy()({ req: { raw: req } } as never, next as never);
  expect(f.verify).toHaveBeenCalledWith(req, "reader:insight:policy");
  next.mockClear();
  f.verify.mockRejectedValue(new Error("denied"));
  expect(
    ((await requireReaderPolicy()({ req: { raw: req } } as never, next as never)) as Response)
      .status,
  ).toBe(403);
  expect(next).not.toHaveBeenCalled();
});
