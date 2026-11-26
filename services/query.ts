import { HTTPError } from "nitro/h3"
import { type PageInput } from "@/schemas/insight"

export const notFound = () =>
  new HTTPError({
    status: 404,
    message: "not_found",
  });

export function page<T>(data: T[], total: number, input: PageInput) {
  return {
    data,
    pagination: {
      limit: input.limit,
      offset: input.offset,
      total,
      hasMore: input.offset + data.length < total,
    },
  };
}
