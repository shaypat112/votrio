import { supabaseFetch, type SupabaseEnv } from "@/app/lib/server/supabaseRest";

export async function purgeUserData(options: {
  env: SupabaseEnv;
  accessToken: string;
  userId: string;
  days: number;
}) {
  const { env, accessToken, userId, days } = options;
  const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

  await supabaseFetch(
    env,
    `scan_history?user_id=eq.${userId}&created_at=lt.${cutoff}`,
    {
      method: "DELETE",
      accessToken,
    }
  );

  await supabaseFetch(
    env,
    `notifications?user_id=eq.${userId}&created_at=lt.${cutoff}`,
    {
      method: "DELETE",
      accessToken,
    }
  );
}
