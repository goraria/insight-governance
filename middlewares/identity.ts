import type { ApiEnv } from "@/types/auth";
import type { MiddlewareHandler } from "hono";
import type { ApiContext } from "@/types/auth";

import { rawEnsureLocalIdentity } from "@/models/user";
export function requireLocalIdentity(): MiddlewareHandler<ApiEnv> {
  return async (context: ApiContext, next) => {
    await rawEnsureLocalIdentity(
      context.get("subject")!,
      context.req.header("authorization")!,
    );
    return await next();
  };
}
