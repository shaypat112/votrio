import { NextResponse } from "next/server";

import {
  decodeUserId,
  getSupabaseEnv,
  supabaseFetch,
} from "@/app/lib/server/supabaseRest";

export const runtime = "nodejs";

const DEMO_ACCESS_CODE = "987321";
const MAX_ATTEMPTS = 3;
const DEMO_ACCESS_TYPE = "internal.demo_access";

type DemoAccessRow = {
  id: string;
  data?: {
    verified?: boolean;
    attempts?: number;
    locked?: boolean;
    lockedAt?: string | null;
  };
};

function buildStatus(row?: DemoAccessRow | null) {
  const attempts = Number(row?.data?.attempts ?? 0);
  const verified = Boolean(row?.data?.verified);
  const locked = Boolean(row?.data?.locked) || attempts >= MAX_ATTEMPTS;

  return {
    verified,
    locked,
    attempts,
    remainingAttempts: Math.max(0, MAX_ATTEMPTS - attempts),
    lockedAt: row?.data?.lockedAt ?? null,
  };
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

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const accessToken = searchParams.get("accessToken") ?? undefined;

    if (!accessToken) {
      return NextResponse.json({ error: "Missing accessToken." }, { status: 400 });
    }

    const userId = decodeUserId(accessToken);
    if (!userId) {
      return NextResponse.json({ error: "Invalid access token." }, { status: 401 });
    }

    const row = await loadState(accessToken, userId);
    return NextResponse.json({ status: buildStatus(row) });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unexpected server error." },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  try {
    const { accessToken, code } = await request.json();

    if (!accessToken || typeof code !== "string") {
      return NextResponse.json(
        { error: "Missing accessToken or code." },
        { status: 400 },
      );
    }

    const userId = decodeUserId(accessToken);
    if (!userId) {
      return NextResponse.json({ error: "Invalid access token." }, { status: 401 });
    }

    const current = await loadState(accessToken, userId);
    const currentStatus = buildStatus(current);

    if (currentStatus.verified) {
      return NextResponse.json({ status: currentStatus });
    }

    if (currentStatus.locked) {
      return NextResponse.json(
        {
          error: "Demo access is locked after 3 failed attempts.",
          status: currentStatus,
        },
        { status: 403 },
      );
    }

    const nextAttempts = currentStatus.attempts + 1;
    const isCorrect = code.trim() === DEMO_ACCESS_CODE;
    const nextDemoAccess = isCorrect
      ? {
          verified: true,
          attempts: nextAttempts,
          locked: false,
          lockedAt: null,
        }
      : {
          verified: false,
          attempts: nextAttempts,
          locked: nextAttempts >= MAX_ATTEMPTS,
          lockedAt: nextAttempts >= MAX_ATTEMPTS ? new Date().toISOString() : null,
        };

    const saved = await saveState(accessToken, userId, current?.id ?? null, nextDemoAccess);
    const nextStatus = buildStatus(saved as DemoAccessRow);

    if (!isCorrect) {
      return NextResponse.json(
        {
          error:
            nextStatus.locked
              ? "Demo access is now locked after 3 failed attempts."
              : "Incorrect access code.",
          status: nextStatus,
        },
        { status: nextStatus.locked ? 403 : 401 },
      );
    }

    return NextResponse.json({ status: nextStatus });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unexpected server error." },
      { status: 500 },
    );
  }
}
