/**
 * OpenAI-compatible Provider
 * Supports OpenAI API and compatible alternatives
 */

import type { LLMProviderInterface, LLMResponse } from "./provider.js";
import type { LLMProvider } from "../core/types.js";

export class OpenAIProvider implements LLMProviderInterface {
  name = "openai";
  private apiKey: string;
  private model: string;
  private endpoint: string;

  constructor(config: LLMProvider) {
    this.apiKey = config.apiKey || process.env.OPENAI_API_KEY || "";
    this.model = config.model || "gpt-4";
    this.endpoint = config.endpoint || "https://api.openai.com/v1";
  }

  isAvailable(): boolean {
    return !!this.apiKey;
  }

  async generateResponse(prompt: string): Promise<LLMResponse> {
    if (!this.isAvailable()) {
      throw new Error("OpenAI API key not configured");
    }

    try {
      const response = await fetch(`${this.endpoint}/chat/completions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          model: this.model,
          messages: [
            {
              role: "user",
              content: prompt,
            },
          ],
          max_tokens: 2000,
          temperature: 0.7,
        }),
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`OpenAI API error: ${error}`);
      }

      const data = await response.json();

      return {
        content: data.choices[0].message.content,
        model: data.model,
        usage: {
          promptTokens: data.usage.prompt_tokens,
          completionTokens: data.usage.completion_tokens,
          totalTokens: data.usage.total_tokens,
        },
      };
    } catch (error) {
      console.error("OpenAI API error:", error);
      throw error;
    }
  }

  async generateExplanations(context: any, analyses: any, scores: any): Promise<any> {
    const prompt = this.buildExplanationPrompt(context, analyses, scores);
    const response = await this.generateResponse(prompt);

    return this.parseExplanationResponse(response.content);
  }

  private buildExplanationPrompt(context: any, analyses: any, scores: any): string {
    return `You are an expert code analyst. Analyze this repository scan and provide:

1. A concise summary of what the repository does
2. Why certain code patterns are risky
3. How the architecture may break at scale
4. Prioritized actionable fixes

Repository Context:
- Languages: ${context.languages.join(", ")}
- Total Files: ${context.files.length}
- Total Lines: ${context.totalLines}
- Is Monorepo: ${context.isMonorepo}

Scores:
- Overall: ${scores.overall}/100
- AI Likelihood: ${scores.aiLikelihood}/100
- Architectural Risk: ${scores.architecturalRisk}/100
- Scalability Risk: ${scores.scalabilityRisk}/100
- Security Risk: ${scores.securityRisk}/100
- Maintainability: ${scores.maintainability}/100

Key Findings:
${this.formatFindings(analyses)}

Provide your response in the following JSON format:
{
  "summary": "2-3 sentence summary",
  "riskExplanation": "Explanation of main risks",
  "architectureExplanation": "Architecture analysis",
  "scalabilityExplanation": "Scalability concerns",
  "securityExplanation": "Security analysis",
  "maintainabilityExplanation": "Maintainability assessment",
  "recommendedFixes": ["fix1", "fix2", "fix3"]
}`;
  }

  private formatFindings(analyses: any): string {
    const findings = [];

    if (analyses.aiDetection.findings.length > 0) {
      findings.push(`AI Detection: ${analyses.aiDetection.findings.length} findings`);
    }

    if (analyses.architecture.findings.length > 0) {
      findings.push(`Architecture: ${analyses.architecture.findings.length} findings`);
    }

    if (analyses.scalability.findings.length > 0) {
      findings.push(`Scalability: ${analyses.scalability.findings.length} findings`);
    }

    if (analyses.security.findings.length > 0) {
      findings.push(`Security: ${analyses.security.findings.length} findings`);
    }

    if (analyses.maintainability.findings.length > 0) {
      findings.push(`Maintainability: ${analyses.maintainability.findings.length} findings`);
    }

    return findings.join("\n") || "No significant findings";
  }

  private parseExplanationResponse(content: string): any {
    try {
      // Try to parse as JSON
      const parsed = JSON.parse(content);
      return parsed;
    } catch {
      // If not JSON, return a simple structure
      return {
        summary: content.substring(0, 200),
        riskExplanation: "",
        architectureExplanation: "",
        scalabilityExplanation: "",
        securityExplanation: "",
        maintainabilityExplanation: "",
        recommendedFixes: [],
      };
    }
  }
}
