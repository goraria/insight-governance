import { beforeEach, expect, it, vi } from "vitest";
vi.mock("@/utils/sso-directory", () => ({
  getApplicationOrigin: async () => "https://reader.example.test",
}));
vi.mock("@/utils/environment", () => ({
  isProduction: true,
}));
import { canAppealReaderContent } from "@/services/reader-appeal";
beforeEach(() => vi.restoreAllMocks());
it("checks source ownership through the fixed Reader endpoint even when content is removed", async () => {
  const network = vi
    .spyOn(globalThis, "fetch")
    .mockResolvedValue(Response.json({ allowed: true }));
  expect(await canAppealReaderContent("chapter", "id", "Bearer owner")).toBe(
    true,
  );
  expect(String(network.mock.calls[0]![0])).toBe(
    "https://reader.example.test/reader/access",
  );
  expect(JSON.parse(String(network.mock.calls[0]![1]?.body))).toEqual({
    resourceType: "chapter",
    resourceId: "id",
    action: "appeal",
  });
  expect(network.mock.calls[0]![1]).toMatchObject({
    redirect: "error",
    cache: "no-store",
    headers: { Authorization: "Bearer owner" },
  });
});
it.each([401, 403, 404])(
  "does not treat status %i as ownership",
  async (status) => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(null, { status }),
    );
    expect(await canAppealReaderContent("story", "id", "Bearer stranger")).toBe(
      false,
    );
  },
);
it("fails closed on service outages and missing grants", async () => {
  await expect(canAppealReaderContent("story", "id")).rejects.toMatchObject({
    status: 503,
  });
  vi.spyOn(globalThis, "fetch").mockRejectedValue(new Error("offline"));
  await expect(
    canAppealReaderContent("story", "id", "Bearer owner"),
  ).rejects.toMatchObject({ status: 503 });
});
