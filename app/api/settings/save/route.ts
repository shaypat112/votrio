import { NextResponse } from "next/server";
import { decodeUserId, getSupabaseEnv, supabaseFetch } from "@/app/lib/server/supabaseRest";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const accessToken = body?.accessToken as string | undefined;
    const settings = body?.settings as Record<string, any> | undefined;

    if (!accessToken || !settings) {
      return NextResponse.json({ error: "Missing accessToken or settings." }, { status: 400 });
    }

    const userId = decodeUserId(accessToken);
    if (!userId) {
      return NextResponse.json({ error: "Invalid access token." }, { status: 400 });
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
      fullName,
      username,
      avatarUrl,
      webhookEnabled,
      webhookUrl,
      webhookEvents,
      ...rest
    } = settings ?? {};

    const settingsPayload = {
      user_id: userId,
      data: rest ?? {},
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

    let savedData: any = null;

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
          email_alerts: rest.emailNotifications ?? true,
          scan_depth: rest.scanDepth ?? 3,
          ignored_paths: rest.ignoredPaths ?? "",
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

    if (webhookUrl || webhookEnabled) {
      const webhookPayload = {
        user_id: userId,
        url: webhookUrl ?? "",
        enabled: Boolean(webhookEnabled) && Boolean(webhookUrl),
        events: Array.isArray(webhookEvents) && webhookEvents.length > 0
          ? webhookEvents
          : ["repository.published", "review.created"],
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
    }

    return NextResponse.json({ settings: savedData?.data ?? rest });
  } catch (error) {
    return NextResponse.json({ error: "Unexpected server error." }, { status: 500 });
  }
}
