import { HTTPError } from "nitro/h3";
import { getApplicationOrigin } from "@/modules/structure/sso-directory";
import { isProduction } from "@/utils/environment";
export async function canAppealReaderContent(
  resourceType: string,
  resourceId: string,
  bearer?: string,
) {
  if (!bearer)
    throw new HTTPError({ status: 503, message: "reader_policy_unavailable" });
  let base: URL;
  try {
    base = new URL(await getApplicationOrigin("reader"));
    if (
      base.username ||
      base.password ||
      base.search ||
      base.hash ||
      base.pathname !== "/" ||
      (base.protocol !== "https:" &&
        (isProduction ||
          base.protocol !== "http:" ||
          !["localhost", "127.0.0.1", "[::1]"].includes(base.hostname)))
    )
      throw new Error();
  } catch {
    throw new HTTPError({ status: 503, message: "reader_policy_unavailable" });
  }
  let result: Response;
  try {
    result = await fetch(new URL("/reader/access", base), {
      method: "POST",
      headers: { Authorization: bearer, "Content-Type": "application/json" },
      body: JSON.stringify({ resourceType, resourceId, action: "appeal" }),
      cache: "no-store",
      redirect: "error",
      signal: AbortSignal.timeout(10000),
    });
  } catch {
    throw new HTTPError({ status: 503, message: "reader_policy_unavailable" });
  }
  if ([401, 403, 404].includes(result.status)) return false;
  if (!result.ok)
    throw new HTTPError({ status: 503, message: "reader_policy_unavailable" });
  const body = (await result.json()) as { allowed?: boolean };
  return body.allowed === true;
}
