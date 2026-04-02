import { getSupabaseEnv, supabaseFetch } from "./supabaseRest";

type TeamRow = {
  id: string;
  owner_id: string;
};

type TeamMemberRow = {
  team_id: string;
  role?: string;
};

export async function getOwnedTeamIds(accessToken: string, userId: string) {
  const env = getSupabaseEnv();
  const res = await supabaseFetch(
    env,
    `teams?owner_id=eq.${userId}&select=id`,
    { accessToken },
  );

  if (!res.ok) {
    throw new Error(await res.text());
  }

  const rows = (await res.json()) as TeamRow[];
  return rows.map((row) => row.id);
}

export async function getAccessibleTeamIds(accessToken: string, userId: string) {
  const env = getSupabaseEnv();
  const [ownedRes, memberRes] = await Promise.all([
    supabaseFetch(env, `teams?owner_id=eq.${userId}&select=id`, {
      accessToken,
    }),
    supabaseFetch(env, `team_members?user_id=eq.${userId}&select=team_id`, {
      accessToken,
    }),
  ]);
  if (!ownedRes.ok) {
    throw new Error(await ownedRes.text());
  }

  const owned = (await ownedRes.json()) as TeamRow[];

  // If team_members table doesn't exist (schema not applied) we fallback to owned teams only.
  let members: TeamMemberRow[] = [];
  if (memberRes.ok) {
    try {
      members = (await memberRes.json()) as TeamMemberRow[];
    } catch {
      members = [];
    }
  } else {
    const text = await memberRes.text().catch(() => "");
    if (!/PGRST|could not find table|column .* does not exist/i.test(text)) {
      // Unexpected error - surface it.
      throw new Error(text || "Failed to fetch team members");
    }
    // otherwise ignore and continue
    members = [];
  }

  return Array.from(
    new Set([
      ...owned.map((row) => row.id),
      ...members.map((row) => row.team_id),
    ]),
  );
}

export async function isTeamOwner(
  accessToken: string,
  userId: string,
  teamId: string,
) {
  const env = getSupabaseEnv();
  const res = await supabaseFetch(
    env,
    `teams?id=eq.${teamId}&owner_id=eq.${userId}&select=id`,
    { accessToken },
  );

  if (!res.ok) {
    throw new Error(await res.text());
  }

  const rows = (await res.json()) as TeamRow[];
  return rows.length > 0;
}
