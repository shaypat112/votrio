import fs from "fs/promises";
import path from "path";
import chalk from "chalk";
import ora from "ora";
import { glob } from "glob";

import { summarizeFindings } from "../lib/mistral";
import { loadConfig } from "../config.js";

type Severity = "low" | "medium" | "high" | "critical";

interface ScanOptions {
  fix: boolean;
  ci: boolean;
  ai?: boolean;
  aiModel?: string;
  failOn: Severity;
  format: "text" | "json" | "markdown" | "sarif";
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

interface RulesFile {
  ignore?: string[];
  patterns?: Array<{
    pattern: string;
    flags?: string;
    severity: Severity;
    type: string;
    message: string;
    suggestion?: string;
  }>;
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
  const { config, warnings } = await loadConfig();
  if (warnings.length) {
    for (const warning of warnings) {
      console.log(chalk.yellow(`\n${warning}\n`));
    }
  }

  const scanConfig = config.scan ?? {};
  const rulesPath =
    options.rules ||
    scanConfig.rules ||
    (await defaultRulesPath(process.cwd()));
  const rules = await loadRules(rulesPath);
  for (const warning of rules.warnings) {
    console.log(chalk.yellow(`\n${warning}\n`));
  }

  const resolved = path.resolve(process.cwd(), scanPath);

  console.log(`\n${chalk.bold("votrio")} ${chalk.dim("scan")}\n`);

  const ignore = [
    "node_modules/**",
    ".git/**",
    ".next/**",
    "dist/**",
    "build/**",
    "**/*.min.js",
    ...(scanConfig.ignore ?? []),
    ...(rules.ignore ?? []),
    ...(options.ignore ?? [])
  ];

  const aiEnabled =
    options.ai ||
    scanConfig.ai ||
    process.env.VOTRIO_SCAN_AI === "true";
  const aiModel =
    options.aiModel ||
    scanConfig.aiModel ||
    process.env.VOTRIO_SCAN_AI_MODEL ||
    "mistral-large-latest";

  const publishEnabled =
    options.publish ||
    scanConfig.publish ||
    process.env.VOTRIO_PUBLISH === "true";

  const files = await discoverFiles(resolved, ignore);

  const findings = await scanFiles(files, {
    ...options,
    aiModel,
    fix: options.fix || scanConfig.autoFix || false,
    extraPatterns: rules.patterns,
  });

  const deduped = dedupe(findings);
  const aiSummary =
    aiEnabled && deduped.length > 0
      ? await summarizeFindings(deduped, aiModel)
      : null;

  outputResults(deduped, options, aiSummary);

  if (options.ci) handleCI(deduped, options);

  if (publishEnabled) {
    await publishScanSummary(deduped);
  }
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

async function scanFiles(
  files: string[],
  options: ScanOptions & { extraPatterns?: PatternCheck[] }
) {
  const spinner = ora("Scanning").start();

  const findings: Finding[] = [];
  const checks = [...QUICK_PATTERNS, ...(options.extraPatterns ?? [])];

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

    for (const check of checks) {
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

  }

  spinner.succeed(`Scanned ${files.length} files`);

  return findings;
}

async function defaultRulesPath(cwd: string): Promise<string | undefined> {
  const p = path.join(cwd, ".votrio", "rules.json");
  return (await exists(p)) ? p : undefined;
}

async function loadRules(rulesPath?: string) {
  const warnings: string[] = [];
  if (!rulesPath) {
    return { patterns: [] as PatternCheck[], ignore: [] as string[], warnings };
  }

  const absolute = path.isAbsolute(rulesPath)
    ? rulesPath
    : path.join(process.cwd(), rulesPath);

  if (!(await exists(absolute))) {
    warnings.push(`Rules file not found: ${rulesPath}`);
    return { patterns: [] as PatternCheck[], ignore: [] as string[], warnings };
  }

  try {
    const raw = await fs.readFile(absolute, "utf8");
    const data = JSON.parse(raw) as RulesFile;
    const patterns: PatternCheck[] = [];

    for (const rule of data.patterns ?? []) {
      if (!rule.pattern || !rule.severity || !rule.type || !rule.message) {
        warnings.push(`Invalid rule in ${rulesPath} — missing required fields.`);
        continue;
      }
      try {
        patterns.push({
          pattern: new RegExp(rule.pattern, rule.flags),
          severity: rule.severity,
          type: rule.type,
          message: rule.message,
          suggestion: rule.suggestion,
        });
      } catch {
        warnings.push(`Invalid regex in ${rulesPath}: ${rule.pattern}`);
      }
    }

    return {
      patterns,
      ignore: data.ignore ?? [],
      warnings,
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    warnings.push(`Failed to parse ${rulesPath}: ${message}`);
    return { patterns: [] as PatternCheck[], ignore: [] as string[], warnings };
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

function outputResults(
  findings: Finding[],
  options: ScanOptions,
  aiSummary?: string | null
) {
  if (options.format === "json") {
    console.log(JSON.stringify({ findings, aiSummary: aiSummary ?? null }, null, 2));
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

    if (aiSummary) {
      console.log(`\n## AI Summary\n\n${aiSummary}`);
    }

    return;
  }

  if (options.format === "sarif") {
    console.log(JSON.stringify(toSarif(findings), null, 2));
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

  if (aiSummary) {
    console.log(chalk.cyan("AI summary"));
    console.log(`  ${chalk.dim(aiSummary)}\n`);
  }

  console.log(`${findings.length} issue(s) detected\n`);
}

function toSarif(findings: Finding[]) {
  const rules: Array<{
    id: string;
    name: string;
    shortDescription: { text: string };
    properties?: Record<string, unknown>;
  }> = [];
  const ruleIndex = new Map<string, number>();

  for (const f of findings) {
    if (ruleIndex.has(f.type)) continue;
    ruleIndex.set(f.type, rules.length);
    rules.push({
      id: f.type,
      name: f.type,
      shortDescription: { text: f.message },
      properties: { severity: f.severity, score: f.score },
    });
  }

  const results = findings.map((f) => ({
    ruleId: f.type,
    level: sarifLevel(f.severity),
    message: { text: f.message },
    locations: [
      {
        physicalLocation: {
          artifactLocation: { uri: f.file },
          region: { startLine: Math.max(1, f.line) },
        },
      },
    ],
    properties: { severity: f.severity, score: f.score },
  }));

  return {
    $schema:
      "https://raw.githubusercontent.com/oasis-tcs/sarif-spec/master/Schemata/sarif-schema-2.1.0.json",
    version: "2.1.0",
    runs: [
      {
        tool: {
          driver: {
            name: "votrio",
            informationUri: "https://votrio.dev",
            rules,
          },
        },
        results,
      },
    ],
  };
}

function sarifLevel(severity: Severity) {
  switch (severity) {
    case "critical":
    case "high":
      return "error";
    case "medium":
      return "warning";
    default:
      return "note";
  }
}

function handleCI(findings: Finding[], options: ScanOptions) {
  const threshold = SEVERITY_SCORE[options.failOn];

  const fail = findings.some(f => SEVERITY_SCORE[f.severity] >= threshold);

  if (fail) process.exit(1);
}

async function publishScanSummary(
  findings: Finding[],
  options?: { repoOverride?: string }
) {
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;
  const accessToken = process.env.SUPABASE_ACCESS_TOKEN;

  if (!supabaseUrl || !supabaseAnonKey || !accessToken) {
    console.log(
      chalk.yellow(
        "\nPublish skipped: SUPABASE_URL, SUPABASE_ANON_KEY, and SUPABASE_ACCESS_TOKEN are required.\n"
      )
    );
    return;
  }

  const repo = options?.repoOverride || (await inferRepoSlug(process.cwd()));
  const { total, severity, avgScore } = summarizeFindings(findings);
  const userId = decodeUserId(accessToken);

  const payload: Record<string, unknown> = {
    repo,
    created_at: new Date().toISOString(),
    severity,
    issues: total,
    score: avgScore,
    findings: { list: findings },
  };

  if (userId) payload.user_id = userId;

  const spinner = ora("Publishing scan summary...").start();

  try {
    const res = await fetch(`${supabaseUrl}/rest/v1/scan_history`, {
      method: "POST",
      headers: {
        apikey: supabaseAnonKey,
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
        Prefer: "return=representation",
      },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const text = await res.text();
      spinner.fail(`Publish failed: ${text}`);
      return;
    }

    spinner.succeed("Published scan summary");
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    spinner.fail(`Publish failed: ${message}`);
  }
}

function summarizeFindings(findings: Finding[]) {
  const total = findings.length;
  const maxScore = findings.reduce((max, item) => Math.max(max, item.score), 0);
  const severity =
    findings.find((item) => item.score === maxScore)?.severity ?? "low";
  const avgScore =
    total > 0
      ? Math.round(findings.reduce((sum, item) => sum + item.score, 0) / total)
      : 0;
  return { total, severity, avgScore };
}

function decodeUserId(token: string): string | null {
  try {
    const [, payload] = token.split(".");
    if (!payload) return null;
    const json = Buffer.from(payload, "base64url").toString("utf8");
    const data = JSON.parse(json) as { sub?: string; user_id?: string };
    return data.sub ?? data.user_id ?? null;
  } catch {
    return null;
  }
}

async function inferRepoSlug(cwd: string): Promise<string> {
  const gitConfigPath = path.join(cwd, ".git", "config");
  if (await exists(gitConfigPath)) {
    try {
      const content = await fs.readFile(gitConfigPath, "utf8");
      const match = content.match(/\[remote "origin"\][^\[]*?url = (.+)/);
      if (match?.[1]) {
        const url = match[1].trim();
        const slug = parseRepoSlug(url);
        if (slug) return slug;
      }
    } catch {
      // ignore parsing errors
    }
  }
  return path.basename(cwd);
}

function parseRepoSlug(remoteUrl: string): string | null {
  if (remoteUrl.startsWith("git@")) {
    const match = remoteUrl.match(/:(.+?)(\.git)?$/);
    return match?.[1] ?? null;
  }

  try {
    const url = new URL(remoteUrl);
    const slug = url.pathname.replace(/^\/+/, "").replace(/\.git$/, "");
    return slug || null;
  } catch {
    return null;
  }
}

async function exists(p: string): Promise<boolean> {
  try {
    await fs.access(p);
    return true;
  } catch {
    return false;
  }
}
