import type { Context } from "hono";
import type { GorthApplication } from "@/lib/constants";
export interface AppContext {
  subject: string;
  application: GorthApplication;
}

export interface ApiEnv {
  Variables: Partial<AppContext>
}

export type ApiContext = Context<ApiEnv>;
