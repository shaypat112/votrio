/**
 * Security Analyzer
 * Identifies security vulnerabilities and risks
 */

import { SecretDetector } from "./secret-detector.js";
import { InjectionAnalyzer } from "./injection-analyzer.js";
import { AuthAnalyzer } from "./auth-analyzer.js";
import { CryptoAnalyzer } from "./crypto-analyzer.js";
import type {
  RepositoryContext,
  SecurityResult,
  AnalyzerConfig,
  Finding,
} from "../../core/types.js";

export class SecurityAnalyzer {
  private secretDetector: SecretDetector;
  private injectionAnalyzer: InjectionAnalyzer;
  private authAnalyzer: AuthAnalyzer;
  private cryptoAnalyzer: CryptoAnalyzer;
  private config: AnalyzerConfig;

  constructor(config: AnalyzerConfig) {
    this.config = config;
    this.secretDetector = new SecretDetector();
    this.injectionAnalyzer = new InjectionAnalyzer();
    this.authAnalyzer = new AuthAnalyzer();
    this.cryptoAnalyzer = new CryptoAnalyzer();
  }

  async analyze(context: RepositoryContext): Promise<SecurityResult> {
    const findings: Finding[] = [];

    // Run all security analyses
    const secrets = await this.secretDetector.detect(context);
    findings.push(...secrets);

    const injectionRisks = await this.injectionAnalyzer.analyze(context);
    findings.push(...injectionRisks);

    const authIssues = await this.authAnalyzer.analyze(context);
    findings.push(...authIssues);

    const cryptoIssues = await this.cryptoAnalyzer.analyze(context);
    findings.push(...cryptoIssues);

    // Calculate security risk score
    const securityRiskScore = this.calculateRiskScore(findings);

    return {
      category: "security",
      score: securityRiskScore,
      findings,
      summary: this.generateSummary(securityRiskScore, findings),
      metrics: {
        securityRiskScore,
        secretsFound: secrets.length,
        injectionRisks: injectionRisks.length,
        authIssues: authIssues.length,
        cryptoIssues: cryptoIssues.length,
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
      return `Critical security issues detected. ${findings.length} findings indicate significant security vulnerabilities that require immediate attention.`;
    } else if (score >= 40) {
      return `Moderate security issues found. ${findings.length} findings suggest some security improvements are needed.`;
    } else if (score >= 20) {
      return `Minor security issues detected. ${findings.length} findings suggest room for security hardening.`;
    } else {
      return `Good security posture. No significant security issues detected.`;
    }
  }
}
