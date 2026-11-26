import { createDatabasePoolFactory } from "@gorth-com/structure/modules/database";
import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";

import * as schema from "@/database/schema";
import { databaseUrl, pgPoolMax } from "@/utils/environment";

const defaultPoolMax = 5;
const { Pool } = pg;
const configuredPoolMax = Number.parseInt(pgPoolMax ?? "", 10);

if (!databaseUrl) throw new Error("DATABASE_URL is required");

const globalForDatabase = globalThis as typeof globalThis & {
  insightGovernancePool?: InstanceType<typeof Pool>;
};

const pool =
  globalForDatabase.insightGovernancePool ??
  createDatabasePoolFactory((options) => new Pool(options))({
    connectionString: databaseUrl,
    max: Number.isNaN(configuredPoolMax) ? defaultPoolMax : configuredPoolMax,
  });

if (!globalForDatabase.insightGovernancePool) {
  attachDatabasePool(pool);
  pool.on("error", (error: unknown) => {
    console.error("[insight-governance-pg-pool-error]", error);
  });
  globalForDatabase.insightGovernancePool = pool;
}

export const database = drizzle({ client: pool });
export { pool, schema };
export default database;
import { attachDatabasePool } from "@vercel/functions";
