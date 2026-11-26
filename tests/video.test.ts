import { beforeEach, expect, it, vi } from "vitest";
const f = vi.hoisted(() => ({ record: vi.fn() }));
vi.mock("@/models/analytics-event", () => ({ rawRecordEvent: f.record }));
import { recordVideoEvent } from "@/services/video";
import { videoEventSchema } from "@/schemas/video";
beforeEach(() => vi.clearAllMocks());
it("owns the application and labels playback quality as client-reported", async () => {
  const event = {
    idempotencyKey: crypto.randomUUID(),
    name: "video.qoe" as const,
    resourceId: crypto.randomUUID(),
    occurredAt: new Date(),
    qoe: { startupMs: 100, rebufferMs: 200, errors: 1 },
  };
  await recordVideoEvent(event);
  expect(f.record).toHaveBeenCalledWith(
    expect.objectContaining({
      resourceType: "video",
      properties: {
        startupMs: 100,
        rebufferMs: 200,
        errors: 1,
        measurement: "client_reported",
      },
    }),
    "video",
    "video-backend",
  );
});
it("rejects foreign application fields and unbounded quality metrics", () => {
  const base = {
    idempotencyKey: crypto.randomUUID(),
    name: "video.qoe",
    resourceId: crypto.randomUUID(),
    occurredAt: new Date(),
  };
  expect(
    videoEventSchema.safeParse({ ...base, application: "reader" }).success,
  ).toBe(false);
  expect(
    videoEventSchema.safeParse({
      ...base,
      qoe: { startupMs: Infinity, rebufferMs: 0, errors: 0 },
    }).success,
  ).toBe(false);
});
