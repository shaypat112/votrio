// this is the route for finding the errors

import { NextResponse } from 'next/server';
import OpenAI from 'openai';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function POST(req: Request) {
  const { errorLog } = await req.json();

  const completion = await openai.chat.completions.create({
    model: "gpt-4",
    messages: [
      { role: "system", content: "You are a senior dev. Fix this stack trace." },
      { role: "user", content: errorLog }
    ],
  });

  return NextResponse.json({ 
    suggestion: completion.choices[0].message.content 
  });
}