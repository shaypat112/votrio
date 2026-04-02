import { NextRequest } from "next/server";

export const runtime = "nodejs";

const SAMPLES: Record<string, string> = {
  node: `const express = require('express');
const db = require('./db');
const app = express();

app.get('/user', async (req, res) => {
  const id = req.query.id;
  const user = await db.query("SELECT * FROM users WHERE id = " + id);
  res.json(user);
});

app.post('/login', async (req, res) => {
  const { password } = req.body;
  const secret = process.env.JWT_SECRET || "supersecret123";
  const token = jwt.sign({ password }, secret);
  res.json({ token });
});

app.get('/search', (req, res) => {
  const q = req.query.q;
  res.send(\`<div>\${q}</div>\`);
});`,

  python: `import sqlite3
import subprocess
from flask import Flask, request

app = Flask(__name__)
API_KEY = "sk-live-abc123xyz789secret"

@app.route('/run')
def run_command():
    cmd = request.args.get('cmd')
    result = subprocess.run(cmd, shell=True, capture_output=True)
    return result.stdout

@app.route('/user')
def get_user():
    conn = sqlite3.connect('db.sqlite')
    name = request.args.get('name')
    cursor = conn.execute("SELECT * FROM users WHERE name='" + name + "'")
    return str(cursor.fetchall())`,

  react: `import React from 'react';

function UserProfile({ userData }) {
  const token = "eyJhbGci...hardcoded_jwt_token_abc123";

  return (
    <div>
      <div dangerouslySetInnerHTML={{ __html: userData.bio }} />
      <script>
        var user = {JSON.stringify(userData)};
      </script>
    </div>
  );
}

function generateNonce() {
  return Math.random().toString(36).substring(2);
}

export default UserProfile;`,
};

type MistralStreamChunk = {
  choices?: Array<{
    delta?: {
      content?: string;
    };
  }>;
};

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const sample = searchParams.get("sample") as keyof typeof SAMPLES;
  return Response.json({ code: SAMPLES[sample] ?? SAMPLES.node });
}

export async function POST(req: NextRequest) {
  const { code, language } = (await req.json()) as {
    code?: string;
    language?: string;
  };

  const apiKey = process.env.MISTRAL_API_KEY;
  if (!apiKey) {
    return new Response(
      JSON.stringify({ error: "MISTRAL_API_KEY not configured" }),
      { status: 500 },
    );
  }

  if (!code?.trim()) {
    return new Response(JSON.stringify({ error: "Code is required" }), {
      status: 400,
    });
  }

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      const send = (text: string) => {
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify({ text })}\n\n`),
        );
      };

      try {
        send(`\r\n● votrio scan — analyzing ${language || "code"}\r\n`);
        send("● Running security checks with Mistral...\r\n\r\n");

        await sleep(250);

        const response = await fetch(
          "https://api.mistral.ai/v1/chat/completions",
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${apiKey}`,
            },
            body: JSON.stringify({
              model: process.env.MISTRAL_MODEL || "mistral-large-latest",
              temperature: 0.2,
              max_tokens: 900,
              stream: true,
              messages: [
                {
                  role: "system",
                  content: `You are votrio, a CLI security scanner. Analyze code for security vulnerabilities and output EXACTLY in this terminal format, nothing else:

For each vulnerability found, output one line like:
[SEVERITY] TYPE — filename.ext:LINE_NUMBER
  Description of the issue in one sentence
  → code snippet showing the problem

Severity must be one of: [CRITICAL] [HIGH] [MEDIUM] [LOW]

After all findings, output:
─────────────────────────────────────────────────────
N issue(s) found  X critical  Y high  Z medium  W low

Then output:
Run: votrio scan --fix   to auto-patch safe issues

Keep findings realistic. Max 5 findings. Use realistic line numbers. No markdown, no extra text, no headers.`,
                },
                {
                  role: "user",
                  content: `Scan this ${language || "code"} for security vulnerabilities:\n\n\`\`\`${language || ""}\n${code}\n\`\`\``,
                },
              ],
            }),
          },
        );

        if (!response.ok) {
          const err = await response.text();
          throw new Error(`Mistral API error ${response.status}: ${err}`);
        }

        const reader = response.body?.getReader();
        if (!reader) {
          throw new Error("No response stream returned from Mistral.");
        }

        const decoder = new TextDecoder();

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value, { stream: true });
          const lines = chunk.split("\n");

          for (const line of lines) {
            if (!line.startsWith("data: ")) continue;
            const data = line.slice(6).trim();
            if (data === "[DONE]") continue;

            try {
              const parsed = JSON.parse(data) as MistralStreamChunk;
              const delta = parsed.choices?.[0]?.delta?.content;
              if (delta) send(delta);
            } catch {
              continue;
            }
          }
        }

        send("\r\n");
        controller.close();
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Unexpected demo scan error";
        send(`\r\nError: ${message}\r\n`);
        controller.close();
      }
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

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
