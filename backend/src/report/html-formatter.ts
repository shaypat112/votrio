/**
 * HTML Formatter
 * Formats scan reports as HTML
 */

import type { ScanReport, OutputConfig } from "../core/types.js";

export class HTMLFormatter {
  private config: OutputConfig;

  constructor(config: OutputConfig) {
    this.config = config;
  }

  format(report: ScanReport): string {
    const lines: string[] = [];

    // HTML Header
    lines.push("<!DOCTYPE html>");
    lines.push("<html lang='en'>");
    lines.push("<head>");
    lines.push("  <meta charset='UTF-8'>");
    lines.push("  <meta name='viewport' content='width=device-width, initial-scale=1.0'>");
    lines.push("  <title>Votrio Scan Report</title>");
    lines.push("  <style>");
    lines.push(this.getStyles());
    lines.push("  </style>");
    lines.push("</head>");
    lines.push("<body>");
    lines.push("  <div class='container'>");

    // Header
    lines.push("    <header>");
    lines.push("      <h1>Votrio Scan Report</h1>");
    lines.push(`      <p class='meta'>Repository: ${report.repository.name}</p>`);
    lines.push(`      <p class='meta'>Scanned: ${new Date(report.repository.scannedAt).toLocaleString()}</p>`);
    lines.push("    </header>");

    // Overall Score
    lines.push("    <section class='score-section'>");
    lines.push("      <h2>Overall Risk Score</h2>");
    lines.push(`      <div class='score ${this.getScoreClass(report.scores.overall)}'>`);
    lines.push(`        <span class='score-number'>${report.scores.overall}</span>`);
    lines.push("        <span class='score-label'>/100</span>");
    lines.push("      </div>");
    lines.push("      <div class='metrics'>");
    lines.push("        <div class='metric'>");
    lines.push(`          <span class='metric-label'>AI Likelihood</span>`);
    lines.push(`          <span class='metric-value'>${report.scores.aiLikelihood}/100</span>`);
    lines.push("        </div>");
    lines.push("        <div class='metric'>");
    lines.push(`          <span class='metric-label'>Architectural Risk</span>`);
    lines.push(`          <span class='metric-value'>${report.scores.architecturalRisk}/100</span>`);
    lines.push("        </div>");
    lines.push("        <div class='metric'>");
    lines.push(`          <span class='metric-label'>Scalability Risk</span>`);
    lines.push(`          <span class='metric-value'>${report.scores.scalabilityRisk}/100</span>`);
    lines.push("        </div>");
    lines.push("        <div class='metric'>");
    lines.push(`          <span class='metric-label'>Security Risk</span>`);
    lines.push(`          <span class='metric-value'>${report.scores.securityRisk}/100</span>`);
    lines.push("        </div>");
    lines.push("        <div class='metric'>");
    lines.push(`          <span class='metric-label'>Maintainability</span>`);
    lines.push(`          <span class='metric-value'>${report.scores.maintainability}/100</span>`);
    lines.push("        </div>");
    lines.push("      </div>");
    lines.push("    </section>");

    // Repository Summary
    lines.push("    <section class='summary-section'>");
    lines.push("      <h2>Repository Summary</h2>");
    lines.push("      <ul>");
    lines.push(`        <li><strong>Languages:</strong> ${report.repository.languages.join(", ")}</li>`);
    lines.push(`        <li><strong>Total Files:</strong> ${report.repository.totalFiles}</li>`);
    lines.push(`        <li><strong>Total Lines:</strong> ${report.repository.totalLines}</li>`);
    lines.push("      </ul>");
    lines.push("    </section>");

    // AI Explanations
    lines.push("    <section class='explanation-section'>");
    lines.push("      <h2>AI Analysis</h2>");
    lines.push("      <div class='explanation'>");
    lines.push("        <h3>Summary</h3>");
    lines.push(`        <p>${report.explanations.summary}</p>`);
    lines.push("      </div>");
    lines.push("      <div class='explanation'>");
    lines.push("        <h3>Risk Analysis</h3>");
    lines.push(`        <p>${report.explanations.riskExplanation}</p>`);
    lines.push("      </div>");
    lines.push("      <div class='explanation'>");
    lines.push("        <h3>Architecture Analysis</h3>");
    lines.push(`        <p>${report.explanations.architectureExplanation}</p>`);
    lines.push("      </div>");
    lines.push("      <div class='explanation'>");
    lines.push("        <h3>Scalability Analysis</h3>");
    lines.push(`        <p>${report.explanations.scalabilityExplanation}</p>`);
    lines.push("      </div>");
    lines.push("      <div class='explanation'>");
    lines.push("        <h3>Security Analysis</h3>");
    lines.push(`        <p>${report.explanations.securityExplanation}</p>`);
    lines.push("      </div>");
    lines.push("      <div class='explanation'>");
    lines.push("        <h3>Maintainability Analysis</h3>");
    lines.push(`        <p>${report.explanations.maintainabilityExplanation}</p>`);
    lines.push("      </div>");
    lines.push("    </section>");

    // Recommended Fixes
    if (report.explanations.recommendedFixes.length > 0) {
      lines.push("    <section class='fixes-section'>");
      lines.push("      <h2>Recommended Fixes</h2>");
      lines.push("      <ol>");
      report.explanations.recommendedFixes.forEach(fix => {
        lines.push(`        <li>${fix}</li>`);
      });
      lines.push("      </ol>");
      lines.push("    </section>");
    }

    // Detailed Findings
    lines.push("    <section class='findings-section'>");
    lines.push("      <h2>Detailed Findings</h2>");
    lines.push("      <table class='findings-table'>");
    lines.push("        <thead>");
    lines.push("          <tr>");
    lines.push("            <th>Severity</th>");
    lines.push("            <th>Type</th>");
    lines.push("            <th>File</th>");
    lines.push("            <th>Line</th>");
    lines.push("            <th>Message</th>");
    lines.push("          </tr>");
    lines.push("        </thead>");
    lines.push("        <tbody>");

    const findings = this.limitFindings(report.findings);
    for (const finding of findings) {
      lines.push("          <tr>");
      lines.push(`            <td class='severity ${finding.severity}'>${finding.severity}</td>`);
      lines.push(`            <td>${finding.type}</td>`);
      lines.push(`            <td>${finding.file}</td>`);
      lines.push(`            <td>${finding.line}</td>`);
      lines.push(`            <td>${finding.message}</td>`);
      lines.push("          </tr>");
    }

    lines.push("        </tbody>");
    lines.push("      </table>");
    lines.push("    </section>");

    // Footer
    lines.push("    <footer>");
    lines.push("      <p>Generated by Votrio-Scan</p>");
    lines.push("    </footer>");

    lines.push("  </div>");
    lines.push("</body>");
    lines.push("</html>");

    return lines.join("\n");
  }

  private getStyles(): string {
    return `
      body {
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
        line-height: 1.6;
        color: #333;
        margin: 0;
        padding: 20px;
        background: #f5f5f5;
      }
      .container {
        max-width: 1200px;
        margin: 0 auto;
        background: white;
        padding: 40px;
        border-radius: 8px;
        box-shadow: 0 2px 10px rgba(0,0,0,0.1);
      }
      header {
        border-bottom: 2px solid #e0e0e0;
        padding-bottom: 20px;
        margin-bottom: 30px;
      }
      h1 {
        color: #2c3e50;
        margin: 0 0 10px 0;
      }
      .meta {
        color: #666;
        margin: 5px 0;
      }
      .score-section {
        text-align: center;
        margin: 40px 0;
      }
      .score {
        display: inline-block;
        padding: 30px 50px;
        border-radius: 12px;
        margin: 20px 0;
      }
      .score-number {
        font-size: 72px;
        font-weight: bold;
      }
      .score-label {
        font-size: 24px;
        color: #666;
      }
      .score.high { background: #e74c3c; color: white; }
      .score.medium { background: #f39c12; color: white; }
      .score.low { background: #27ae60; color: white; }
      .metrics {
        display: flex;
        justify-content: center;
        gap: 30px;
        margin-top: 30px;
        flex-wrap: wrap;
      }
      .metric {
        text-align: center;
        padding: 15px 25px;
        background: #f8f9fa;
        border-radius: 8px;
      }
      .metric-label {
        display: block;
        font-size: 14px;
        color: #666;
        margin-bottom: 5px;
      }
      .metric-value {
        display: block;
        font-size: 24px;
        font-weight: bold;
        color: #2c3e50;
      }
      section {
        margin: 40px 0;
      }
      h2 {
        color: #2c3e50;
        border-bottom: 1px solid #e0e0e0;
        padding-bottom: 10px;
      }
      .explanation {
        margin: 20px 0;
        padding: 20px;
        background: #f8f9fa;
        border-radius: 8px;
      }
      .explanation h3 {
        margin-top: 0;
        color: #34495e;
      }
      .findings-table {
        width: 100%;
        border-collapse: collapse;
        margin-top: 20px;
      }
      .findings-table th,
      .findings-table td {
        padding: 12px;
        text-align: left;
        border-bottom: 1px solid #e0e0e0;
      }
      .findings-table th {
        background: #f8f9fa;
        font-weight: 600;
      }
      .severity {
        text-transform: uppercase;
        font-weight: 600;
        font-size: 12px;
        padding: 4px 8px;
        border-radius: 4px;
      }
      .severity.critical { background: #e74c3c; color: white; }
      .severity.high { background: #e67e22; color: white; }
      .severity.medium { background: #f39c12; color: white; }
      .severity.low { background: #3498db; color: white; }
      footer {
        text-align: center;
        margin-top: 60px;
        padding-top: 20px;
        border-top: 1px solid #e0e0e0;
        color: #666;
      }
    `;
  }

  private getScoreClass(score: number): string {
    if (score >= 70) return "high";
    if (score >= 40) return "medium";
    return "low";
  }

  private limitFindings(findings: any[]): any[] {
    if (!this.config.maxFindings) return findings;
    return findings.slice(0, this.config.maxFindings);
  }
}
