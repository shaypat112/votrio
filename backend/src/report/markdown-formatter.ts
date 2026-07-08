/**
 * Markdown Formatter
 * Formats scan reports as Markdown
 */

import type { ScanReport, OutputConfig } from "../core/types.js";

export class MarkdownFormatter {
  private config: OutputConfig;

  constructor(config: OutputConfig) {
    this.config = config;
  }

  format(report: ScanReport): string {
    const lines: string[] = [];

    // Header
    lines.push("# Votrio Scan Report");
    lines.push("");
    lines.push(`**Repository:** ${report.repository.name}`);
    lines.push(`**Scanned:** ${new Date(report.repository.scannedAt).toLocaleString()}`);
    lines.push("");

    // Overall Score
    lines.push("## Overall Risk Score");
    lines.push("");
    lines.push(`**${report.scores.overall}/100**`);
    lines.push("");
    lines.push("| Metric | Score |");
    lines.push("|--------|-------|");
    lines.push(`| AI Likelihood | ${report.scores.aiLikelihood}/100 |`);
    lines.push(`| Architectural Risk | ${report.scores.architecturalRisk}/100 |`);
    lines.push(`| Scalability Risk | ${report.scores.scalabilityRisk}/100 |`);
    lines.push(`| Security Risk | ${report.scores.securityRisk}/100 |`);
    lines.push(`| Maintainability | ${report.scores.maintainability}/100 |`);
    lines.push("");

    // Repository Summary
    lines.push("## Repository Summary");
    lines.push("");
    lines.push(`- **Languages:** ${report.repository.languages.join(", ")}`);
    lines.push(`- **Total Files:** ${report.repository.totalFiles}`);
    lines.push(`- **Total Lines:** ${report.repository.totalLines}`);
    lines.push("");

    // AI Explanations
    lines.push("## AI Analysis");
    lines.push("");
    lines.push("### Summary");
    lines.push(report.explanations.summary);
    lines.push("");

    lines.push("### Risk Analysis");
    lines.push(report.explanations.riskExplanation);
    lines.push("");

    lines.push("### Architecture Analysis");
    lines.push(report.explanations.architectureExplanation);
    lines.push("");

    lines.push("### Scalability Analysis");
    lines.push(report.explanations.scalabilityExplanation);
    lines.push("");

    lines.push("### Security Analysis");
    lines.push(report.explanations.securityExplanation);
    lines.push("");

    lines.push("### Maintainability Analysis");
    lines.push(report.explanations.maintainabilityExplanation);
    lines.push("");

    // Recommended Fixes
    if (report.explanations.recommendedFixes.length > 0) {
      lines.push("## Recommended Fixes");
      lines.push("");
      report.explanations.recommendedFixes.forEach((fix, index) => {
        lines.push(`${index + 1}. ${fix}`);
      });
      lines.push("");
    }

    // Detailed Findings
    lines.push("## Detailed Findings");
    lines.push("");
    lines.push("| Severity | Type | File | Line | Message |");
    lines.push("|----------|------|------|------|---------|");

    const findings = this.limitFindings(report.findings);
    for (const finding of findings) {
      lines.push(
        `| ${finding.severity} | ${finding.type} | ${finding.file} | ${finding.line} | ${finding.message} |`
      );
    }
    lines.push("");

    return lines.join("\n");
  }

  private limitFindings(findings: any[]): any[] {
    if (!this.config.maxFindings) return findings;
    return findings.slice(0, this.config.maxFindings);
  }
}
