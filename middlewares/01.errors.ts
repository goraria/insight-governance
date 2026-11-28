import { HTTPError, onError } from "nitro/h3";
import { ZodError } from "@gorth-com/structure/cores/zod";
import { createServiceErrorHandler, serviceErrorJson } from "@/modules/principle/service-errors";

export const handleServiceError = createServiceErrorHandler("[insight-error]", (error) => {
  if (error instanceof HTTPError)
    return new Response(error.message, { status: error.status, headers: error.headers });
  if (error instanceof ZodError)
    return serviceErrorJson({ error: "validation_error", issues: error.issues }, 400);
  if (error instanceof SyntaxError)
    return serviceErrorJson({ error: "invalid_json" }, 400);
});

export default onError(handleServiceError);
