export type AccessStatus = "active" | "expired";
export type AccessLevel = "Read" | "Write" | "Admin";
export type ResourceOption = "Database" | "Admin Panel" | "API";
export type DurationOption = 15 | 30 | 60;

export type AccessSession = {
  id: string;
  resourceName: string;
  resourceType: ResourceOption;
  accessType: AccessLevel;
  status: AccessStatus;
  grantedTo: string;
  startedMinutesAgo: number;
  expiresInMinutes: number;
};

export type AccessRequestForm = {
  resourceType: ResourceOption;
  accessType: AccessLevel;
  durationMinutes: DurationOption;
  reason: string;
};
