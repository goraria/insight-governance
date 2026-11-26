import { createNitroErrorHandler } from "@gorth-com/principle/configs/nitro";
import { HTTPError, onError } from "nitro/h3";
import { ZodError } from "@gorth-com/structure/cores/zod";

export const handleServiceError = createNitroErrorHandler({
  project(error) {
    if (error instanceof HTTPError)
      return new Response(error.message, {
        status: error.status,
        headers: error.headers,
      });
    if (error instanceof ZodError)
      return Response.json(
        { error: "validation_error", issues: error.issues },
        {
          status: 400,
          headers: { "content-type": "application/json; charset=UTF-8" },
        },
      );
    if (error instanceof SyntaxError)
      return Response.json(
        { error: "invalid_json" },
        {
          status: 400,
          headers: { "content-type": "application/json; charset=UTF-8" },
        },
      );
    // Do not log event properties, personal data, tokens or database parameters.
    console.error("[insight-error] operation_failed");
    return Response.json(
      { error: "internal_server_error" },
      {
        status: 500,
        headers: { "content-type": "application/json; charset=UTF-8" },
      },
    );
  },
});

export default onError(handleServiceError);
