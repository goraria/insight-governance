export type ServiceAccess = "read" | "write";
import type { Context } from "hono";
import type { Application } from "@/utils/constant";

export interface Session {
  sub: string;
  app: Application;
}

export interface Binding {
  Variables: Partial<Session>;
}

export type Event = Context<Binding>;
