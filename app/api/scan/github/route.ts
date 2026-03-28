import { NextResponse } from "next/server";
import { handleGitHubScan } from "@/app/routes/scan";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const repoUrl = body?.repoUrl as string | undefined;
    const options = body?.options;
    const accessToken = body?.accessToken as string | undefined;

    if (!repoUrl) {
      return NextResponse.json({ error: "Missing repoUrl." }, { status: 400 });
    }

    const result = await handleGitHubScan({ repoUrl, options, accessToken });

    return NextResponse.json(result);
  } catch (error: any) {
    const message = error?.message ?? "Unexpected server error.";
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
