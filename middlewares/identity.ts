import type { Binding, Event } from "@/utils/interface";
import type { MiddlewareHandler } from "hono";

import { rawEnsureLocalIdentity } from "@/models/user";
export function requireLocalIdentity(): MiddlewareHandler<Binding> {
  return async (context: Event, next) => {
    await rawEnsureLocalIdentity(
      context.get("sub")!,
      context.req.header("authorization")!,
    );
    return await next();
  };
}
