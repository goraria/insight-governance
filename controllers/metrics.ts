import { readRequestBody } from "@/utils/request";
import type { ApiContext } from "@/types/auth";

import { idSchema, metricSchema, rangeSchema } from "@/schemas/insight";
import {
  rawCreateMetricManagement as createMetricServices,
  rawListMetricsManagement as listMetricsServices,
  rawCalculateMetricManagement as calculateMetricServices,
} from "@/models/metric-definition";
export async function actCreateMetric(c: ApiContext) {
  return c.json(
    await createMetricServices(
      metricSchema.parse(await readRequestBody(c.req)),
      c.get("application")!,
    ),
    {
      status: 201,
      headers: { "content-type": "application/json; charset=UTF-8" },
    },
  );
}
export async function actListMetrics(c: ApiContext) {
  return c.json(await listMetricsServices(c.get("application")!), {
    headers: { "content-type": "application/json; charset=UTF-8" },
  });
}
export async function actCalculateMetric(c: ApiContext) {
  return c.json(
    await calculateMetricServices(
      idSchema.parse(c.req.param("id")!),
      rangeSchema.parse(await readRequestBody(c.req)),
      c.get("application")!,
    ),
    { headers: { "content-type": "application/json; charset=UTF-8" } },
  );
}
