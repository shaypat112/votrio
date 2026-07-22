import { NextResponse } from "next/server";
import { handleGitHubScan } from "@/app/routes/scan";
import {
  extractSelectedTeamId,
  RequestAuthError,
  requireRequestAuth,
} from "@/app/lib/server/supabaseRest";
import { logServerError, logServerInfo } from "@/app/lib/server/logger";

export const runtime = "nodejs";

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Unexpected server error.";
}

export async function POST(request: Request) {
  const wantsEvents = request.headers.get("accept")?.includes("text/event-stream");
  try {
    const body = await request.json();
    const repoUrl = body?.repoUrl as string | undefined;
    const options = body?.options;
    const providerToken = typeof body?.providerToken === "string" ? body.providerToken : undefined;
    const { accessToken } = requireRequestAuth(request);
    const selectedTeamId = extractSelectedTeamId(request);

    if (!repoUrl) {
      return NextResponse.json({ error: "Missing repoUrl." }, { status: 400 });
    }

    logServerInfo("scan.started", { transport: wantsEvents ? "sse" : "json" });

    if (wantsEvents) {
      const encoder = new TextEncoder();
      const stream = new ReadableStream({
        async start(controller) {
          const send = (event: string, data: unknown) => {
            controller.enqueue(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`));
          };
          try {
            const result = await handleGitHubScan({
              repoUrl,
              options,
              accessToken,
              teamId: selectedTeamId,
              providerToken,
              onProgress: (stage, detail) => send("progress", { stage, detail }),
            });
            send("complete", result);
            logServerInfo("scan.completed", { findings: result.totalFindings });
          } catch (error) {
            logServerError("scan.failed", error);
            send("error", { error: getErrorMessage(error) });
          } finally {
            controller.close();
          }
        },
      });
      return new Response(stream, {
        headers: {
          "Content-Type": "text/event-stream",
          "Cache-Control": "no-cache, no-transform",
          Connection: "keep-alive",
        },
      });
    }

    const result = await handleGitHubScan({ repoUrl, options, accessToken, teamId: selectedTeamId, providerToken });
    logServerInfo("scan.completed", { findings: result.totalFindings });

    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof RequestAuthError) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const message = getErrorMessage(error);
    logServerError("scan.request_failed", error);
    if (message.includes("Invalid GitHub repository URL")) {
      return NextResponse.json({ error: message }, { status: 400 });
    }
    if (message.includes("authorization is required")) {
      return NextResponse.json({ error: message }, { status: 403 });
    }
    if (message.includes("rate limit")) {
      return NextResponse.json({ error: message }, { status: 429 });
    }
    if (message.includes("too large")) {
      return NextResponse.json({ error: message }, { status: 500 });
    }
    if (message.includes("Scan failed")) {
      return NextResponse.json({ error: message }, { status: 500 });
    }
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
