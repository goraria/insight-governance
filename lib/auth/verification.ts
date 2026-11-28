import { createServiceVerification } from "@/modules/structure/service-verification";
import { applicationNamespaces } from "@/utils/constant";
import { authUrl, nodeEnv } from "@/utils/environment";

export const {
  verifyServiceRequest,
  serviceAuthFailure,
  serviceResourceMetadata,
} = createServiceVerification({
  service: "insight",
  authUrl,
  nodeEnv,
  applications: applicationNamespaces,
  scopeFor: (application, access) => `${application}:${access}`,
  publicUnavailableErrors: [
    "machine_oauth_not_configured",
    "sso_directory_unavailable",
    "sso_service_not_registered",
    "sso_service_bindings_unavailable",
  ],
});
