import { supabaseFetch, type SupabaseEnv } from "./supabaseRest";

export async function logActivity(
  env: SupabaseEnv,
  accessToken: string | undefined,
  payload: {
    actor_id: string | null;
    action: string;
    target_type?: string | null;
    target_id?: string | null;
    meta?: Record<string, unknown>;
  },
) {
  if (!accessToken) return;
  try {
    await supabaseFetch(env, "activity_log", {
      method: "POST",
      accessToken,
      headers: { Prefer: "return=minimal" },
      body: JSON.stringify({
        actor_id: payload.actor_id,
        action: payload.action,
        target_type: payload.target_type ?? null,
        target_id: payload.target_id ?? null,
        meta: payload.meta ?? {},
        created_at: new Date().toISOString(),
      }),
    });
  } catch {
    // Best-effort logging.
  }
}
