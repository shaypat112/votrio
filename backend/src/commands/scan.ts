import fs from "fs/promises";
import path from "path";
import chalk from "chalk";
import ora from "ora";
import { glob } from "glob";

import { analyzeCode } from "../lib/mistral";

type Severity = "low" | "medium" | "high" | "critical";

interface ScanOptions {
  fix: boolean;
  ci: boolean;
  ai?: boolean;
  aiModel?: string;
  failOn: Severity;
  format: "text" | "json" | "markdown";
  ignore: string[];
  watch?: boolean;
  publish?: boolean;
  rules?: string;
}

interface Finding {
  file: string;
  line: number;
  severity: Severity;
  score: number;
  type: string;
  message: string;
  snippet?: string;
  suggestion?: string;
  source: "regex" | "ai";
}

interface PatternCheck {
  pattern: RegExp;
  severity: Severity;
  type: string;
  message: string;
  suggestion?: string;
}

const SEVERITY_SCORE: Record<Severity, number> = {
  low: 30,
  medium: 55,
  high: 75,
  critical: 90
};

const SEVERITY_COLOR: Record<Severity, (t: string) => string> = {
  low: chalk.blue,
  medium: chalk.yellow,
  high: chalk.red,
  critical: chalk.bgRed.white
};

const QUICK_PATTERNS: PatternCheck[] = [
  {
    pattern: /eval\s*\(/g,
    severity: "high",
    type: "EVAL",
    message: "eval() detected — possible code injection",
    suggestion: "Avoid eval() and use safer parsing."
  },
  {
    pattern: /dangerouslySetInnerHTML/g,
    severity: "medium",
    type: "XSS_RISK",
    message: "dangerouslySetInnerHTML usage detected",
    suggestion: "Sanitize user input before rendering."
  },
  {
    pattern: /child_process.*exec\s*\(/g,
    severity: "high",
    type: "CMD_INJECTION",
    message: "exec() usage detected",
    suggestion: "Use spawn with arguments instead."
  },
  {
    pattern: /(?:password|secret|token|api_?key)\s*[:=]\s*["'][^"']{6,}/gi,
    severity: "high",
    type: "HARDCODED_SECRET",
    message: "Possible hardcoded credential",
    suggestion: "Move secrets to environment variables."
  }
];

export async function scanCommand(
  scanPath: string = ".",
  options: ScanOptions
) {
  const resolved = path.resolve(process.cwd(), scanPath);

  console.log(`\n${chalk.bold("votrio")} ${chalk.dim("scan")}\n`);

  const ignore = [
    "node_modules/**",
    ".git/**",
    ".next/**",
    "dist/**",
    "build/**",
    "**/*.min.js",
    ...(options.ignore ?? [])
  ];

  const files = await discoverFiles(resolved, ignore);

  const findings = await scanFiles(files, options);

  const deduped = dedupe(findings);

  outputResults(deduped, options);

  if (options.ci) handleCI(deduped, options);
}

async function discoverFiles(root: string, ignore: string[]) {
  const spinner = ora("Discovering files").start();

  const files = await glob("**/*.{ts,tsx,js,jsx,py,go,rs,java,cs,php}", {
    cwd: root,
    ignore,
    absolute: true
  });

  spinner.succeed(`Found ${chalk.cyan(files.length)} files`);

  return files;
}

async function scanFiles(files: string[], options: ScanOptions) {
  const spinner = ora("Scanning").start();

  const findings: Finding[] = [];

  let index = 0;

  for (const file of files) {
    index++;

    spinner.text = `Scanning ${index}/${files.length}`;

    let content: string;

    try {
      content = await fs.readFile(file, "utf8");
    } catch {
      continue;
    }

    const lines = content.split("\n");

    for (const check of QUICK_PATTERNS) {
      const matches = [...content.matchAll(check.pattern)];

      for (const match of matches) {
        const line = content.slice(0, match.index).split("\n").length;

        findings.push({
          file: path.relative(process.cwd(), file),
          line,
          severity: check.severity,
          score: SEVERITY_SCORE[check.severity],
          type: check.type,
          message: check.message,
          snippet: lines[line - 1]?.trim(),
          suggestion: check.suggestion,
          source: "regex"
        });
      }
    }

    if (options.ai) {
      const ai = await runAIAnalysis(content, options.aiModel);

      if (ai) {
        findings.push({
          file: path.relative(process.cwd(), file),
          line: 1,
          severity: "medium",
          score: 60,
          type: "AI_ANALYSIS",
          message: "AI detected potential issues",
          snippet: ai.slice(0, 200),
          suggestion: "Review AI suggestions",
          source: "ai"
        });
      }
    }
  }

  spinner.succeed(`Scanned ${files.length} files`);

  return findings;
}

async function runAIAnalysis(code: string, model?: string) {
  try {
    const prompt = `
Analyze this code for vulnerabilities, inefficiencies, or insecure patterns.

Respond briefly.

${code.slice(0, 6000)}
`;

    const result = await analyzeCode(prompt, model);

    return result;
  } catch {
    return null;
  }
}

function dedupe(findings: Finding[]) {
  const map = new Map<string, Finding>();

  for (const f of findings) {
    const key = `${f.file}:${f.line}:${f.type}`;
    if (!map.has(key)) map.set(key, f);
  }

  return [...map.values()].sort(
    (a, b) => SEVERITY_SCORE[b.severity] - SEVERITY_SCORE[a.severity]
  );
}

function outputResults(findings: Finding[], options: ScanOptions) {
  if (options.format === "json") {
    console.log(JSON.stringify(findings, null, 2));
    return;
  }

  if (options.format === "markdown") {
    console.log("# Votrio Scan Report\n");

    console.log("| Severity | File | Line | Type | Message |");
    console.log("|---|---|---|---|---|");

    for (const f of findings) {
      console.log(
        `| ${f.severity} | ${f.file} | ${f.line} | ${f.type} | ${f.message} |`
      );
    }

    return;
  }

  console.log();

  if (!findings.length) {
    console.log(chalk.green("✓ No issues found\n"));
    return;
  }

  for (const f of findings) {
    const badge =
      f.source === "ai"
        ? chalk.magenta("[AI]")
        : SEVERITY_COLOR[f.severity](`[${f.severity.toUpperCase()}]`);

    console.log(
      `${badge} ${chalk.white(f.type)} (${chalk.yellow(
        f.score
      )}) ${chalk.dim(f.file)}:${chalk.yellow(f.line)}`
    );

    console.log(`  ${chalk.dim(f.message)}`);

    if (f.snippet) console.log(`  ${chalk.dim("→")} ${chalk.dim(f.snippet)}`);

    if (f.suggestion)
      console.log(`  ${chalk.dim("fix")} ${chalk.dim(f.suggestion)}`);

    console.log();
  }

  console.log(`${findings.length} issue(s) detected\n`);
}

function handleCI(findings: Finding[], options: ScanOptions) {
  const threshold = SEVERITY_SCORE[options.failOn];

  const fail = findings.some(f => SEVERITY_SCORE[f.severity] >= threshold);

  if (fail) process.exit(1);
}
