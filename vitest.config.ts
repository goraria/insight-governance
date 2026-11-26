import { tmpdir } from "node:os";
import { join } from "node:path";
import { defineConfig } from "vitest/config";
export default defineConfig({
  envDir: false,
  cacheDir: join(tmpdir(), "gorth-service-tests", "insight-governance", "vite"),
  resolve: { alias: { "@": import.meta.dirname } },
  test: {
    environment: "node",
    cache: false,
    fsModuleCachePath: join(
      tmpdir(),
      "gorth-service-tests",
      "insight-governance",
      "fs",
    ),
    include: ["tests/**/*.test.ts"],
    restoreMocks: true,
    fileParallelism: false,
    testTimeout: 15_000,
  },
});
