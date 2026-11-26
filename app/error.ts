import { defineErrorHandler } from "nitro";

export function routeNotFound(request: Request) {
  return Response.json(
      { error: "Not Found", path: new URL(request.url).pathname },
      { status: 404 },
    );
}

export default defineErrorHandler((error, event) => {
  if (error.status === 404 || error.status === 405) return routeNotFound(event.req)
});
