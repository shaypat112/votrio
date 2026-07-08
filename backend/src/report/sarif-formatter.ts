/**
 * SARIF Formatter
 * Formats scan reports as SARIF (Static Analysis Results Interchange Format)
 */

import type { ScanReport, OutputConfig } from "../core/types.js";

export class SARIFFormatter {
  private config: OutputConfig;

  constructor(config: OutputConfig) {
    this.config = config;
  }

  format(report: ScanReport): string {
    const findings = this.limitFindings(report.findings);

    // Create unique rules from findings
    const rules = this.createRules(findings);
    const ruleIndex = new Map<string, number>();
    rules.forEach((rule, index) => {
      ruleIndex.set(rule.id, index);
    });

    // Convert findings to SARIF results
    const results = findings.map(finding => ({
      ruleId: finding.type,
      level: this.getSeverityLevel(finding.severity),
      message: {
        text: finding.message,
      },
      locations: [
        {
          physicalLocation: {
            artifactLocation: {
              uri: finding.file,
            },
            region: {
              startLine: finding.line,
              startColumn: finding.column || 1,
            },
          },
        },
      ],
      properties: {
        severity: finding.severity,
        score: finding.score,
        category: finding.category,
        suggestion: finding.suggestion,
      },
    }));

    const sarif = {
      $schema: "https://raw.githubusercontent.com/oasis-tcs/sarif-spec/master/Schemata/sarif-schema-2.1.0.json",
      version: "2.1.0",
      runs: [
        {
          tool: {
            driver: {
              name: "votrio-scan",
              informationUri: "https://votrio.dev",
              version: "1.0.0",
              rules,
            },
          },
          results,
          invocations: [
            {
              startTimeUtc: report.repository.scannedAt,
              endTimeUtc: new Date().toISOString(),
            },
          ],
        },
      ],
    };

    return JSON.stringify(sarif, null, 2);
  }

  private createRules(findings: any[]): Array<{
    id: string;
    name: string;
    shortDescription: { text: string };
    fullDescription?: { text: string };
    helpUri?: string;
    properties?: { category: string };
  }> {
    const uniqueRules = new Map<string, any>();

    for (const finding of findings) {
      if (!uniqueRules.has(finding.type)) {
        uniqueRules.set(finding.type, {
          id: finding.type,
          name: finding.type,
          shortDescription: {
            text: finding.message,
          },
          fullDescription: {
            text: finding.description || finding.message,
          },
          properties: {
            category: finding.category,
          },
        });
      }
    }

    return Array.from(uniqueRules.values());
  }

  private getSeverityLevel(severity: string): string {
    switch (severity) {
      case "critical":
      case "high":
        return "error";
      case "medium":
        return "warning";
      case "low":
        return "note";
      default:
        return "none";
    }
  }

  private limitFindings(findings: any[]): any[] {
    if (!this.config.maxFindings) return findings;
    return findings.slice(0, this.config.maxFindings);
  }
}
