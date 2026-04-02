export type AccessStatus = "active" | "expired" | "revoked";
export type AccessLevel = "Read" | "Write" | "Admin";
export type ResourceOption = "Database" | "Admin Panel" | "API";
export type DurationOption = 15 | 30 | 60;

export type RepositorySummary = {
  id: string;
  name: string;
  repoUrl: string;
};

export type AccessSession = {
  id: string;
  resourceName: string;
  resourceType: ResourceOption;
  accessType: AccessLevel;
  status: AccessStatus;
  grantedTo: string;
  startedMinutesAgo: number;
  expiresInMinutes: number;
  repoId: string;
  repoName: string;
  repoUrl: string;
  reason: string;
  environmentName: string;
  environmentSlug: string;
  environmentRegion: string;
  sandboxRuntime: string;
  branchName: string;
  lastSyncedAt: string;
};

export type AccessRequestForm = {
  resourceType: ResourceOption;
  accessType: AccessLevel;
  durationMinutes: DurationOption;
  reason: string;
  repoId: string;
  repoName: string;
  repoUrl: string;
};
