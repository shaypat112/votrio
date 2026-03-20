const MISTRAL_API_KEY = process.env.MISTRAL_API_KEY;

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
  } catch (err: any) {
    console.error("Mistral API error:", err.message);
    return null;
  }
}
