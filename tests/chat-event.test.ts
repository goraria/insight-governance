import { beforeEach, expect, it, vi } from "vitest";
const state = vi.hoisted(() => ({ event: vi.fn(), verify: vi.fn() }));
vi.mock("@/models/analytics-event", () => ({ rawRecordEvent: state.event }));
vi.mock("@/lib/auth/machine", () => ({ verifyMachineRequest: state.verify }));
vi.mock("@/lib/auth/verification", () => ({
  serviceAuthFailure: () => new Response(null, { status: 403 }),
}));
import { recordChatEvent } from "@/services/chat";
import { chatEventSchema } from "@/schemas/chat";
import { requireChatWorker } from "@/middlewares/chat-worker";
beforeEach(() => {
  state.event.mockReset().mockResolvedValue({ id: "event" });
  state.verify.mockReset();
});
it("keeps message content, provider secrets and arbitrary properties out of analytics", async () => {
  const input = chatEventSchema.parse({
    idempotencyKey: "e253d588-f492-4f2b-9dc2-4da90890e660",
    name: "message.created",
    resourceId: "e253d588-f492-4f2b-9dc2-4da90890e661",
    conversationId: "e253d588-f492-4f2b-9dc2-4da90890e662",
    occurredAt: new Date(),
    content: "private",
    properties: { secret: "never" },
  });
  await recordChatEvent(input);
  expect(state.event).toHaveBeenCalledWith(
    expect.objectContaining({
      properties: { conversationId: input.conversationId },
    }),
    "chat",
    "chat-backend",
  );
  expect(JSON.stringify(state.event.mock.calls)).not.toContain("private");
});
it("uses a Chat-specific scope and fails closed", async () => {
  const request = new Request("https://insight.test/insight/chat/event"),
    next = vi.fn(async () => new Response("ok"));
  await requireChatWorker()({ req: { raw: request } } as never, next as never);
  expect(state.verify).toHaveBeenCalledWith(request, "chat:insight:publish");
  next.mockClear();
  state.verify.mockRejectedValue(new Error("denied"));
  expect(
    (
      (await requireChatWorker()(
        { req: { raw: request } } as never,
        next as never,
      )) as Response
    ).status,
  ).toBe(403);
  expect(next).not.toHaveBeenCalled();
});
