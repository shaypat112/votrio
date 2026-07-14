/**
 * Table Utilities
 * Provides table formatting for CLI output
 */

import chalk from "chalk";

export class TableFormatter {
  static createTable(headers: string[]): any {
    // Simple table implementation without cli-table3
    return {
      headers,
      rows: [] as string[][],
      push(row: string[]) {
        this.rows.push(row);
      },
      toString() {
        const maxColWidths = this.headers.map((_: string, i: number) => 
          Math.max(
            this.headers[i].length,
            ...this.rows.map((row: string[]) => row[i]?.length || 0)
          )
        );
        
        let output = '';
        
        // Header row
        output += '| ' + this.headers.map((h: string, i: number) => 
          h.padEnd(maxColWidths[i])
        ).join(' | ') + ' |\n';
        
        // Separator
        output += '|' + maxColWidths.map((w: number) => '-'.repeat(w + 2)).join('|') + '|\n';
        
        // Data rows
        for (const row of this.rows) {
          output += '| ' + row.map((cell: string, i: number) => 
            (cell || '').padEnd(maxColWidths[i])
          ).join(' | ') + ' |\n';
        }
        
        return output;
      }
    };
  }

  static formatFindingsTable(findings: any[]): string {
    const table = this.createTable(["Severity", "Type", "File", "Line", "Message"]);

    for (const finding of findings) {
      const severity = TableFormatter.formatSeverity(finding.severity);
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

    table.push(["Overall", TableFormatter.formatScore(scores.overall)]);
    table.push(["AI Likelihood", TableFormatter.formatScore(scores.aiLikelihood)]);
    table.push(["Architectural Risk", TableFormatter.formatScore(scores.architecturalRisk)]);
    table.push(["Scalability Risk", TableFormatter.formatScore(scores.scalabilityRisk)]);
    table.push(["Security Risk", TableFormatter.formatScore(scores.securityRisk)]);
    table.push(["Maintainability", TableFormatter.formatScore(scores.maintainability)]);

    return table.toString();
  }

  static formatSeverity(severity: string): string {
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

  static formatScore(score: number): string {
    if (score >= 70) {
      return chalk.red.bold(score.toString());
    } else if (score >= 40) {
      return chalk.yellow.bold(score.toString());
    } else {
      return chalk.green.bold(score.toString());
    }
  }
}
