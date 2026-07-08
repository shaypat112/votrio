/**
 * AI Detection Engine
 * Detects AI-generated code using hybrid detection methods
 */

import { PatternAnalyzer } from "./pattern-analyzer.js";
import { ASTAnalyzer } from "./ast-analyzer.js";
import { LLMVerifier } from "./llm-verifier.js";
import type {
  RepositoryContext,
  AIDetectionResult,
  AnalyzerConfig,
  Finding,
} from "../../core/types.js";

export class AIDetectionEngine {
  private patternAnalyzer: PatternAnalyzer;
  private astAnalyzer: ASTAnalyzer;
  private llmVerifier: LLMVerifier;
  private config: AnalyzerConfig;

  constructor(config: AnalyzerConfig) {
    this.config = config;
    this.patternAnalyzer = new PatternAnalyzer();
    this.astAnalyzer = new ASTAnalyzer();
    this.llmVerifier = new LLMVerifier();
  }

  async analyze(context: RepositoryContext): Promise<AIDetectionResult> {
    const findings: Finding[] = [];
    let totalAIProbability = 0;
    let filesAnalyzed = 0;

    for (const file of context.files) {
      const fileResult = await this.analyzeFile(file, context);

      if (fileResult.aiProbability > 0.5) {
        findings.push(this.createFinding(file, fileResult));
      }

      totalAIProbability += fileResult.aiProbability;
      filesAnalyzed++;
    }

    const avgAIProbability = filesAnalyzed > 0 ? totalAIProbability / filesAnalyzed : 0;
    const aiLikelihoodScore = Math.round(avgAIProbability * 100);

    return {
      category: "ai-detection",
      score: aiLikelihoodScore,
      findings,
      summary: this.generateSummary(aiLikelihoodScore, findings.length, filesAnalyzed),
      metrics: {
        aiLikelihoodScore,
        confidence: this.calculateConfidence(findings, filesAnalyzed),
        suspiciousFiles: findings.length,
        totalFilesAnalyzed: filesAnalyzed,
      },
    };
  }

  private async analyzeFile(file: any, context: RepositoryContext) {
    const patternScore = await this.patternAnalyzer.analyze(file);
    const astScore = await this.astAnalyzer.analyze(file);

    // LLM verification is optional and can be expensive
    let llmScore = 0;
    if (this.config.customRules?.enableLLMVerification) {
      llmScore = await this.llmVerifier.verify(file);
    }

    // Weighted combination of different detection methods
    const aiProbability =
      (patternScore * 0.4) +
      (astScore * 0.4) +
      (llmScore * 0.2);

    return {
      aiProbability,
      patternScore,
      astScore,
      llmScore,
    };
  }

  private createFinding(file: any, result: any): Finding {
    return {
      id: `ai-detection-${file.path}`,
      type: "AI-GENERATED-CODE",
      severity: this.getSeverity(result.aiProbability),
      score: Math.round(result.aiProbability * 100),
      file: file.path,
      line: 1,
      message: `File appears to be AI-generated (confidence: ${Math.round(result.aiProbability * 100)}%)`,
      description: `Pattern analysis: ${Math.round(result.patternScore * 100)}%, AST analysis: ${Math.round(result.astScore * 100)}%`,
      category: "ai-detection",
    };
  }

  private getSeverity(probability: number): "low" | "medium" | "high" | "critical" {
    if (probability >= 0.8) return "critical";
    if (probability >= 0.6) return "high";
    if (probability >= 0.4) return "medium";
    return "low";
  }

  private calculateConfidence(findings: Finding[], totalFiles: number): number {
    if (totalFiles === 0) return 0;
    return Math.round((findings.length / totalFiles) * 100);
  }

  private generateSummary(score: number, suspiciousFiles: number, totalFiles: number): string {
    if (score >= 80) {
      return `High likelihood of AI-generated code detected. ${suspiciousFiles} of ${totalFiles} files appear to be AI-generated.`;
    } else if (score >= 50) {
      return `Moderate likelihood of AI-generated code. ${suspiciousFiles} of ${totalFiles} files show AI generation patterns.`;
    } else if (score >= 20) {
      return `Low likelihood of AI-generated code. ${suspiciousFiles} of ${totalFiles} files show some AI patterns.`;
    } else {
      return `Minimal AI-generated code detected. Code appears to be primarily human-written.`;
    }
  }
}
