import type { AccessSession } from "./types";

export const mockAccessSessions: AccessSession[] = [
  {
    id: "session-prod-db",
    resourceName: "Production Database",
    resourceType: "Database",
    accessType: "Read",
    status: "active",
    grantedTo: "alex@company.com",
    startedMinutesAgo: 2,
    expiresInMinutes: 45,
  },
  {
    id: "session-admin-panel",
    resourceName: "Admin Panel",
    resourceType: "Admin Panel",
    accessType: "Admin",
    status: "active",
    grantedTo: "sam@company.com",
    startedMinutesAgo: 14,
    expiresInMinutes: 21,
  },
  {
    id: "session-staging-api",
    resourceName: "Staging API",
    resourceType: "API",
    accessType: "Write",
    status: "expired",
    grantedTo: "dana@company.com",
    startedMinutesAgo: 84,
    expiresInMinutes: 0,
  },
];
