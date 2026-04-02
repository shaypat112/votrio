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

  if (!memberRes.ok) {
    throw new Error(await memberRes.text());
  }

  const owned = (await ownedRes.json()) as TeamRow[];
  const members = (await memberRes.json()) as TeamMemberRow[];

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
