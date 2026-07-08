/**
 * JSON Formatter
 * Formats scan reports as JSON
 */

import type { ScanReport, OutputConfig } from "../core/types.js";

export class JSONFormatter {
  private config: OutputConfig;

  constructor(config: OutputConfig) {
    this.config = config;
  }

  format(report: ScanReport): string {
    const formatted = {
      ...report,
      findings: this.limitFindings(report.findings),
    };

    return JSON.stringify(formatted, null, 2);
  }

  private limitFindings(findings: any[]): any[] {
    if (!this.config.maxFindings) return findings;
    return findings.slice(0, this.config.maxFindings);
  }
}
