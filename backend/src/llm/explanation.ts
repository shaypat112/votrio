/**
 * LLM Explanation Layer
 * Coordinates LLM providers for generating explanations
 */

import { OpenAIProvider } from "./openai-provider.js";
import { AnthropicProvider } from "./anthropic-provider.js";
import type { LLMProviderInterface } from "./provider.js";
import type { LLMProvider } from "../core/types.js";

export interface LLMConfig {
  provider: LLMProvider;
  enableExplanation: boolean;
}

export class LLMExplanationLayer {
  private provider: LLMProviderInterface;
  private config: LLMConfig;

  constructor(config: LLMConfig) {
    this.config = config;
    this.provider = this.createProvider(config.provider);
  }

  private createProvider(config: LLMProvider): LLMProviderInterface {
    switch (config.name) {
      case "openai":
        return new OpenAIProvider(config);
      case "anthropic":
        return new AnthropicProvider(config);
      default:
        console.warn(`Unknown provider: ${config.name}, defaulting to OpenAI`);
        return new OpenAIProvider(config);
    }
  }

  async generateExplanations(
    context: any,
    analyses: any,
    scores: any
  ): Promise<any> {
    if (!this.config.enableExplanation) {
      return this.getFallbackExplanations(analyses, scores);
    }

    if (!this.provider.isAvailable()) {
      console.warn("LLM provider not available, using fallback explanations");
      return this.getFallbackExplanations(analyses, scores);
    }

    try {
      return await this.provider.generateExplanations(context, analyses, scores);
    } catch (error) {
      console.error("Failed to generate LLM explanations:", error);
      return this.getFallbackExplanations(analyses, scores);
    }
  }

  private getFallbackExplanations(analyses: any, scores: any): any {
    return {
      summary: `Scan completed with ${scores.overall}/100 overall risk score. Repository analyzed for AI-generated code, architectural issues, scalability concerns, security vulnerabilities, and maintainability.`,
      riskExplanation: analyses.aiDetection.summary,
      architectureExplanation: analyses.architecture.summary,
      scalabilityExplanation: analyses.scalability.summary,
      securityExplanation: analyses.security.summary,
      maintainabilityExplanation: analyses.maintainability.summary,
      recommendedFixes: this.generateRecommendedFixes(analyses),
    };
  }

  private generateRecommendedFixes(analyses: any): string[] {
    const fixes: string[] = [];

    if (analyses.aiDetection.findings.length > 0) {
      fixes.push("Review AI-generated code for correctness and add human review processes");
    }

    if (analyses.architecture.findings.length > 0) {
      fixes.push("Refactor large files and break circular dependencies");
    }

    if (analyses.scalability.findings.length > 0) {
      fixes.push("Address performance bottlenecks and implement caching");
    }

    if (analyses.security.findings.length > 0) {
      fixes.push("Move secrets to environment variables and fix injection vulnerabilities");
    }

    if (analyses.maintainability.findings.length > 0) {
      fixes.push("Reduce code duplication and improve code complexity");
    }

    return fixes.length > 0 ? fixes : ["No critical issues detected - continue good practices"];
  }
}
