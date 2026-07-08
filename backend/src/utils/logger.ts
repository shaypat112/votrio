/**
 * Logger Utilities
 * Provides colored logging for CLI output
 */

import chalk from "chalk";

export class Logger {
  static info(message: string): void {
    console.log(chalk.blue("ℹ"), message);
  }

  static success(message: string): void {
    console.log(chalk.green("✓"), message);
  }

  static warning(message: string): void {
    console.log(chalk.yellow("⚠"), message);
  }

  static error(message: string): void {
    console.log(chalk.red("✗"), message);
  }

  static debug(message: string, verbose: boolean = false): void {
    if (verbose) {
      console.log(chalk.gray("→"), message);
    }
  }

  static header(message: string): void {
    console.log("\n" + chalk.bold.cyan(message) + "\n");
  }

  static subheader(message: string): void {
    console.log(chalk.bold.white(message));
  }

  static finding(finding: any): void {
    const severity = this.formatSeverity(finding.severity);
    console.log(
      `${severity} ${chalk.white(finding.type)} (${chalk.yellow(finding.score.toString())}) ${chalk.dim(finding.file)}:${chalk.yellow(finding.line.toString())}`
    );
    console.log(`  ${chalk.dim(finding.message)}`);
    if (finding.suggestion) {
      console.log(`  ${chalk.dim("fix")} ${chalk.dim(finding.suggestion)}`);
    }
    console.log();
  }

  private static formatSeverity(severity: string): string {
    switch (severity) {
      case "critical":
        return chalk.bgRed.white.bold("[CRITICAL]");
      case "high":
        return chalk.red.bold("[HIGH]");
      case "medium":
        return chalk.yellow.bold("[MEDIUM]");
      case "low":
        return chalk.blue.bold("[LOW]");
      default:
        return `[${severity.toUpperCase()}]`;
    }
  }
}
