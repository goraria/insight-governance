import type { Binding, Event } from "@/utils/interface";
import type { MiddlewareHandler } from "hono";

import { rawRequireUserManagement as requireManagerServices } from "@/models/user"

/** Local roles are application-owned and never accepted from request bodies. */
export function requireManager(): MiddlewareHandler<Binding> {
  return async (context: Event, next) => {
    await requireManagerServices(context.get("sub")!);
    return await next();
  };
}
