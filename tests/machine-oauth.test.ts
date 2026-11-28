import { beforeAll, beforeEach, expect, it, vi } from "vitest";
import { HTTPError } from "nitro/h3";
import {
  generateKeyPair,
  exportJWK,
  SignJWT,
} from "@gorth-com/principle/cores/jose";
vi.mock("@/modules/structure/sso-directory", () => ({
  requireServiceMachineBinding: async (_service: string, _audience: string, id: string) => {
    if (!["existing-confidential-client", "rotated-existing-client"].includes(id))
      throw new HTTPError({ status: 403 });
  },
  getServiceOrigin: async () => "https://machine-service.example.test",
}));
vi.mock("@/utils/environment", () => ({
  authUrl: "https://machine-auth.example.test",
  nodeEnv: "production",
  isProduction: true,
}));
import { verifyMachineRequest } from "@/lib/auth/machine";
import { serviceAuthFailure, serviceResourceMetadata } from "@/lib/auth/verification";
import { createInsufficientScopeError } from "better-auth/oauth2";
let pair: Awaited<ReturnType<typeof generateKeyPair>>;
let key: Awaited<ReturnType<typeof exportJWK>>;
beforeAll(async () => {
  pair = await generateKeyPair("ES256");
  key = {
    ...(await exportJWK(pair.publicKey)),
    kid: "machine-verification",
    alg: "ES256",
  };
});
beforeEach(() => {
  vi.spyOn(globalThis, "fetch").mockImplementation(async (input) => {
    const url = input instanceof Request ? input.url : String(input);
    if (url !== "https://machine-auth.example.test/auth/jwks")
      throw new Error("Unexpected auth hop");
    return Response.json({ keys: [key] });
  });
});
async function token(override: Record<string, unknown> = {}, typ = "at+jwt") {
  const now = Math.floor(Date.now() / 1000);
  return new SignJWT({
    iss: "https://machine-auth.example.test/auth",
    aud: "https://machine-service.example.test",
    sub: "existing-confidential-client",
    client_id: "existing-confidential-client",
    scope: "task:insight:publish",
    iat: now,
    exp: now + 120,
    ...override,
  })
    .setProtectedHeader({ alg: "ES256", kid: "machine-verification", typ })
    .sign(pair.privateKey);
}
function request(
  bearer?: string,
  headers: Record<string, string | undefined> = {},
) {
  const wire = new Headers();
  for (const [key, value] of Object.entries(headers))
    if (value !== undefined) wire.set(key, value);
  if (bearer) wire.set("Authorization", `Bearer ${bearer}`);
  return new Request("https://machine-service.example.test/internal", {
    headers: wire,
  });
}

it("accepts an existing confidential client with the exact machine scope", async () => {
  expect(
    await verifyMachineRequest(request(await token()), "task:insight:publish"),
  ).toMatchObject({ client_id: "existing-confidential-client" });
});

it("serves the resource metadata advertised by a native Bearer challenge", async () => {
  const response = await serviceAuthFailure(new HTTPError({ status: 401 }), request());
  expect(response.status).toBe(401);
  expect(response.headers.get("www-authenticate")).toMatch(
    /^Bearer resource_metadata="https:\/\/machine-service\.example\.test\/\.well-known\/oauth-protected-resource"$/,
  );
  const metadata = await serviceResourceMetadata();
  expect(await metadata.json()).toEqual({
    resource: "https://machine-service.example.test",
    authorization_servers: ["https://machine-auth.example.test/auth"],
    bearer_methods_supported: ["header"],
  });
});

it("advertises the missing scope but omits challenges for ordinary permission denials", async () => {
  const wireRequest = request("example-token");
  const missing = await serviceAuthFailure(
    createInsufficientScopeError(["chat:insight:publish"]),
    wireRequest,
  );
  expect(missing.headers.get("www-authenticate")).toContain('scope="chat:insight:publish"');
  const denied = await serviceAuthFailure(new HTTPError({ status: 403 }), wireRequest);
  expect(denied.headers.has("www-authenticate")).toBe(false);
});

it("advertises Bearer for a request using an unsupported authentication scheme", async () => {
  const response = await serviceAuthFailure(
    new HTTPError({ status: 401 }),
    new Request("https://machine-service.example.test/event", {
      headers: { Authorization: "DPoP example-token" },
    }),
  );
  expect(response.headers.get("www-authenticate")).toMatch(/^Bearer /);
});

it.each([
  ["sso_directory_unavailable", "sso_directory_unavailable"],
  ["sso_service_not_registered", "sso_service_not_registered"],
  ["sso_service_bindings_unavailable", "sso_service_bindings_unavailable"],
  ["private upstream detail", "auth_unavailable"],
])("reports only safe machine authorization diagnostics for %s", async (message, expected) => {
  const response = await serviceAuthFailure(new HTTPError({ status: 503, message }), request());
  expect(response.status).toBe(503);
  await expect(response.json()).resolves.toEqual({ error: expected });
});
it("does not require copying the existing client ID into receiver env", async () => {
  expect(
    await verifyMachineRequest(
      request(
        await token({
          client_id: "rotated-existing-client",
          sub: "rotated-existing-client",
        }),
      ),
      "task:insight:publish",
    ),
  ).toMatchObject({ client_id: "rotated-existing-client" });
});
it.each([
  { sub: "normal-user", sid: "user-session" },
  { scope: "task:read" },
  { exp: 1 },
  { aud: "https://foreign.example.test" },
  { iss: "https://foreign.example.test/auth" },
  { iat: 9999999999, exp: 99999999999 },
  { cnf: { jkt: "dpop-bound" } },
])("rejects user/wrong-scope/expired/misbound grants %j", async (override) => {
  await expect(
    verifyMachineRequest(
      request(await token(override)),
      "task:insight:publish",
    ),
  ).rejects.toBeTruthy();
});
it("rejects missing tokens, ID tokens and tampered signatures", async () => {
  await expect(
    verifyMachineRequest(request(), "task:insight:publish"),
  ).rejects.toBeTruthy();
  await expect(
    verifyMachineRequest(
      request(await token({}, "JWT")),
      "task:insight:publish",
    ),
  ).rejects.toBeTruthy();
  const parts = (await token()).split(".");
  parts[2] = "A".repeat(parts[2]!.length);
  await expect(
    verifyMachineRequest(request(parts.join(".")), "task:insight:publish"),
  ).rejects.toBeTruthy();
});
it.each([
  { Cookie: "session=user" },
  { Origin: "https://machine-service.example.test" },
  { "Sec-Fetch-Site": "same-origin" },
])(
  "rejects browser request headers even with a valid machine token %j",
  async (headers) => {
    await expect(
      verifyMachineRequest(
        request(await token(), headers),
        "task:insight:publish",
      ),
    ).rejects.toBeTruthy();
  },
);
