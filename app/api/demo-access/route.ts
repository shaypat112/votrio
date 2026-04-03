import { NextResponse } from "next/server";

import { sendNotificationEmail } from "@/app/lib/server/email";
import {
  getAdminIdentityConfig,
  isAdminAccess,
} from "@/app/lib/server/admin";
import {
  RequestAuthError,
  getSupabaseEnv,
  requireRequestAuth,
  supabaseFetch,
} from "@/app/lib/server/supabaseRest";

export const runtime = "nodejs";

const DEMO_ACCESS_TYPE = "internal.demo_access";
const DEMO_ACCESS_REQUEST_TYPE = "demo.access_request";
const DEMO_ACCESS_APPROVED_TYPE = "demo.access_approved";
const DEMO_ACCESS_REJECTED_TYPE = "demo.access_rejected";

type DemoAccessRow = {
  id: string;
  data?: {
    verified?: boolean;
    status?: "not_requested" | "pending" | "approved" | "rejected";
    requestedAt?: string | null;
    approvedAt?: string | null;
    rejectedAt?: string | null;
    approverUsername?: string | null;
    requestId?: string | null;
    company?: string | null;
    useCase?: string | null;
    note?: string | null;
  };
};

type NotificationRow = {
  id: string;
  created_at: string;
  data?: Record<string, unknown>;
};

type ProfileRow = {
  id: string;
  username?: string | null;
  full_name?: string | null;
  avatar_url?: string | null;
};

function buildStatus(row?: DemoAccessRow | null) {
  return {
    verified: Boolean(row?.data?.verified),
    state: row?.data?.status ?? "not_requested",
    requestedAt: row?.data?.requestedAt ?? null,
    approvedAt: row?.data?.approvedAt ?? null,
    rejectedAt: row?.data?.rejectedAt ?? null,
    approverUsername: row?.data?.approverUsername ?? null,
    company: row?.data?.company ?? null,
    useCase: row?.data?.useCase ?? null,
    note: row?.data?.note ?? null,
    requestId: row?.data?.requestId ?? null,
  };
}

async function loadDecision(accessToken: string, userId: string) {
  const env = getSupabaseEnv();
  const res = await supabaseFetch(
    env,
    `notifications?user_id=eq.${userId}&type=in.(${DEMO_ACCESS_APPROVED_TYPE},${DEMO_ACCESS_REJECTED_TYPE})&select=id,type,data,created_at&order=created_at.desc&limit=1`,
    { accessToken },
  );

  if (!res.ok) {
    throw new Error(await res.text());
  }

  const rows = (await res.json()) as Array<
    NotificationRow & { type?: string }
  >;
  return rows[0] ?? null;
}

async function loadProfileById(accessToken: string, userId: string) {
  const env = getSupabaseEnv();
  const res = await supabaseFetch(
    env,
    `profiles?id=eq.${userId}&select=id,username,full_name,avatar_url&limit=1`,
    { accessToken },
  );

  if (!res.ok) {
    throw new Error(await res.text());
  }

  const rows = (await res.json()) as ProfileRow[];
  return rows[0] ?? null;
}

async function loadProfileByUsername(accessToken: string, username: string) {
  const env = getSupabaseEnv();
  const res = await supabaseFetch(
    env,
    `profiles?username=eq.${encodeURIComponent(username)}&select=id,username,full_name,avatar_url&limit=1`,
    { accessToken },
  );

  if (!res.ok) {
    throw new Error(await res.text());
  }

  const rows = (await res.json()) as ProfileRow[];
  return rows[0] ?? null;
}

async function loadState(accessToken: string, userId: string) {
  const env = getSupabaseEnv();
  const res = await supabaseFetch(
    env,
    `notifications?user_id=eq.${userId}&type=eq.${DEMO_ACCESS_TYPE}&select=id,data&order=created_at.desc&limit=1`,
    { accessToken },
  );

  if (!res.ok) {
    throw new Error(await res.text());
  }

  const rows = (await res.json()) as DemoAccessRow[];
  return rows[0] ?? null;
}

async function saveState(
  accessToken: string,
  userId: string,
  existingId: string | null,
  data: Record<string, unknown>,
) {
  const env = getSupabaseEnv();
  const path = existingId
    ? `notifications?id=eq.${existingId}&user_id=eq.${userId}`
    : "notifications";
  const method = existingId ? "PATCH" : "POST";
  const body = existingId
    ? {
        data,
        read_at: new Date().toISOString(),
      }
    : {
        user_id: userId,
        type: DEMO_ACCESS_TYPE,
        data,
        read_at: new Date().toISOString(),
        created_at: new Date().toISOString(),
      };

  const res = await supabaseFetch(env, path, {
    method,
    accessToken,
    headers: {
      Prefer: "return=representation",
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    throw new Error(await res.text());
  }

  const rows = await res.json();
  return rows?.[0] ?? null;
}

async function createNotification(
  accessToken: string,
  userId: string,
  type: string,
  data: Record<string, unknown>,
) {
  const env = getSupabaseEnv();
  const res = await supabaseFetch(env, "notifications", {
    method: "POST",
    accessToken,
    headers: { Prefer: "return=representation" },
    body: JSON.stringify({
      user_id: userId,
      type,
      data,
      created_at: new Date().toISOString(),
    }),
  });

  if (!res.ok) {
    throw new Error(await res.text());
  }

  const rows = (await res.json()) as NotificationRow[];
  return rows[0] ?? null;
}

async function loadPendingRequests(accessToken: string, approverId: string) {
  const env = getSupabaseEnv();
  const res = await supabaseFetch(
    env,
    `notifications?user_id=eq.${approverId}&type=eq.${DEMO_ACCESS_REQUEST_TYPE}&select=id,data,created_at&order=created_at.desc&limit=50`,
    { accessToken },
  );

  if (!res.ok) {
    throw new Error(await res.text());
  }

  const rows = (await res.json()) as NotificationRow[];
  return rows.filter((row) => row.data?.status === "pending");
}

async function updateNotification(
  accessToken: string,
  notificationId: string,
  userId: string,
  data: Record<string, unknown>,
) {
  const env = getSupabaseEnv();
  const res = await supabaseFetch(
    env,
    `notifications?id=eq.${notificationId}&user_id=eq.${userId}`,
    {
      method: "PATCH",
      accessToken,
      headers: { Prefer: "return=representation" },
      body: JSON.stringify({
        data,
        read_at: new Date().toISOString(),
      }),
    },
  );

  if (!res.ok) {
    throw new Error(await res.text());
  }

  const rows = (await res.json()) as NotificationRow[];
  return rows[0] ?? null;
}

function mapPendingRequest(row: NotificationRow) {
  return {
    id: row.id,
    createdAt: row.created_at,
    requesterId: String(row.data?.requesterId ?? ""),
    requesterName: String(row.data?.requesterName ?? "Unknown user"),
    requesterUsername:
      typeof row.data?.requesterUsername === "string"
        ? row.data.requesterUsername
        : null,
    company:
      typeof row.data?.company === "string" ? row.data.company : null,
    useCase:
      typeof row.data?.useCase === "string" ? row.data.useCase : null,
    note: typeof row.data?.note === "string" ? row.data.note : null,
    status: typeof row.data?.status === "string" ? row.data.status : "pending",
  };
}

async function loadApproverContext(accessToken: string, userId: string) {
  const approverUsername = getAdminIdentityConfig().profileUsername;
  const isApprover = await isAdminAccess(accessToken, userId);

  if (!isApprover) {
    return {
      approverUsername,
      isApprover: false,
      pendingRequests: [] as Array<ReturnType<typeof mapPendingRequest>>,
    };
  }

  const pendingRows = await loadPendingRequests(accessToken, userId);
  return {
    approverUsername,
    isApprover: true,
    pendingRequests: pendingRows.map(mapPendingRequest),
  };
}

export async function GET(request: Request) {
  try {
    const { accessToken, userId } = requireRequestAuth(request);

    const row = await loadState(accessToken, userId);
    const decision = await loadDecision(accessToken, userId);
    const approver = await loadApproverContext(accessToken, userId);

    const baseStatus = buildStatus(row);
    const shouldApplyDecision =
      Boolean(decision) &&
      (!baseStatus.requestedAt ||
        Date.parse(decision.created_at) >= Date.parse(baseStatus.requestedAt));
    const mergedStatus =
      shouldApplyDecision && decision?.type === DEMO_ACCESS_APPROVED_TYPE
        ? {
            ...baseStatus,
            verified: true,
            state: "approved" as const,
            approvedAt:
              typeof decision.data?.reviewedAt === "string"
                ? decision.data.reviewedAt
                : decision.created_at,
            approverUsername:
              typeof decision.data?.approverUsername === "string"
                ? decision.data.approverUsername
                : baseStatus.approverUsername,
          }
        : shouldApplyDecision && decision?.type === DEMO_ACCESS_REJECTED_TYPE
          ? {
              ...baseStatus,
              verified: false,
              state: "rejected" as const,
              rejectedAt:
                typeof decision.data?.reviewedAt === "string"
                  ? decision.data.reviewedAt
                  : decision.created_at,
              approverUsername:
                typeof decision.data?.approverUsername === "string"
                  ? decision.data.approverUsername
                  : baseStatus.approverUsername,
            }
          : baseStatus;

    return NextResponse.json({
      status: mergedStatus,
      approverUsername: approver.approverUsername,
      isApprover: approver.isApprover,
      pendingRequests: approver.pendingRequests,
    });
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

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const action = body?.action as string | undefined;
    const { accessToken, userId } = requireRequestAuth(request);

    if (!action) {
      return NextResponse.json(
        { error: "Missing action." },
        { status: 400 },
      );
    }

    if (action === "request") {
      const company =
        typeof body?.company === "string" ? body.company.trim() : "";
      const useCase =
        typeof body?.useCase === "string" ? body.useCase.trim() : "";
      const note = typeof body?.note === "string" ? body.note.trim() : "";

      if (!company || !useCase) {
        return NextResponse.json(
          { error: "Company and use case are required." },
          { status: 400 },
        );
      }

      const current = await loadState(accessToken, userId);
      const currentStatus = buildStatus(current);
      if (currentStatus.verified) {
        return NextResponse.json({ status: currentStatus });
      }
      if (currentStatus.state === "pending") {
        return NextResponse.json({
          status: currentStatus,
          approverUsername: currentStatus.approverUsername,
        });
      }

      const approverUsername = getAdminIdentityConfig().profileUsername;
      const approverProfile = await loadProfileByUsername(accessToken, approverUsername);
      if (!approverProfile?.id) {
        return NextResponse.json(
          { error: `Approver @${approverUsername} was not found.` },
          { status: 500 },
        );
      }

      const requesterProfile = await loadProfileById(accessToken, userId);
      const requesterName =
        requesterProfile?.full_name?.trim() ||
        requesterProfile?.username?.trim() ||
        "Demo user";

      const requestPayload = {
        requesterId: userId,
        requesterName,
        requesterUsername: requesterProfile?.username ?? null,
        company,
        useCase,
        note: note || null,
        approverUsername,
        status: "pending",
        requestedAt: new Date().toISOString(),
      };

      const requestNotification = await createNotification(
        accessToken,
        approverProfile.id,
        DEMO_ACCESS_REQUEST_TYPE,
        requestPayload,
      );

      await saveState(accessToken, userId, current?.id ?? null, {
        verified: false,
        status: "pending",
        requestedAt: requestPayload.requestedAt,
        approvedAt: null,
        rejectedAt: null,
        approverUsername,
        company,
        useCase,
        note: note || null,
        requestId: requestNotification?.id ?? null,
      });

      await sendNotificationEmail({
        user_id: approverProfile.id,
        type: DEMO_ACCESS_REQUEST_TYPE,
        data: requestPayload,
      });

      return NextResponse.json({
        status: {
          verified: false,
          state: "pending",
          requestedAt: requestPayload.requestedAt,
          approvedAt: null,
          rejectedAt: null,
          approverUsername,
          company,
          useCase,
          note: note || null,
          requestId: requestNotification?.id ?? null,
        },
        approverUsername,
      });
    }

    if (action === "approve" || action === "reject") {
      const requestId =
        typeof body?.requestId === "string" ? body.requestId : "";
      if (!requestId) {
        return NextResponse.json(
          { error: "Missing requestId." },
          { status: 400 },
        );
      }

      const approverContext = await loadApproverContext(accessToken, userId);
      if (!approverContext.isApprover) {
        return NextResponse.json({ error: "Not authorized." }, { status: 403 });
      }

      const pending = approverContext.pendingRequests.find(
        (item) => item.id === requestId,
      );
      if (!pending) {
        return NextResponse.json(
          { error: "Pending request not found." },
          { status: 404 },
        );
      }

      const reviewedAt = new Date().toISOString();
      const nextStatus = action === "approve" ? "approved" : "rejected";

      await updateNotification(accessToken, requestId, userId, {
        ...(pending as Record<string, unknown>),
        status: nextStatus,
        reviewedAt,
      });

      await createNotification(
        accessToken,
        pending.requesterId,
        action === "approve" ? DEMO_ACCESS_APPROVED_TYPE : DEMO_ACCESS_REJECTED_TYPE,
        {
          approverUsername: approverContext.approverUsername,
          company: pending.company,
          useCase: pending.useCase,
          reviewedAt,
        },
      );

      return NextResponse.json({
        ok: true,
        pendingRequests: approverContext.pendingRequests.filter(
          (item) => item.id !== requestId,
        ),
      });
    }

    return NextResponse.json({ error: "Unsupported action." }, { status: 400 });
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
