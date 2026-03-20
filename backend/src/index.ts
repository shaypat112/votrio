#!/usr/bin/env node
import { Command } from "commander";
import chalk from "chalk";
import { createRequire } from "module";
import { runCommand } from "./commands/run.js";
import { initCommand } from "./commands/init.js";
import { scanCommand } from "./commands/scan.js";
import { authCommand } from "./commands/auth.js";
import { checkUpdate } from "./utils/update.js";

const require = createRequire(import.meta.url);
const pkg = require("../package.json");

// Check for updates in background (non-blocking)
checkUpdate(pkg.name, pkg.version);

const program = new Command();

program
  .name("votrio")
  .description(
    chalk.bold("votrio") +
      " — AI-powered terminal trace analysis & security scanning"
  )
  .version(pkg.version, "-v, --version", "print current version")
  .helpOption("-h, --help", "display help");

// ─── Commands ─────────────────────────────────────────────────────────────────

program
  .command("init")
  .description("initialize votrio in the current project")
  .option("--skip-gitignore", "do not modify .gitignore")
  .action(initCommand);

program
  .command("run <command>")
  .description('wrap a process and analyze its output (e.g. votrio run "npm start")')
  .option("--no-ai", "disable AI analysis, just pipe output")
  .option("--model <model>", "Anthropic model to use", "claude-sonnet-4-20250514")
  .option("--verbose", "print debug info from votrio itself")
  .allowUnknownOption()
  .action(runCommand);

program
  .command("scan [path]")
  .description("scan a directory for security vulnerabilities (default: .)")
  .option("--fix", "auto-apply safe patches where possible")
  .option("--ci", "exit with code 1 if issues found (for CI pipelines)")
  .option("--fail-on <severity>", "fail on: low | medium | high | critical", "high")
  .option("--format <fmt>", "output format: text | json | markdown | sarif", "text")
  .option("--ignore <patterns...>", "glob patterns to ignore")
  .action(scanCommand);

program
  .command("auth")
  .description("configure your Anthropic API key")
  .option("--clear", "remove stored credentials")
  .action(authCommand);

// ─── Error handling ────────────────────────────────────────────────────────────

program.on("command:*", (operands) => {
  console.error(
    chalk.red(`\nError: unknown command '${operands[0]}'\n`)
  );
  console.log(`Run ${chalk.cyan("votrio --help")} to see available commands.\n`);
  process.exit(1);
});

program.parse(process.argv);

// Show help if no args
if (!process.argv.slice(2).length) {
  program.outputHelp();
}
