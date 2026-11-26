import type { ApiEnv } from "@/types/auth";
import type { MiddlewareHandler } from "hono";
import type { ApiContext } from "@/types/auth";
import { rawRequireUserManagement as requireManagerServices } from "@/models/user"

/** Local roles are application-owned and never accepted from request bodies. */
export function requireManager(): MiddlewareHandler<ApiEnv> {
  return async (context: ApiContext, next) => {
    await requireManagerServices(context.get("subject")!);
    return await next();
  };
}
