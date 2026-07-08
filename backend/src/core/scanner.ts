/**
 * Main Scanner Orchestrator
 * Coordinates repository scanning and analysis
 */

import { RepositoryScanner } from "../repository/scanner.js";
import { AIDetectionEngine } from "../analysis/ai-detection/engine.js";
import { ArchitectureAnalyzer } from "../analysis/architecture/analyzer.js";
import { ScalabilityAnalyzer } from "../analysis/scalability/analyzer.js";
import { SecurityAnalyzer } from "../analysis/security/analyzer.js";
import { MaintainabilityAnalyzer } from "../analysis/maintainability/analyzer.js";
import { LLMExplanationLayer } from "../llm/explanation.js";
import { ReportGenerator } from "../report/generator.js";
import type {
  ScanOptions,
  ScanReport,
  RepositoryContext,
  ScannerConfig,
} from "./types.js";

export class VotrioScanner {
  private repositoryScanner: RepositoryScanner;
  private aiDetectionEngine: AIDetectionEngine;
  private architectureAnalyzer: ArchitectureAnalyzer;
  private scalabilityAnalyzer: ScalabilityAnalyzer;
  private securityAnalyzer: SecurityAnalyzer;
  private maintainabilityAnalyzer: MaintainabilityAnalyzer;
  private llmExplanationLayer: LLMExplanationLayer;
  private reportGenerator: ReportGenerator;

  constructor(config: ScannerConfig) {
    this.repositoryScanner = new RepositoryScanner();
    this.aiDetectionEngine = new AIDetectionEngine(config.analyzers.aiDetection);
    this.architectureAnalyzer = new ArchitectureAnalyzer(config.analyzers.architecture);
    this.scalabilityAnalyzer = new ScalabilityAnalyzer(config.analyzers.scalability);
    this.securityAnalyzer = new SecurityAnalyzer(config.analyzers.security);
    this.maintainabilityAnalyzer = new MaintainabilityAnalyzer(config.analyzers.maintainability);
    this.llmExplanationLayer = new LLMExplanationLayer(config.llm);
    this.reportGenerator = new ReportGenerator(config.output);
  }

  async scan(options: ScanOptions): Promise<ScanReport> {
    // Phase 1: Repository Discovery
    const context = await this.repositoryScanner.scan(options);

    // Phase 2: Analysis
    const analyses = await this.runAnalyzers(context);

    // Phase 3: Score Calculation
    const scores = this.calculateScores(analyses);

    // Phase 4: LLM Explanation (if enabled)
    const explanations = await this.generateExplanations(context, analyses, scores);

    // Phase 5: Report Generation
    const report: ScanReport = {
      repository: {
        name: this.getRepositoryName(options.path),
        path: options.path,
        languages: context.languages,
        totalFiles: context.files.length,
        totalLines: context.totalLines,
        scannedAt: new Date().toISOString(),
      },
      scores,
      analyses,
      explanations,
      findings: this.aggregateFindings(analyses),
    };

    return report;
  }

  private async runAnalyzers(context: RepositoryContext) {
    const [aiDetection, architecture, scalability, security, maintainability] =
      await Promise.all([
        this.aiDetectionEngine.analyze(context),
        this.architectureAnalyzer.analyze(context),
        this.scalabilityAnalyzer.analyze(context),
        this.securityAnalyzer.analyze(context),
        this.maintainabilityAnalyzer.analyze(context),
      ]);

    return {
      aiDetection,
      architecture,
      scalability,
      security,
      maintainability,
    };
  }

  private calculateScores(analyses: {
    aiDetection: any;
    architecture: any;
    scalability: any;
    security: any;
    maintainability: any;
  }) {
    const aiLikelihood = analyses.aiDetection.metrics.aiLikelihoodScore;
    const architecturalRisk = analyses.architecture.metrics.architecturalRiskScore;
    const scalabilityRisk = analyses.scalability.metrics.scalabilityRiskScore;
    const securityRisk = analyses.security.metrics.securityRiskScore;
    const maintainability = analyses.maintainability.metrics.maintainabilityScore;

    // Overall score is weighted average, with security and maintainability having higher weight
    const overall = Math.round(
      (aiLikelihood * 0.15 +
        architecturalRisk * 0.2 +
        scalabilityRisk * 0.2 +
        securityRisk * 0.25 +
        maintainability * 0.2)
    );

    return {
      overall,
      aiLikelihood,
      architecturalRisk,
      scalabilityRisk,
      securityRisk,
      maintainability,
    };
  }

  private async generateExplanations(
    context: RepositoryContext,
    analyses: any,
    scores: any
  ) {
    try {
      return await this.llmExplanationLayer.generateExplanations(
        context,
        analyses,
        scores
      );
    } catch (error) {
      console.warn("Failed to generate LLM explanations:", error);
      return this.getFallbackExplanations(analyses, scores);
    }
  }

  private getFallbackExplanations(analyses: any, scores: any) {
    return {
      summary: `Scan completed with ${scores.overall}/100 overall risk score.`,
      riskExplanation: analyses.aiDetection.summary,
      architectureExplanation: analyses.architecture.summary,
      scalabilityExplanation: analyses.scalability.summary,
      securityExplanation: analyses.security.summary,
      maintainabilityExplanation: analyses.maintainability.summary,
      recommendedFixes: [],
    };
  }

  private aggregateFindings(analyses: any) {
    const allFindings = [
      ...analyses.aiDetection.findings,
      ...analyses.architecture.findings,
      ...analyses.scalability.findings,
      ...analyses.security.findings,
      ...analyses.maintainability.findings,
    ];

    // Sort by score (highest first) and limit
    return allFindings
      .sort((a, b) => b.score - a.score)
      .slice(0, 100);
  }

  private getRepositoryName(path: string): string {
    return path.split("/").pop() || "unknown";
  }
}
