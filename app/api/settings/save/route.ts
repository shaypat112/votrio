import { NextResponse } from "next/server";
import {
  RequestAuthError,
  getSupabaseEnv,
  requireRequestAuth,
  supabaseFetch,
} from "@/app/lib/server/supabaseRest";

export const runtime = "nodejs";

type SettingsPayload = Record<string, unknown> & {
  fullName?: string | null;
  username?: string | null;
  avatarUrl?: string | null;
  webhookEnabled?: boolean;
  webhookUrl?: string | null;
  webhookEvents?: string[];
  emailNotifications?: boolean;
  scanDepth?: number;
  ignoredPaths?: string;
};

type SettingsRow = {
  data?: Record<string, unknown>;
};

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const settings = body?.settings as SettingsPayload | undefined;
    const { accessToken, userId } = requireRequestAuth(request);

    if (!settings) {
      return NextResponse.json({ error: "Missing settings." }, { status: 400 });
    }

    const env = getSupabaseEnv();

    const profilePayload = {
      id: userId,
      updated_at: new Date().toISOString(),
      full_name: settings.fullName ?? null,
      username: settings.username ?? null,
      avatar_url: settings.avatarUrl ?? null,
    };

    const profileUpsertRes = await supabaseFetch(env, "profiles", {
      method: "POST",
      accessToken,
      headers: {
        Prefer: "resolution=merge-duplicates",
      },
      body: JSON.stringify(profilePayload),
    });

    if (!profileUpsertRes.ok) {
      const text = await profileUpsertRes.text();
      return NextResponse.json({ error: text }, { status: 500 });
    }

    const {
      fullName: _fullName,
      username: _username,
      avatarUrl: _avatarUrl,
      webhookEnabled,
      webhookUrl,
      webhookEvents,
      ...rest
    } = settings ?? {};

    const normalized = {
      ...rest,
      retentionDays: 30,
    };

    const settingsPayload = {
      user_id: userId,
      data: normalized ?? {},
      updated_at: new Date().toISOString(),
    };

    const settingsRes = await supabaseFetch(env, "user_settings", {
      method: "POST",
      accessToken,
      headers: {
        Prefer: "resolution=merge-duplicates,return=representation",
      },
      body: JSON.stringify(settingsPayload),
    });

    let savedData: SettingsRow | Record<string, unknown> | null = null;

    if (!settingsRes.ok) {
      const text = await settingsRes.text();
      const legacyRes = await supabaseFetch(env, "user_settings", {
        method: "POST",
        accessToken,
        headers: {
          Prefer: "resolution=merge-duplicates,return=representation",
        },
        body: JSON.stringify({
          user_id: userId,
          email_alerts: settings.emailNotifications ?? true,
          scan_depth: settings.scanDepth ?? 3,
          ignored_paths: settings.ignoredPaths ?? "",
          updated_at: new Date().toISOString(),
        }),
      });

      if (!legacyRes.ok) {
        return NextResponse.json({ error: text }, { status: 500 });
      }
      const legacyRows = await legacyRes.json();
      savedData = legacyRows?.[0] ?? null;
    } else {
      const savedRows = await settingsRes.json();
      savedData = savedRows?.[0] ?? null;
    }

    const webhookPayload = {
      user_id: userId,
      url: webhookUrl ?? "",
      enabled: Boolean(webhookEnabled) && Boolean(webhookUrl),
      events: Array.isArray(webhookEvents) && webhookEvents.length > 0
        ? webhookEvents
        : ["repository.published", "review.created", "scan.completed"],
      updated_at: new Date().toISOString(),
    };

    const webhookRes = await supabaseFetch(env, "webhook_endpoints?on_conflict=user_id", {
      method: "POST",
      accessToken,
      headers: {
        Prefer: "resolution=merge-duplicates,return=representation",
      },
      body: JSON.stringify(webhookPayload),
    });

    if (!webhookRes.ok) {
      const text = await webhookRes.text();
      return NextResponse.json({ error: text }, { status: 500 });
    }

    return NextResponse.json({ settings: savedData?.data ?? normalized });
  } catch (error) {
    if (error instanceof RequestAuthError) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json({ error: "Unexpected server error." }, { status: 500 });
  }
}
