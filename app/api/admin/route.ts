import { NextResponse } from "next/server";

import {
  getAdminIdentityConfig,
  getServiceRoleHeaders,
  isAdminAccess,
} from "@/app/lib/server/admin";
import { decodeUserId } from "@/app/lib/server/supabaseRest";

export const runtime = "nodejs";

const DEMO_ACCESS_TYPE = "internal.demo_access";
const DEMO_ACCESS_APPROVED_TYPE = "demo.access_approved";
const DEMO_ACCESS_REJECTED_TYPE = "demo.access_rejected";

type ProfileRow = {
  id: string;
  username?: string | null;
  full_name?: string | null;
};

type NotificationRow = {
  id: string;
  user_id?: string;
  created_at: string;
  type?: string;
  data?: Record<string, unknown>;
};

type ScanRow = {
  user_id?: string | null;
};

async function requireAdmin(accessToken: string) {
  const userId = decodeUserId(accessToken);
  if (!userId) {
    throw new Error("Invalid access token.");
  }

  const allowed = await isAdminAccess(accessToken, userId);
  if (!allowed) {
    const err = new Error("Not authorized.");
    (err as Error & { status?: number }).status = 403;
    throw err;
  }

  return userId;
}

async function adminFetch(path: string, init: RequestInit = {}) {
  const { env, headers } = getServiceRoleHeaders();
  return fetch(`${env.url}/rest/v1/${path}`, {
    ...init,
    headers: {
      ...headers,
      ...(init.headers ?? {}),
    },
  });
}

function buildDemoStatus(
  stateRow: NotificationRow | undefined,
  decisionRow: NotificationRow | undefined,
) {
  const requestedAt =
    typeof stateRow?.data?.requestedAt === "string"
      ? stateRow.data.requestedAt
      : null;
  const shouldApplyDecision =
    Boolean(decisionRow) &&
    (!requestedAt || Date.parse(decisionRow!.created_at) >= Date.parse(requestedAt));

  if (shouldApplyDecision && decisionRow?.type === DEMO_ACCESS_APPROVED_TYPE) {
    return "approved";
  }
  if (shouldApplyDecision && decisionRow?.type === DEMO_ACCESS_REJECTED_TYPE) {
    return "rejected";
  }
  if (typeof stateRow?.data?.status === "string") {
    return stateRow.data.status;
  }
  return "not_requested";
}

async function listUsers() {
  const [profilesRes, demoStateRes, decisionsRes, scansRes] = await Promise.all([
    adminFetch(
      "profiles?select=id,username,full_name&order=id.asc&limit=100",
    ),
    adminFetch(
      `notifications?type=eq.${DEMO_ACCESS_TYPE}&select=id,user_id,data,created_at&order=created_at.desc&limit=500`,
    ),
    adminFetch(
      `notifications?type=in.(${DEMO_ACCESS_APPROVED_TYPE},${DEMO_ACCESS_REJECTED_TYPE})&select=id,user_id,type,data,created_at&order=created_at.desc&limit=500`,
    ),
    adminFetch(
      "scan_history?select=user_id&order=created_at.desc&limit=500",
    ),
  ]);

  if (!profilesRes.ok || !demoStateRes.ok || !decisionsRes.ok || !scansRes.ok) {
    throw new Error("Unable to load admin data.");
  }

  const profiles = (await profilesRes.json()) as ProfileRow[];
  const demoStates = (await demoStateRes.json()) as NotificationRow[];
  const decisions = (await decisionsRes.json()) as NotificationRow[];
  const scans = (await scansRes.json()) as ScanRow[];

  const stateByUser = new Map<string, NotificationRow>();
  for (const row of demoStates) {
    if (row.user_id && !stateByUser.has(row.user_id)) {
      stateByUser.set(row.user_id, row);
    }
  }

  const decisionByUser = new Map<string, NotificationRow>();
  for (const row of decisions) {
    if (row.user_id && !decisionByUser.has(row.user_id)) {
      decisionByUser.set(row.user_id, row);
    }
  }

  const scanCounts = new Map<string, number>();
  for (const row of scans) {
    if (!row.user_id) continue;
    scanCounts.set(row.user_id, (scanCounts.get(row.user_id) ?? 0) + 1);
  }

  return profiles.map((profile) => {
    const stateRow = stateByUser.get(profile.id);
    const decisionRow = decisionByUser.get(profile.id);
    return {
      id: profile.id,
      username: profile.username ?? null,
      fullName: profile.full_name ?? null,
      demoStatus: buildDemoStatus(stateRow, decisionRow),
      requestedAt:
        typeof stateRow?.data?.requestedAt === "string"
          ? stateRow.data.requestedAt
          : null,
      approvedAt:
        decisionRow?.type === DEMO_ACCESS_APPROVED_TYPE
          ? (typeof decisionRow.data?.reviewedAt === "string"
              ? decisionRow.data.reviewedAt
              : decisionRow.created_at)
          : null,
      scanCount: scanCounts.get(profile.id) ?? 0,
    };
  });
}

async function upsertDemoState(userId: string, data: Record<string, unknown>) {
  const existingRes = await adminFetch(
    `notifications?user_id=eq.${userId}&type=eq.${DEMO_ACCESS_TYPE}&select=id&limit=1`,
  );
  if (!existingRes.ok) throw new Error("Unable to load demo state.");
  const existingRows = (await existingRes.json()) as Array<{ id: string }>;
  const existing = existingRows[0];

  const path = existing
    ? `notifications?id=eq.${existing.id}`
    : "notifications";
  const method = existing ? "PATCH" : "POST";
  const body = existing
    ? { data, read_at: new Date().toISOString() }
    : {
        user_id: userId,
        type: DEMO_ACCESS_TYPE,
        data,
        read_at: new Date().toISOString(),
        created_at: new Date().toISOString(),
      };

  const res = await adminFetch(path, {
    method,
    headers: { Prefer: "return=representation" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error("Unable to update demo state.");
}

async function createDecision(userId: string, approved: boolean) {
  const config = getAdminIdentityConfig();
  const res = await adminFetch("notifications", {
    method: "POST",
    headers: { Prefer: "return=representation" },
    body: JSON.stringify({
      user_id: userId,
      type: approved ? DEMO_ACCESS_APPROVED_TYPE : DEMO_ACCESS_REJECTED_TYPE,
      data: {
        approverUsername: config.profileUsername,
        reviewedAt: new Date().toISOString(),
      },
      created_at: new Date().toISOString(),
    }),
  });
  if (!res.ok) throw new Error("Unable to create decision notification.");
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const accessToken = searchParams.get("accessToken") ?? "";
    await requireAdmin(accessToken);

    const users = await listUsers();
    return NextResponse.json({
      config: getAdminIdentityConfig(),
      users,
    });
  } catch (error) {
    const status =
      typeof error === "object" &&
      error !== null &&
      "status" in error &&
      typeof (error as { status?: unknown }).status === "number"
        ? Number((error as { status?: unknown }).status)
        : 500;
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unexpected server error." },
      { status },
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const accessToken = body?.accessToken as string | undefined;
    const action = body?.action as string | undefined;
    const targetUserId = body?.targetUserId as string | undefined;

    if (!accessToken || !action || !targetUserId) {
      return NextResponse.json(
        { error: "Missing accessToken, action, or targetUserId." },
        { status: 400 },
      );
    }

    await requireAdmin(accessToken);

    if (action === "approve_demo") {
      await upsertDemoState(targetUserId, {
        verified: true,
        status: "approved",
        approvedAt: new Date().toISOString(),
        approverUsername: getAdminIdentityConfig().profileUsername,
      });
      await createDecision(targetUserId, true);
    } else if (action === "revoke_demo") {
      await upsertDemoState(targetUserId, {
        verified: false,
        status: "not_requested",
        approvedAt: null,
        rejectedAt: null,
        approverUsername: getAdminIdentityConfig().profileUsername,
      });
    } else if (action === "reject_demo") {
      await upsertDemoState(targetUserId, {
        verified: false,
        status: "rejected",
        rejectedAt: new Date().toISOString(),
        approverUsername: getAdminIdentityConfig().profileUsername,
      });
      await createDecision(targetUserId, false);
    } else {
      return NextResponse.json({ error: "Unsupported action." }, { status: 400 });
    }

    const users = await listUsers();
    return NextResponse.json({ users });
  } catch (error) {
    const status =
      typeof error === "object" &&
      error !== null &&
      "status" in error &&
      typeof (error as { status?: unknown }).status === "number"
        ? Number((error as { status?: unknown }).status)
        : 500;
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unexpected server error." },
      { status },
    );
  }
}
