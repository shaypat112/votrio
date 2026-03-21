// this is the route for finding the errors

import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const { errorLog } = await req.json();

  const mistralKey = process.env.MISTRAL_API_KEY;
  if (!mistralKey) {
    return NextResponse.json({ error: "MISTRAL_API_KEY is missing." }, { status: 500 });
  }

  const completionRes = await fetch("https://api.mistral.ai/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${mistralKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "mistral-large-latest",
      temperature: 0.2,
      messages: [
        { role: "system", content: "You are a senior dev. Fix this stack trace." },
        { role: "user", content: errorLog },
      ],
      max_tokens: 350,
    }),
  });

  if (!completionRes.ok) {
    const text = await completionRes.text();
    return NextResponse.json({ error: `Mistral API error: ${text}` }, { status: 500 });
  }

  const completion = await completionRes.json();
  const suggestion = completion?.choices?.[0]?.message?.content ?? "";

  return NextResponse.json({ suggestion });
}
