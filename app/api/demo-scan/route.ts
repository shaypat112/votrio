import { NextResponse } from "next/server";

const MISTRAL_API_URL = "https://api.mistral.ai/v1/chat/completions";
const MODEL = process.env.MISTRAL_MODEL ?? "mistral-small-latest";
const MAX_CODE_LENGTH = 8000;

// This exact output contract (── separators, [SEVERITY] Title — description,
// indented "→ fix" lines, the "N issues found" summary, the trailing "Run:"
// line) is what components/landing's TerminalLine/colorize() on the demo
// page already knows how to render. Don't change this shape without
// updating that parser too.
const SYSTEM_PROMPT = `You are Votrio, an AI application-security scanner. You output ONLY a plain-text terminal scan report — never markdown, never code fences, never commentary before or after the report.

Analyze the code you're given like a senior AppSec engineer would: SQL injection, command injection, XSS, insecure deserialization, hardcoded secrets/credentials, SSRF, broken auth, path traversal, and other real, exploitable vulnerabilities. Ignore purely stylistic issues, missing types, or lint-level nitpicks.

Output format — follow this exactly, plain text only, no markdown:

─────────────────────────────
[CRITICAL] Short Title — one sentence describing the vulnerability and its real impact.
  → One short, concrete sentence describing the fix.
[HIGH] Short Title — one sentence describing the vulnerability and its real impact.
  → One short, concrete sentence describing the fix.
─────────────────────────────
N issues found · X critical · Y high · Z medium · W low
Run: votrio fix --generate

Rules:
- Order findings most severe first: CRITICAL, then HIGH, then MEDIUM, then LOW.
- Each finding is exactly two lines: the "[SEVERITY] Title — description" line, then one line indented with exactly two spaces starting with "→ " for the fix.
- Keep every description and fix to one short, plain sentence each. No hedging, no fluff.
- The summary line must only list severities that actually occurred (omit "· 0 low" etc. entirely rather than showing zero counts).
- If you find zero real vulnerabilities, output exactly this and nothing else:
─────────────────────────────
✓ No vulnerabilities detected
─────────────────────────────
0 issues found
- Never wrap anything in backticks, asterisks, or markdown headers. Never add an introduction, disclaimer, or sign-off. Output nothing but the report itself.`;

function buildUserPrompt(code: string, language: string) {
  return `Language: ${language}\n\nCode:\n${code}`;
}

export async function POST(request: Request) {
  if (!process.env.MISTRAL_API_KEY) {
    console.error("MISTRAL_API_KEY is not set");
    return NextResponse.json(
      { error: "Scanner is temporarily unavailable." },
      { status: 500 },
    );
  }

  let code: string | undefined;
  let language = "javascript";

  try {
    const body = await request.json();
    code = typeof body?.code === "string" ? body.code : undefined;
    if (typeof body?.language === "string" && body.language.trim()) {
      language = body.language.trim();
    }
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  if (!code || !code.trim()) {
    return NextResponse.json({ error: "No code provided." }, { status: 400 });
  }

  const trimmedCode = code.slice(0, MAX_CODE_LENGTH);

  let upstream: Response;
  try {
    upstream = await fetch(MISTRAL_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.MISTRAL_API_KEY}`,
      },
      body: JSON.stringify({
        model: MODEL,
        temperature: 0.2,
        stream: true,
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: buildUserPrompt(trimmedCode, language) },
        ],
      }),
    });
  } catch (err) {
    console.error("Failed to reach Mistral:", err);
    return NextResponse.json({ error: "Scan failed. Please try again." }, { status: 502 });
  }

  if (!upstream.ok || !upstream.body) {
    const detail = await upstream.text().catch(() => "");
    console.error("Mistral API error:", upstream.status, detail);
    return NextResponse.json({ error: "Scan failed. Please try again." }, { status: 502 });
  }

  const encoder = new TextEncoder();
  const decoder = new TextDecoder();

  // Re-wrap Mistral's OpenAI-style SSE stream into the { text } SSE envelope
  // the demo page's runScan() already knows how to consume.
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const reader = upstream.body!.getReader();
      let buffer = "";

      const send = (text: string) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ text })}\n\n`));
      };

      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const events = buffer.split("\n\n");
          buffer = events.pop() ?? "";

          for (const rawEvent of events) {
            const line = rawEvent.trim();
            if (!line.startsWith("data:")) continue;
            const payload = line.slice(5).trim();
            if (!payload || payload === "[DONE]") continue;

            try {
              const parsed = JSON.parse(payload);
              const delta: string | undefined = parsed?.choices?.[0]?.delta?.content;
              if (delta) send(delta);
            } catch {
              // Skip malformed/partial chunk boundaries.
            }
          }
        }
      } catch (err) {
        console.error("Mistral stream error:", err);
        send("\n\nerror: connection interrupted");
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

// Static, intentionally-vulnerable sample snippets for the picker. These are
// fixtures for the editor, not scan results — real findings always come
// from the live Mistral call above.
const SAMPLES: Record<string, string> = {
  node: `const express = require("express");
const app = express();

app.get("/user/:id", (req, res) => {
  const id = req.params.id;
  db.query("SELECT * FROM users WHERE id = " + id, (err, results) => {
    res.send(results);
  });
});

app.get("/search", (req, res) => {
  const q = req.query.q;
  res.send("<div>Results for: " + q + "</div>");
});

app.post("/login", (req, res) => {
  const { username, password } = req.body;
  db.query(
    \`SELECT * FROM users WHERE username='\${username}' AND password='\${password}'\`,
    (err, results) => {
      if (results.length > 0) {
        res.send({ ok: true, token: "static-secret-token-123" });
      } else {
        res.send({ ok: false });
      }
    }
  );
});`,
  python: `from flask import Flask, request
import sqlite3, subprocess

app = Flask(__name__)

API_KEY = "sk-live-4f9a2b7c1e6d3a8f"

@app.route("/user")
def get_user():
    user_id = request.args.get("id")
    conn = sqlite3.connect("app.db")
    cursor = conn.execute("SELECT * FROM users WHERE id = " + user_id)
    return str(cursor.fetchall())

@app.route("/ping")
def ping():
    host = request.args.get("host")
    result = subprocess.run("ping -c 1 " + host, shell=True, capture_output=True)
    return result.stdout`,
  react: `import { useState } from "react";

export function CommentBox({ comment }: { comment: string }) {
  const [html, setHtml] = useState(comment);

  return (
    <div>
      <div dangerouslySetInnerHTML={{ __html: html }} />
      <img
        src={\`https://api.example.com/avatar?key=\${process.env.NEXT_PUBLIC_API_SECRET}\`}
      />
    </div>
  );
}`,
};

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const sample = searchParams.get("sample");
  const code = sample ? SAMPLES[sample] : undefined;

  if (!code) {
    return NextResponse.json({ error: "Unknown sample." }, { status: 404 });
  }

  return NextResponse.json({ code });
}
