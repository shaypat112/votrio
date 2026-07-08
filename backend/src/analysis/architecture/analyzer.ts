/**
 * Architecture Analyzer
 * Analyzes architectural patterns and structural issues
 */

import { GodFileDetector } from "./god-file-detector.js";
import { CircularDependencyDetector } from "./circular-dep.js";
import { CouplingAnalyzer } from "./coupling-analyzer.js";
import { AbstractionLayerDetector } from "./abstraction-layers.js";
import type {
  RepositoryContext,
  ArchitectureResult,
  AnalyzerConfig,
  Finding,
} from "../../core/types.js";

export class ArchitectureAnalyzer {
  private godFileDetector: GodFileDetector;
  private circularDependencyDetector: CircularDependencyDetector;
  private couplingAnalyzer: CouplingAnalyzer;
  private abstractionLayerDetector: AbstractionLayerDetector;
  private config: AnalyzerConfig;

  constructor(config: AnalyzerConfig) {
    this.config = config;
    this.godFileDetector = new GodFileDetector();
    this.circularDependencyDetector = new CircularDependencyDetector();
    this.couplingAnalyzer = new CouplingAnalyzer();
    this.abstractionLayerDetector = new AbstractionLayerDetector();
  }

  async analyze(context: RepositoryContext): Promise<ArchitectureResult> {
    const findings: Finding[] = [];

    // Run all architecture analyses
    const godFiles = await this.godFileDetector.detect(context);
    findings.push(...godFiles);

    const circularDeps = await this.circularDependencyDetector.detect(context);
    findings.push(...circularDeps);

    const couplingIssues = await this.couplingAnalyzer.analyze(context);
    findings.push(...couplingIssues);

    const abstractionIssues = await this.abstractionLayerDetector.detect(context);
    findings.push(...abstractionIssues);

    // Calculate architectural risk score
    const architecturalRiskScore = this.calculateRiskScore(findings);

    return {
      category: "architecture",
      score: architecturalRiskScore,
      findings,
      summary: this.generateSummary(architecturalRiskScore, findings),
      metrics: {
        architecturalRiskScore,
        godFiles: godFiles.length,
        circularDependencies: circularDeps.length,
        couplingScore: this.calculateCouplingScore(couplingIssues),
        abstractionLayers: this.countAbstractionLayers(abstractionIssues),
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

  private calculateCouplingScore(findings: Finding[]): number {
    if (findings.length === 0) return 0;
    return Math.min(findings.length * 10, 100);
  }

  private countAbstractionLayers(findings: Finding[]): number {
    // Count unique abstraction layer issues
    const layers = new Set(findings.map(f => f.type));
    return layers.size;
  }

  private generateSummary(score: number, findings: Finding[]): string {
    if (score >= 70) {
      return `Critical architectural issues detected. ${findings.length} findings indicate significant structural problems that may impact maintainability and scalability.`;
    } else if (score >= 40) {
      return `Moderate architectural issues found. ${findings.length} findings suggest some structural improvements are needed.`;
    } else if (score >= 20) {
      return `Minor architectural issues detected. ${findings.length} findings suggest room for improvement in code organization.`;
    } else {
      return `Good architectural structure. No significant issues detected.`;
    }
  }
}
