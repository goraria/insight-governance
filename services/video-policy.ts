import { sql } from "drizzle-orm";
import { database } from "@/database";
import type { z } from "@gorth-com/structure/cores/zod";
import type { videoPolicySchema } from "@/schemas/video-policy";
export async function rawReadVideoPolicy(
  input: z.infer<typeof videoPolicySchema>,
) {
  const rows = (
    await database.execute(
      sql`SELECT e.resource_id,e.resource_type,e.type,u.external_user_id FROM enforcement e LEFT JOIN "user" u ON u.id=e.target_user_id WHERE e.application='video' AND e.starts_at<=clock_timestamp() AND e.revoked_at IS NULL AND (e.expires_at IS NULL OR e.expires_at>clock_timestamp()) AND (e.resource_id IN (${
        input.resourceIds.length
          ? sql.join(
              input.resourceIds.map((id) => sql`${id}`),
              sql`, `,
            )
          : sql`NULL`
      }) OR (e.resource_type='user' AND e.resource_id IN (${
        input.subjects.length
          ? sql.join(
              input.subjects.map((id) => sql`${id}`),
              sql`, `,
            )
          : sql`NULL`
      })) OR u.external_user_id IN (${
        input.subjects.length
          ? sql.join(
              input.subjects.map((id) => sql`${id}`),
              sql`, `,
            )
          : sql`NULL`
      }))`,
    )
  ).rows as {
    resource_id: string;
    resource_type: string;
    type: string;
    external_user_id: string | null;
  }[];
  return {
    removedResourceIds: rows
      .filter((r) => r.type === "content_removal")
      .map((r) => r.resource_id),
    restrictedSubjects: rows
      .filter(
        (r) =>
          ["ban", "suspension", "feature_restriction"].includes(r.type) &&
          (r.external_user_id || r.resource_type === "user"),
      )
      .map((r) => r.external_user_id ?? r.resource_id),
  };
}
