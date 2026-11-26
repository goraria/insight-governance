import type { ApiEnv } from "@/types/auth";
import type { MiddlewareHandler } from "hono";
import type { ApiContext } from "@/types/auth";
import {
  serviceAuthFailure,
  verifyServiceRequest,
} from "@/lib/auth/verification";

import type { ServiceAccess } from "@/utils/interface";
export function requireAuth(access: ServiceAccess): MiddlewareHandler<ApiEnv> {
  return createHonoRequestGuard<Awaited<ReturnType<typeof verifyServiceRequest>>
  >({
    verify: (request) => verifyServiceRequest(request, access),
    failure: serviceAuthFailure,
    assign(event, auth) {
      event.set("application", auth.application);
      event.set("subject", auth.subject);
    },
  });
}

function createHonoRequestGuard<Auth>(options: {
  verify: (request: Request) => Promise<Auth>
  failure: (error: unknown) => Response
  assign: (context: ApiContext, identity: Auth) => void
}): MiddlewareHandler<ApiEnv> {
  return async (context, next) => {
    let identity: Auth
    try {
      identity = await options.verify(context.req.raw)
    } catch (error) {
      return options.failure(error)
    }
    options.assign(context, identity)
    await next()
  }
}
