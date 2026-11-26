import { HTTPError } from "nitro/h3"
import { eq } from "drizzle-orm"
import { database } from "@/database"
import { user } from "@/database/schema"
import { z } from "@gorth-com/structure/cores/zod"
import { authUrl } from "@/utils/environment"

const profileSchema = z.object({
  sub: z.string(),
  email: z.email(),
  name: z.string().nullable().optional(),
  picture: z.string().nullable().optional(),
  status: z.literal("active"),
});

/** Called only when a business operation needs an Insight user FK, not on every JWT verification. */
export async function rawEnsureLocalIdentity(
  subject: string,
  authorization: string,
) {
  const [existing] = await database
    .select()
    .from(user)
    .where(eq(user.externalUserId, subject))
    .limit(1);
  if (existing) {
    if (existing.status !== "active")
      throw new HTTPError({
        status: 403,
        message: "",
      });
    return existing;
  }
  if (!authUrl)
    throw new HTTPError({
      status: 503,
      message: "",
    });
  const response = await fetch(new URL("/auth/oauth2/userinfo", authUrl), {
    headers: { Authorization: authorization, Accept: "application/json" },
    redirect: "error",
    cache: "no-store",
    signal: AbortSignal.timeout(10000),
  });
  if (!response.ok)
    throw new HTTPError({
      status: 503,
      message: "",
    });
  const profile = profileSchema.safeParse(await response.json());
  if (!profile.success || profile.data.sub !== subject)
    throw new HTTPError({
      status: 403,
      message: "",
    });
  const [record] = await database
    .insert(user)
    .values({
      externalUserId: subject,
      email: profile.data.email,
      name: profile.data.name ?? "",
      image: profile.data.picture,
    })
    .onConflictDoNothing({ target: user.externalUserId })
    .returning();
  if (record) return record;
  const [concurrent] = await database
    .select()
    .from(user)
    .where(eq(user.externalUserId, subject))
    .limit(1);
  if (!concurrent || concurrent.status !== "active")
    throw new HTTPError({
      status: 403,
      message: "",
    });
  return concurrent;
}

export async function rawRequireUserManagement(subject: string) {
  const [actor] = await database
    .select()
    .from(user)
    .where(eq(user.externalUserId, subject))
    .limit(1);
  if (
    !actor ||
    actor.status !== "active" ||
    !["admin", "master"].includes(actor.role)
  )
    throw new HTTPError({
      status: 403,
      message: "manager_required",
    });
  return actor;
}

export async function rawRequireLocalUser(subject: string) {
  const [actor] = await database
    .select()
    .from(user)
    .where(eq(user.externalUserId, subject))
    .limit(1);
  if (!actor || actor.status !== "active")
    throw new HTTPError({
      status: 403,
      message: "local_user_required",
    });
  return actor;
}
