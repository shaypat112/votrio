import { NextResponse } from "next/server";
import {
  RequestAuthError,
  getSupabaseEnv,
  requireRequestAuth,
  supabaseFetch,
} from "@/app/lib/server/supabaseRest";
import { adminSupabaseFetch, isAdminAccess } from "@/app/lib/server/admin";
import { canManageTeam } from "@/app/lib/server/teams";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const { memberId } = await request.json();
    const { accessToken, userId } = requireRequestAuth(request);

    if (!memberId) {
      return NextResponse.json({ error: "Missing memberId." }, { status: 400 });
    }

    const env = getSupabaseEnv();
    const isAdmin = await isAdminAccess(accessToken, userId).catch(() => false);
    const memberLookupRes = isAdmin
      ? await adminSupabaseFetch(
          `team_members?id=eq.${memberId}&select=id,team_id,user_id,role`,
        )
      : await supabaseFetch(
          env,
          `team_members?id=eq.${memberId}&select=id,team_id,user_id,role`,
          { accessToken },
        );

    if (!memberLookupRes.ok) {
      const text = await memberLookupRes.text();
      return NextResponse.json({ error: text }, { status: 500 });
    }

    const rows = await memberLookupRes.json();
    const member = rows?.[0];
    if (!member?.team_id) {
      return NextResponse.json({ error: "Member not found." }, { status: 404 });
    }

    const canManage = await canManageTeam(accessToken, userId, member.team_id);
    if (!canManage) {
      return NextResponse.json({ error: "Only team admins can remove members." }, { status: 403 });
    }

    if (member.role === "owner") {
      return NextResponse.json({ error: "Owners cannot be removed from their team." }, { status: 400 });
    }

    const res = isAdmin
      ? await adminSupabaseFetch(`team_members?id=eq.${memberId}`, {
          method: "DELETE",
        })
      : await supabaseFetch(env, `team_members?id=eq.${memberId}`, {
          method: "DELETE",
          accessToken,
        });

    if (!res.ok) {
      const text = await res.text();
      return NextResponse.json({ error: text }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof RequestAuthError) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json({ error: "Unexpected server error." }, { status: 500 });
  }
}
