import { NextResponse } from "next/server";
import { handleGitHubScan } from "@/app/routes/scan";
import {
  RequestAuthError,
  requireRequestAuth,
} from "@/app/lib/server/supabaseRest";

export const runtime = "nodejs";

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Unexpected server error.";
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const repoUrl = body?.repoUrl as string | undefined;
    const options = body?.options;
    const { accessToken } = requireRequestAuth(request);

    if (!repoUrl) {
      return NextResponse.json({ error: "Missing repoUrl." }, { status: 400 });
    }

    const result = await handleGitHubScan({ repoUrl, options, accessToken });

    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof RequestAuthError) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const message = getErrorMessage(error);
    if (message.includes("Invalid GitHub repository URL")) {
      return NextResponse.json({ error: message }, { status: 400 });
    }
    if (message.includes("Git is not available")) {
      return NextResponse.json({ error: message }, { status: 500 });
    }
    if (message.includes("Clone failed")) {
      return NextResponse.json({ error: message }, { status: 500 });
    }
    if (message.includes("Scan failed")) {
      return NextResponse.json({ error: message }, { status: 500 });
    }
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
