type JitSessionRow = {
  id: string;
  repo_id: string | null;
  resource_type: "Database" | "Admin Panel" | "API";
  access_type: "Read" | "Write" | "Admin";
  status: "active" | "expired" | "revoked";
  duration_minutes: number;
  reason: string;
  repo_name_snapshot: string | null;
  repo_url_snapshot: string | null;
  environment_name: string;
  environment_slug: string;
  environment_region: string;
  sandbox_runtime: string;
  branch_name: string;
  started_at: string;
  expires_at: string;
  last_synced_at: string;
};

function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function getMinutesSince(startedAt: string) {
  const diff = Date.now() - new Date(startedAt).getTime();
  return Math.max(0, Math.floor(diff / 60000));
}

function getRemainingMinutes(expiresAt: string, status: JitSessionRow["status"]) {
  if (status === "revoked") return 0;
  const diff = new Date(expiresAt).getTime() - Date.now();
  return Math.max(0, Math.ceil(diff / 60000));
}

export function mapJitSession(row: JitSessionRow) {
  const remaining = getRemainingMinutes(row.expires_at, row.status);
  const status =
    row.status === "active" && remaining <= 0 ? "expired" : row.status;

  return {
    id: row.id,
    resourceName:
      row.resource_type === "Database"
        ? "Production Database"
        : row.resource_type === "Admin Panel"
          ? "Admin Panel"
          : "Staging API",
    resourceType: row.resource_type,
    accessType: row.access_type,
    status,
    grantedTo: "Current user",
    startedMinutesAgo: getMinutesSince(row.started_at),
    expiresInMinutes: status === "active" ? remaining : 0,
    reason: row.reason,
    environmentName: row.environment_name,
    environmentSlug: row.environment_slug,
    environmentRegion: row.environment_region,
    sandboxRuntime: row.sandbox_runtime,
    branchName: row.branch_name,
    lastSyncedAt: row.last_synced_at,
  };
}

export function buildSessionInsertPayload(input: {
  userId: string;
  resourceType: "Database" | "Admin Panel" | "API";
  accessType: "Read" | "Write" | "Admin";
  durationMinutes: 15 | 30 | 60;
  reason: string;
}) {
  const now = new Date();
  const expiresAt = new Date(now.getTime() + input.durationMinutes * 60000);
  const environmentLabel =
    input.resourceType === "API"
      ? "API Sandbox"
      : input.resourceType === "Admin Panel"
        ? "Admin Sandbox"
        : "Database Sandbox";
  const baseSlug = slugify(environmentLabel);

  return {
    user_id: input.userId,
    repo_id: null,
    team_id: null,
    team_environment_id: null,
    resource_type: input.resourceType,
    access_type: input.accessType,
    status: "active",
    duration_minutes: input.durationMinutes,
    expires_at: expiresAt.toISOString(),
    reason: input.reason || `Temporary access requested for ${environmentLabel}.`,
    repo_name_snapshot: null,
    repo_url_snapshot: null,
    environment_name: environmentLabel,
    environment_slug: `${baseSlug}-jit`,
    environment_region: "us-east-1",
    sandbox_runtime:
      input.resourceType === "API"
        ? "Node.js 20 + API gateway mirror"
        : input.resourceType === "Admin Panel"
          ? "Next.js admin runtime"
          : "Postgres tunnel + restricted bastion",
    branch_name: "main",
    started_at: now.toISOString(),
    last_synced_at: now.toISOString(),
    created_at: now.toISOString(),
    updated_at: now.toISOString(),
  };
}
