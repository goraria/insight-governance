import type { Binding, Event, ServiceAccess } from "@/utils/interface";
import type { MiddlewareHandler } from "hono";

import {
  serviceAuthFailure,
  verifyServiceRequest,
} from "@/lib/auth/verification";

export function requireAuth(access: ServiceAccess): MiddlewareHandler<Binding> {
  return createHonoRequestGuard<Awaited<ReturnType<typeof verifyServiceRequest>>
  >({
    verify: (request) => verifyServiceRequest(request, access),
    failure: serviceAuthFailure,
    assign(event, auth) {
      event.set("app", auth.application);
      event.set("sub", auth.subject);
    },
  });
}

function createHonoRequestGuard<Auth>(options: {
  verify: (request: Request) => Promise<Auth>
  failure: (error: unknown) => Response
  assign: (context: Event, identity: Auth) => void
}): MiddlewareHandler<Binding> {
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
