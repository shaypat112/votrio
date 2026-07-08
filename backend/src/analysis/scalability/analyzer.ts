/**
 * Scalability Analyzer
 * Identifies patterns that commonly fail as projects grow
 */

import { StateAnalyzer } from "./state-analyzer.js";
import { DatabasePatternAnalyzer } from "./db-patterns.js";
import { PerformanceAnalyzer } from "./performance.js";
import { MemoryAnalyzer } from "./memory-analyzer.js";
import type {
  RepositoryContext,
  ScalabilityResult,
  AnalyzerConfig,
  Finding,
} from "../../core/types.js";

export class ScalabilityAnalyzer {
  private stateAnalyzer: StateAnalyzer;
  private databasePatternAnalyzer: DatabasePatternAnalyzer;
  private performanceAnalyzer: PerformanceAnalyzer;
  private memoryAnalyzer: MemoryAnalyzer;
  private config: AnalyzerConfig;

  constructor(config: AnalyzerConfig) {
    this.config = config;
    this.stateAnalyzer = new StateAnalyzer();
    this.databasePatternAnalyzer = new DatabasePatternAnalyzer();
    this.performanceAnalyzer = new PerformanceAnalyzer();
    this.memoryAnalyzer = new MemoryAnalyzer();
  }

  async analyze(context: RepositoryContext): Promise<ScalabilityResult> {
    const findings: Finding[] = [];

    // Run all scalability analyses
    const stateIssues = await this.stateAnalyzer.analyze(context);
    findings.push(...stateIssues);

    const dbPatternIssues = await this.databasePatternAnalyzer.analyze(context);
    findings.push(...dbPatternIssues);

    const performanceIssues = await this.performanceAnalyzer.analyze(context);
    findings.push(...performanceIssues);

    const memoryIssues = await this.memoryAnalyzer.analyze(context);
    findings.push(...memoryIssues);

    // Calculate scalability risk score
    const scalabilityRiskScore = this.calculateRiskScore(findings);

    return {
      category: "scalability",
      score: scalabilityRiskScore,
      findings,
      summary: this.generateSummary(scalabilityRiskScore, findings),
      metrics: {
        scalabilityRiskScore,
        globalStateIssues: stateIssues.length,
        databasePatternIssues: dbPatternIssues.length,
        performanceAntiPatterns: performanceIssues.length,
        memoryHeavyOperations: memoryIssues.length,
      },
    };
  }

  private calculateRiskScore(findings: Finding[]): number {
    if (findings.length === 0) return 0;

    const severityWeights = {
      critical: 100,
      high: 75,
      medium: 50,
      low: 25,
    };

    const totalScore = findings.reduce((sum, finding) => {
      return sum + severityWeights[finding.severity];
    }, 0);

    // Normalize to 0-100 range
    const maxPossibleScore = findings.length * 100;
    return Math.round((totalScore / maxPossibleScore) * 100);
  }

  private generateSummary(score: number, findings: Finding[]): string {
    if (score >= 70) {
      return `Critical scalability issues detected. ${findings.length} findings indicate significant performance bottlenecks that will impact growth.`;
    } else if (score >= 40) {
      return `Moderate scalability issues found. ${findings.length} findings suggest some performance improvements are needed for scale.`;
    } else if (score >= 20) {
      return `Minor scalability issues detected. ${findings.length} findings suggest room for performance optimization.`;
    } else {
      return `Good scalability characteristics. No significant performance issues detected.`;
    }
  }
}
