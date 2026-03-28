import { supabaseFetch, type SupabaseEnv } from "@/app/lib/server/supabaseRest";

export async function createNotification(options: {
  env: SupabaseEnv;
  accessToken: string;
  userId: string;
  type: string;
  data: Record<string, unknown>;
}) {
  const { env, accessToken, userId, type, data } = options;
  await supabaseFetch(env, "notifications", {
    method: "POST",
    accessToken,
    headers: { Prefer: "return=minimal" },
    body: JSON.stringify({
      user_id: userId,
      type,
      data,
      created_at: new Date().toISOString(),
    }),
  });
}
