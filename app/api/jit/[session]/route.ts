import { NextResponse } from "next/server";

type JitAction = "start" | "extend" | "revoke";

// NOTE: This is a minimal, stateless handler for development/testing.
// Replace with real DB-backed logic as needed.

export async function GET(_req: Request, { params }: { params: { session: string } }) {
  const { session } = params;
  // Return a mock session object. In a real implementation, fetch from DB.
  return NextResponse.json(
    {
      sessionId: session,
      status: "inactive",
      repoId: null,
      createdAt: new Date().toISOString(),
    },
    { status: 200 }
  );
}

export async function POST(req: Request, { params }: { params: { session: string } }) {
  const { session } = params;
  try {
    const body = await req.json().catch(() => ({}));
    const action = body.action as JitAction | undefined;
    if (!action) {
      return NextResponse.json({ error: "missing action" }, { status: 400 });
    }

    // Mock behavior for actions. Replace with real backend side-effects.
    if (action === "start") {
      return NextResponse.json({ sessionId: session, status: "active", startedAt: new Date().toISOString() }, { status: 200 });
    }

    if (action === "extend") {
      const { minutes } = body;
      return NextResponse.json({ sessionId: session, status: "active", extendedBy: minutes ?? 15 }, { status: 200 });
    }

    if (action === "revoke") {
      return NextResponse.json({ sessionId: session, status: "revoked", revokedAt: new Date().toISOString() }, { status: 200 });
    }

    return NextResponse.json({ error: "unknown action" }, { status: 400 });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
