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
    const { memberId, role } = await request.json();
    const { accessToken, userId } = requireRequestAuth(request);

    if (!memberId || (role !== "member" && role !== "admin")) {
      return NextResponse.json(
        { error: "Missing memberId or invalid role." },
        { status: 400 },
      );
    }

    const env = getSupabaseEnv();
    const isAdmin = await isAdminAccess(accessToken, userId).catch(() => false);
    const lookupRes = isAdmin
      ? await adminSupabaseFetch(
          `team_members?id=eq.${memberId}&select=id,team_id,role,user_id`,
        )
      : await supabaseFetch(
          env,
          `team_members?id=eq.${memberId}&select=id,team_id,role,user_id`,
          { accessToken },
        );

    if (!lookupRes.ok) {
      return NextResponse.json({ error: await lookupRes.text() }, { status: 500 });
    }

    const rows = await lookupRes.json();
    const member = rows?.[0];
    if (!member?.team_id) {
      return NextResponse.json({ error: "Member not found." }, { status: 404 });
    }

    const canManage = await canManageTeam(accessToken, userId, member.team_id);
    if (!canManage) {
      return NextResponse.json(
        { error: "Only team admins can update roles." },
        { status: 403 },
      );
    }

    if (member.role === "owner") {
      return NextResponse.json(
        { error: "Owner roles cannot be changed." },
        { status: 400 },
      );
    }

    const updateRes = isAdmin
      ? await adminSupabaseFetch(`team_members?id=eq.${memberId}`, {
          method: "PATCH",
          headers: { Prefer: "return=representation" },
          body: JSON.stringify({
            role,
          }),
        })
      : await supabaseFetch(env, `team_members?id=eq.${memberId}`, {
          method: "PATCH",
          accessToken,
          headers: { Prefer: "return=representation" },
          body: JSON.stringify({
            role,
          }),
        });

    if (!updateRes.ok) {
      return NextResponse.json({ error: await updateRes.text() }, { status: 500 });
    }

    const updatedRows = await updateRes.json();
    return NextResponse.json({ member: updatedRows?.[0] ?? null });
  } catch (error) {
    if (error instanceof RequestAuthError) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unexpected server error." },
      { status: 500 },
    );
  }
}
