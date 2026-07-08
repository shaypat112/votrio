/**
 * Table Utilities
 * Provides table formatting for CLI output
 */

import Table from "cli-table3";
import chalk from "chalk";

export class TableFormatter {
  static createTable(headers: string[]): Table {
    return new Table({
      head: headers.map(h => chalk.cyan(h)),
      style: {
        head: [],
        border: ["grey"],
      },
    });
  }

  static formatFindingsTable(findings: any[]): string {
    const table = this.createTable(["Severity", "Type", "File", "Line", "Message"]);

    for (const finding of findings) {
      const severity = this.formatSeverity(finding.severity);
      table.push([
        severity,
        finding.type,
        finding.file,
        finding.line,
        finding.message,
      ]);
    }

    return table.toString();
  }

  static formatScoreTable(scores: any): string {
    const table = this.createTable(["Metric", "Score"]);

    table.push(["Overall", this.formatScore(scores.overall)]);
    table.push(["AI Likelihood", this.formatScore(scores.aiLikelihood)]);
    table.push(["Architectural Risk", this.formatScore(scores.architecturalRisk)]);
    table.push(["Scalability Risk", this.formatScore(scores.scalabilityRisk)]);
    table.push(["Security Risk", this.formatScore(scores.securityRisk)]);
    table.push(["Maintainability", this.formatScore(scores.maintainability)]);

    return table.toString();
  }

  private formatSeverity(severity: string): string {
    switch (severity) {
      case "critical":
        return chalk.bgRed.white.bold("CRITICAL");
      case "high":
        return chalk.red.bold("HIGH");
      case "medium":
        return chalk.yellow.bold("MEDIUM");
      case "low":
        return chalk.blue.bold("LOW");
      default:
        return severity.toUpperCase();
    }
  }

  private formatScore(score: number): string {
    if (score >= 70) {
      return chalk.red.bold(score.toString());
    } else if (score >= 40) {
      return chalk.yellow.bold(score.toString());
    } else {
      return chalk.green.bold(score.toString());
    }
  }
}
