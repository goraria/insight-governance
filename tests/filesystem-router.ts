import { Hono } from "hono"
import { insightRoutes } from "@/routes/insight"

export function filesystemRouter() {
  return new Hono().route("/insight", insightRoutes)
}
