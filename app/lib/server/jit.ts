import { getSupabaseEnv, supabaseFetch } from "./supabaseRest";

type RepositoryRow = {
  id: string;
  name: string;
  repo_url: string;
  team_id: string | null;
};

type EnvironmentRow = {
  id: string;
  name: string;
  slug: string;
  metadata?: Record<string, unknown> | null;
};

type JitSessionRow = {
  id: string;
  repo_id: string;
  resource_type: "Database" | "Admin Panel" | "API";
  access_type: "Read" | "Write" | "Admin";
  status: "active" | "expired" | "revoked";
  duration_minutes: number;
  reason: string;
  repo_name_snapshot: string;
  repo_url_snapshot: string;
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

function getStringValue(value: unknown, fallback: string) {
  return typeof value === "string" && value.trim().length > 0 ? value : fallback;
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
    repoId: row.repo_id,
    repoName: row.repo_name_snapshot,
    repoUrl: row.repo_url_snapshot,
    reason: row.reason,
    environmentName: row.environment_name,
    environmentSlug: row.environment_slug,
    environmentRegion: row.environment_region,
    sandboxRuntime: row.sandbox_runtime,
    branchName: row.branch_name,
    lastSyncedAt: row.last_synced_at,
  };
}

export async function fetchAccessibleRepository(accessToken: string, repoId: string) {
  const env = getSupabaseEnv();
  const res = await supabaseFetch(
    env,
    `repositories?id=eq.${repoId}&select=id,name,repo_url,team_id&limit=1`,
    { accessToken },
  );

  if (!res.ok) {
    throw new Error(await res.text());
  }

  const rows = (await res.json()) as RepositoryRow[];
  return rows[0] ?? null;
}

export async function fetchEnvironmentForRepository(
  accessToken: string,
  repo: RepositoryRow,
) {
  if (!repo.team_id) return null;

  const env = getSupabaseEnv();
  const res = await supabaseFetch(
    env,
    `team_environments?repo_id=eq.${repo.id}&select=id,name,slug,metadata&order=created_at.desc&limit=1`,
    { accessToken },
  );

  if (!res.ok) {
    return null;
  }

  const rows = (await res.json()) as EnvironmentRow[];
  return rows[0] ?? null;
}

export function buildSessionInsertPayload(input: {
  userId: string;
  repo: RepositoryRow;
  environment: EnvironmentRow | null;
  resourceType: "Database" | "Admin Panel" | "API";
  accessType: "Read" | "Write" | "Admin";
  durationMinutes: 15 | 30 | 60;
  reason: string;
}) {
  const now = new Date();
  const expiresAt = new Date(now.getTime() + input.durationMinutes * 60000);
  const metadata = input.environment?.metadata ?? {};
  const baseSlug = slugify(input.repo.name || input.repo.repo_url);

  return {
    user_id: input.userId,
    repo_id: input.repo.id,
    team_id: input.repo.team_id,
    team_environment_id: input.environment?.id ?? null,
    resource_type: input.resourceType,
    access_type: input.accessType,
    status: "active",
    duration_minutes: input.durationMinutes,
    expires_at: expiresAt.toISOString(),
    reason: input.reason || `Scoped access requested for ${input.repo.name}.`,
    repo_name_snapshot: input.repo.name,
    repo_url_snapshot: input.repo.repo_url,
    environment_name: input.environment?.name ?? `${input.repo.name} sandbox`,
    environment_slug: input.environment?.slug ?? `${baseSlug}-jit`,
    environment_region: getStringValue(metadata["region"], "us-east-1"),
    sandbox_runtime: getStringValue(
      metadata["runtime"],
      input.resourceType === "API"
        ? "Node.js 20 + API gateway mirror"
        : input.resourceType === "Admin Panel"
          ? "Next.js 16 + Supabase shadow env"
          : "Postgres tunnel + restricted bastion",
    ),
    branch_name: getStringValue(metadata["branch"], "main"),
    started_at: now.toISOString(),
    last_synced_at: now.toISOString(),
    created_at: now.toISOString(),
    updated_at: now.toISOString(),
  };
}
