export const applicationNamespaces = [
  "chat",
  "video",
  "reader",
  "social",
  "task",
  "marketplace",
  "restaurant",
] as const;

export type Application = (typeof applicationNamespaces)[number];
