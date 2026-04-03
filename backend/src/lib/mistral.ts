const MISTRAL_API_KEY = process.env.MISTRAL_API_KEY;

type Severity = "low" | "medium" | "high" | "critical";

type FindingSummaryInput = {
  file: string;
  line: number;
  severity: Severity;
  type: string;
  message: string;
  suggestion?: string;
  snippet?: string;
};

export async function analyzeCode(
  prompt: string,
  model: string = "mistral-large-latest"
) {
  if (!MISTRAL_API_KEY) throw new Error("MISTRAL_API_KEY not set");

  try {
    const response = await fetch("https://api.mistral.ai/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${MISTRAL_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        temperature: 0.2,
        messages: [
          {
            role: "system",
            content:
              "You are a security reviewer. Return concise findings and refactoring advice.",
          },
          { role: "user", content: prompt },
        ],
        max_tokens: 500,
      }),
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(text);
    }

    const data = (await response.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    return data?.choices?.[0]?.message?.content ?? null;
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("Mistral API error:", message);
    return null;
  }
}

export async function summarizeFindings(
  findings: FindingSummaryInput[],
  model: string = "mistral-large-latest"
) {
  if (!MISTRAL_API_KEY || findings.length === 0) return null;

  const condensedFindings = findings.slice(0, 50).map((finding) => ({
    file: finding.file,
    line: finding.line,
    severity: finding.severity,
    type: finding.type,
    message: finding.message,
    suggestion: finding.suggestion ?? null,
    snippet: finding.snippet ?? null,
  }));

  try {
    const response = await fetch("https://api.mistral.ai/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${MISTRAL_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        temperature: 0.2,
        messages: [
          {
            role: "system",
            content:
              "You turn repository scan findings into a concise remediation summary. Do not invent files, lines, or vulnerabilities. Use only the provided findings. Return 2-5 short sentences in plain text with the highest-risk issues first and concrete fixes.",
          },
          {
            role: "user",
            content: `Summarize these findings for a developer:\n${JSON.stringify(condensedFindings, null, 2)}`,
          },
        ],
        max_tokens: 300,
      }),
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(text);
    }

    const data = (await response.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    return data?.choices?.[0]?.message?.content?.trim() ?? null;
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("Mistral summary error:", message);
    return null;
  }
}
