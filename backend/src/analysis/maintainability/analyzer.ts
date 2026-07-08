/**
 * Maintainability Analyzer
 * Evaluates code quality and maintainability metrics
 */

import { ComplexityAnalyzer } from "./complexity.js";
import { DuplicationAnalyzer } from "./duplication.js";
import { CodeSmellAnalyzer } from "./code-smell.js";
import type {
  RepositoryContext,
  MaintainabilityResult,
  AnalyzerConfig,
  Finding,
} from "../../core/types.js";

export class MaintainabilityAnalyzer {
  private complexityAnalyzer: ComplexityAnalyzer;
  private duplicationAnalyzer: DuplicationAnalyzer;
  private codeSmellAnalyzer: CodeSmellAnalyzer;
  private config: AnalyzerConfig;

  constructor(config: AnalyzerConfig) {
    this.config = config;
    this.complexityAnalyzer = new ComplexityAnalyzer();
    this.duplicationAnalyzer = new DuplicationAnalyzer();
    this.codeSmellAnalyzer = new CodeSmellAnalyzer();
  }

  async analyze(context: RepositoryContext): Promise<MaintainabilityResult> {
    const findings: Finding[] = [];

    // Run all maintainability analyses
    const complexityIssues = await this.complexityAnalyzer.analyze(context);
    findings.push(...complexityIssues);

    const duplicationIssues = await this.duplicationAnalyzer.analyze(context);
    findings.push(...duplicationIssues);

    const codeSmells = await this.codeSmellAnalyzer.analyze(context);
    findings.push(...codeSmells);

    // Calculate maintainability score (inverted - higher is better)
    const maintainabilityScore = this.calculateMaintainabilityScore(findings);

    return {
      category: "maintainability",
      score: maintainabilityScore,
      findings,
      summary: this.generateSummary(maintainabilityScore, findings),
      metrics: {
        maintainabilityScore,
        complexityScore: this.calculateComplexityScore(complexityIssues),
        duplicationScore: this.calculateDuplicationScore(duplicationIssues),
        codeSmells: codeSmells.length,
      },
    };
  }

  private calculateMaintainabilityScore(findings: Finding[]): number {
    if (findings.length === 0) return 100;

    const severityWeights = {
      critical: 30,
      high: 20,
      medium: 10,
      low: 5,
    };

    const totalDeduction = findings.reduce((sum, finding) => {
      return sum + severityWeights[finding.severity];
    }, 0);

    // Start from 100 and deduct based on findings
    const score = Math.max(0, 100 - totalDeduction);
    return score;
  }

  private calculateComplexityScore(findings: Finding[]): number {
    if (findings.length === 0) return 100;
    return Math.max(0, 100 - (findings.length * 15));
  }

  private calculateDuplicationScore(findings: Finding[]): number {
    if (findings.length === 0) return 100;
    return Math.max(0, 100 - (findings.length * 20));
  }

  private generateSummary(score: number, findings: Finding[]): string {
    if (score >= 80) {
      return `Excellent maintainability. Code is well-structured and easy to maintain.`;
    } else if (score >= 60) {
      return `Good maintainability with room for improvement. ${findings.length} findings suggest some refactoring could help.`;
    } else if (score >= 40) {
      return `Moderate maintainability. ${findings.length} findings indicate areas where code quality could be improved.`;
    } else {
      return `Poor maintainability. ${findings.length} findings suggest significant refactoring is needed.`;
    }
  }
}
