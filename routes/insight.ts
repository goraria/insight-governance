import { Hono } from "hono";
import { actListAppeals, actMyEnforcements } from "@/controllers/appeals";
import { actRecordChatEvent } from "@/controllers/chat";
import * as controllers from "@/controllers/insight";
import { actListMyEvents } from "@/controllers/insight";
import * as metrics from "@/controllers/metrics";
import { actRecordReaderEvent } from "@/controllers/reader";
import { actReadReaderPolicy } from "@/controllers/reader-policy";
import { actRecordSocialEvent } from "@/controllers/social";
import { actReadSocialPolicy } from "@/controllers/social-policy";
import {
  actRecordTaskEvent,
  actTaskWorkspaceActivity,
} from "@/controllers/task";
import { actRecordVideoEvent } from "@/controllers/video";
import { actReadVideoPolicy } from "@/controllers/video-policy";
import { requireAuth } from "@/middlewares/auth";
import { requireChatWorker } from "@/middlewares/chat-worker";
import { requireLocalIdentity } from "@/middlewares/identity";
import { requireManager } from "@/middlewares/manager";
import { requireReaderPolicy } from "@/middlewares/reader-policy";
import { requireReaderWorker } from "@/middlewares/reader-worker";
import { requireSocialPolicy } from "@/middlewares/social-policy";
import { requireSocialWorker } from "@/middlewares/social-worker";
import { requireTaskWorker } from "@/middlewares/task-worker";
import { requireVideoPolicy } from "@/middlewares/video-policy";
import { requireVideoWorker } from "@/middlewares/video-worker";

export const insightRoutes = new Hono();

insightRoutes.patch(
  "/moderation/report/:id",
  requireAuth("write"),
  requireManager(),
  controllers.actReviewReport,
);
insightRoutes.post("/chat/event", requireChatWorker(), actRecordChatEvent);
insightRoutes.get(
  "/enforcement/me",
  requireAuth("read"),
  requireLocalIdentity(),
  actMyEnforcements,
);
insightRoutes.get("/me/event", requireAuth("read"), actListMyEvents);
insightRoutes.get(
  "/moderation/report",
  requireAuth("read"),
  requireManager(),
  controllers.actListReports,
);
insightRoutes.post(
  "/moderation/report",
  requireAuth("write"),
  requireLocalIdentity(),
  controllers.actCreateReport,
);
insightRoutes.post("/reader/event", requireReaderWorker(), actRecordReaderEvent);
insightRoutes.post("/reader/policy", requireReaderPolicy(), actReadReaderPolicy);
insightRoutes.get(
  "/risk/assessment",
  requireAuth("read"),
  requireManager(),
  controllers.actListAssessments,
);
insightRoutes.post(
  "/risk/assessment",
  requireAuth("write"),
  requireManager(),
  controllers.actAssessRisk,
);
insightRoutes.get(
  "/risk/rule",
  requireAuth("read"),
  requireManager(),
  controllers.actListRiskRules,
);
insightRoutes.post(
  "/risk/rule",
  requireAuth("write"),
  requireManager(),
  controllers.actCreateRiskRule,
);
insightRoutes.post("/social/event", requireSocialWorker(), actRecordSocialEvent);
insightRoutes.post("/social/policy", requireSocialPolicy(), actReadSocialPolicy);
insightRoutes.post("/task/activity", requireTaskWorker(), actTaskWorkspaceActivity);
insightRoutes.post("/task/event", requireTaskWorker(), actRecordTaskEvent);
insightRoutes.post("/video/event", requireVideoWorker(), actRecordVideoEvent);
insightRoutes.post("/video/policy", requireVideoPolicy(), actReadVideoPolicy);
insightRoutes.post(
  "/enforcement/:id/appeal",
  requireAuth("write"),
  requireLocalIdentity(),
  controllers.actCreateAppeal,
);
insightRoutes.post(
  "/metric/:id/calculate",
  requireAuth("write"),
  requireManager(),
  metrics.actCalculateMetric,
);
insightRoutes.patch(
  "/appeal/:id",
  requireAuth("write"),
  requireManager(),
  controllers.actDecideAppeal,
);
insightRoutes.get(
  "/analytics",
  requireAuth("read"),
  requireManager(),
  controllers.actAnalyticsSummary,
);
insightRoutes.get("/appeal", requireAuth("read"), requireManager(), actListAppeals);
insightRoutes.get(
  "/audit",
  requireAuth("read"),
  requireManager(),
  controllers.actListAudit,
);
insightRoutes.post(
  "/audit",
  requireAuth("write"),
  requireManager(),
  controllers.actRecordAudit,
);
insightRoutes.get(
  "/enforcement",
  requireAuth("read"),
  requireManager(),
  controllers.actListEnforcements,
);
insightRoutes.post(
  "/enforcement",
  requireAuth("write"),
  requireManager(),
  controllers.actCreateEnforcement,
);
insightRoutes.get(
  "/event",
  requireAuth("read"),
  requireManager(),
  controllers.actListEvents,
);
insightRoutes.post("/event", requireAuth("write"), controllers.actRecordEvent);
insightRoutes.get(
  "/metric",
  requireAuth("read"),
  requireManager(),
  metrics.actListMetrics,
);
insightRoutes.post(
  "/metric",
  requireAuth("write"),
  requireManager(),
  metrics.actCreateMetric,
);
