/**
 * LLM Provider Interface
 * Abstraction for different LLM providers
 */

import type { LLMResponse, LLMProvider } from "../core/types.js";

export interface LLMProviderInterface {
  name: string;
  isAvailable(): boolean;
  generateResponse(prompt: string): Promise<LLMResponse>;
  generateExplanations(context: any, analyses: any, scores: any): Promise<any>;
}
