// src/utils/config.ts
import Conf from "conf";

const store = new Conf<{ apiKey?: string }>({ projectName: "votrio" });

export async function getApiKey(): Promise<string | undefined> {
  return process.env.ANTHROPIC_API_KEY ?? store.get("apiKey");
}