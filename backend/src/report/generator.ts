/**
 * Report Generator
 * Main coordinator for report generation in different formats
 */

import { JSONFormatter } from "./json-formatter.js";
import { MarkdownFormatter } from "./markdown-formatter.js";
import { HTMLFormatter } from "./html-formatter.js";
import { SARIFFormatter } from "./sarif-formatter.js";
import type { ScanReport, ReportFormat } from "../core/types.js";

export interface OutputConfig {
  format: ReportFormat;
  includeCodeSnippets: boolean;
  maxFindings: number;
}

export class ReportGenerator {
  private jsonFormatter: JSONFormatter;
  private markdownFormatter: MarkdownFormatter;
  private htmlFormatter: HTMLFormatter;
  private sarifFormatter: SARIFFormatter;
  private config: OutputConfig;

  constructor(config: OutputConfig) {
    this.config = config;
    this.jsonFormatter = new JSONFormatter(config);
    this.markdownFormatter = new MarkdownFormatter(config);
    this.htmlFormatter = new HTMLFormatter(config);
    this.sarifFormatter = new SARIFFormatter(config);
  }

  generate(report: ScanReport): string {
    switch (this.config.format) {
      case "json":
        return this.jsonFormatter.format(report);
      case "markdown":
        return this.markdownFormatter.format(report);
      case "html":
        return this.htmlFormatter.format(report);
      case "sarif":
        return this.sarifFormatter.format(report);
      default:
        return this.jsonFormatter.format(report);
    }
  }

  async writeToFile(report: ScanReport, outputPath: string): Promise<void> {
    const content = this.generate(report);
    const fs = await import("fs/promises");
    await fs.writeFile(outputPath, content, "utf-8");
  }
}
