import { readRequestBody } from "@/utils/request";
import type { Event } from "@/utils/interface";

import { idSchema, metricSchema, rangeSchema } from "@/schemas/insight";
import {
  rawCreateMetricManagement as createMetricServices,
  rawListMetricsManagement as listMetricsServices,
  rawCalculateMetricManagement as calculateMetricServices,
} from "@/models/metric-definition";
export async function actCreateMetric(c: Event) {
  return c.json(
    await createMetricServices(
      metricSchema.parse(await readRequestBody(c.req)),
      c.get("app")!,
    ),
    {
      status: 201,
      headers: { "content-type": "application/json; charset=UTF-8" },
    },
  );
}
export async function actListMetrics(c: Event) {
  return c.json(await listMetricsServices(c.get("app")!), {
    headers: { "content-type": "application/json; charset=UTF-8" },
  });
}
export async function actCalculateMetric(c: Event) {
  return c.json(
    await calculateMetricServices(
      idSchema.parse(c.req.param("id")!),
      rangeSchema.parse(await readRequestBody(c.req)),
      c.get("app")!,
    ),
    { headers: { "content-type": "application/json; charset=UTF-8" } },
  );
}
