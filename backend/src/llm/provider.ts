/**
 * LLM Provider Interface
 * Abstraction for different LLM providers
 */

import type { LLMProvider } from "../core/types.js";

export interface LLMResponse {
  content: string;
  model: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

export interface LLMProviderInterface {
  name: string;
  apiKey?: string;
  model?: string;
  endpoint?: string;
  generate(prompt: string, options?: Record<string, unknown>): Promise<LLMResponse>;
}

export interface LLMProviderInterface {
  name: string;
  isAvailable(): boolean;
  generateResponse(prompt: string): Promise<LLMResponse>;
  generateExplanations(context: any, analyses: any, scores: any): Promise<any>;
}
