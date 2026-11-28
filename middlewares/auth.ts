import type { Binding, ServiceAccess } from "@/utils/interface";
import { createHonoRequestGuard } from "@/modules/principle/request-guard";
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
