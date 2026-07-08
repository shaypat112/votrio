/**
 * New Scan Command
 * Uses the modular architecture for repository scanning
 */

import chalk from "chalk";
import { VotrioScanner } from "../core/scanner.js";
import { ConfigManager, createScanOptions } from "../core/config.js";
import { ReportGenerator } from "../report/generator.js";
import { Logger } from "../utils/logger.js";
import { progress } from "../utils/progress.js";
import { TableFormatter } from "../utils/table.js";
import type { ScanOptions } from "../core/types.js";

export async function scanCommandNew(
  scanPath: string = ".",
  options: any
) {
  try {
    Logger.header("Votrio-Scan");

    // Load configuration
    progress.start("Loading configuration...");
    const configManager = ConfigManager.getInstance();
    const config = await configManager.loadConfig();
    progress.succeed("Configuration loaded");

    // Create scan options
    const scanOptions: ScanOptions = createScanOptions(options, config);

    // Initialize scanner
    progress.start("Initializing scanner...");
    const scanner = new VotrioScanner(config);
    progress.succeed("Scanner initialized");

    // Run scan
    progress.start("Scanning repository...");
    const report = await scanner.scan(scanOptions);
    progress.succeed("Scan completed");

    // Display results
    displayResults(report, scanOptions);

    // Generate report if requested
    if (options.output) {
      progress.start("Generating report...");
      const reportGenerator = new ReportGenerator(config.output);
      await reportGenerator.writeToFile(report, options.output);
      progress.succeed(`Report saved to ${options.output}`);
    }

    // Handle CI exit codes
    if (options.ci) {
      handleCIExit(report, options.failOn);
    }

  } catch (error) {
    Logger.error(`Scan failed: ${error instanceof Error ? error.message : String(error)}`);
    process.exit(1);
  }
}

function displayResults(report: any, options: ScanOptions): void {
  // Display overall score
  Logger.subheader("Overall Risk Score");
  console.log(TableFormatter.formatScoreTable(report.scores));
  console.log();

  // Display repository summary
  Logger.subheader("Repository Summary");
  console.log(`Languages: ${report.repository.languages.join(", ")}`);
  console.log(`Total Files: ${report.repository.totalFiles}`);
  console.log(`Total Lines: ${report.repository.totalLines}`);
  console.log();

  // Display AI explanations
  if (options.enableAI) {
    Logger.subheader("AI Analysis");
    console.log(chalk.white(report.explanations.summary));
    console.log();
  }

  // Display findings
  if (report.findings.length > 0) {
    Logger.subheader("Findings");

    if (options.format === "text") {
      for (const finding of report.findings.slice(0, 20)) {
        Logger.finding(finding);
      }

      if (report.findings.length > 20) {
        console.log(chalk.dim(`... and ${report.findings.length - 20} more findings`));
      }
    } else {
      console.log(TableFormatter.formatFindingsTable(report.findings.slice(0, 20)));
    }

    console.log();
  } else {
    Logger.success("No issues found");
    console.log();
  }

  // Display recommended fixes
  if (report.explanations.recommendedFixes.length > 0) {
    Logger.subheader("Recommended Fixes");
    report.explanations.recommendedFixes.forEach((fix: string, index: number) => {
      console.log(`${index + 1}. ${fix}`);
    });
    console.log();
  }
}

function handleCIExit(report: any, failOn: string): void {
  const severityThresholds = {
    critical: 90,
    high: 70,
    medium: 50,
    low: 30,
  };

  const threshold = severityThresholds[failOn as keyof typeof severityThresholds] || 70;
  const criticalFindings = report.findings.filter((f: any) => f.score >= threshold);

  if (criticalFindings.length > 0) {
    Logger.error(`CI failed: ${criticalFindings.length} findings exceed threshold`);
    process.exit(1);
  }
}
