import { NextResponse } from "next/server";


const SAMPLES: Record<string, string> = {
  node: `// Node.js + SQL
app.get("/users", (req, res) => {
  const id = req.query.id;
  db.query("SELECT * FROM users WHERE id = " + id);
  res.send("ok");
});`,
  python: `# Flask + RCE
@app.route("/run")
def run():
    cmd = request.args.get("cmd")
    return os.popen(cmd).read()`,
  react: `// React XSS
export function Search({ query }) {
  return <div dangerouslySetInnerHTML={{ __html: query }} />;
}`,
};

function buildOutput(severity: "critical" | "high" | "medium" | "low") {
  const lines = [
    "● votrio scan started",
    "", 
    `[${severity.toUpperCase()}] HARDCODED_SECRET (78) - src/api/auth.ts:42`,
    "  Hardcoded credential detected",
    "  fix Move secrets to environment variables",
    "",
    "[MEDIUM] XSS_RISK (55) - src/pages/search.tsx:88",
    "  dangerouslySetInnerHTML detected",
    "  fix Sanitize user input before rendering",
    "",
    "2 issues found  critical  medium",
    "Random Error Occured ..~ Fetching AI Reasoning Model Mistral for support and LLM Reasoning"
  ];
  return lines.join("\n");
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const sample = searchParams.get("sample") ?? "node";
  return NextResponse.json({ code: SAMPLES[sample] ?? SAMPLES.node });
}

export async function POST(request: Request) {
  const { language } = await request.json();
  const severity =
    language === "python" ? "critical" : language === "tsx" ? "high" : "medium";

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const text = buildOutput(severity);
      const chunks = text.split("\n");

      for (const chunk of chunks) {
        const payload = `data: ${JSON.stringify({ text: chunk + "\n" })}\n\n`;
        controller.enqueue(encoder.encode(payload));
        await new Promise((r) => setTimeout(r, 40));
      }

      controller.close();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
