import fs from "fs/promises";
import path from "path";
import chalk from "chalk";
import ora from "ora";
import { glob } from "glob";

interface ScanOptions {
  fix: boolean;
  ci: boolean;
  failOn: "low" | "medium" | "high" | "critical";
  format: "text" | "json" | "markdown" | "sarif";
  ignore: string[];
  rules?: string;
  watch?: boolean;
  publish?: boolean;
}

type Severity = "low" | "medium" | "high" | "critical";

interface CustomRule {
  pattern: string;
  flags?: string;
  severity: Severity;
  type: string;
  message: string;
  suggestion?: string;
  score?: number;
}

interface RulesFile {
  ignore?: string[];
  rules?: CustomRule[];
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
}

const SEVERITY_ORDER: Record<Severity, number> = {
  low: 0,
  medium: 1,
  high: 2,
  critical: 3,
};

const SEVERITY_COLORS: Record<Severity, chalk.Chalk> = {
  low: chalk.blue,
  medium: chalk.yellow,
  high: chalk.red,
  critical: chalk.bgRed.white,
};

// Regex-based fast patterns (no AI needed for these)
const QUICK_PATTERNS: Array<{
  pattern: RegExp;
  severity: Severity;
  type: string;
  message: string;
}> = [
  {
    pattern: /process\.env\.\w+\s*\|\|\s*["'][^"']{8,}/g,
    severity: "medium",
    type: "HARDCODED_FALLBACK",
    message: "Hardcoded fallback secret detected",
  },
  {
    pattern: /(?:password|passwd|secret|api_?key|token)\s*[:=]\s*["'][^"']{6,}/gi,
    severity: "high",
    type: "HARDCODED_SECRET",
    message: "Possible hardcoded credential",
  },
  {
    pattern: /dangerouslySetInnerHTML\s*=\s*\{\s*\{.*__html/g,
    severity: "medium",
    type: "XSS_RISK",
    message: "dangerouslySetInnerHTML detected — verify input is sanitized",
  },
  {
    pattern: /eval\s*\(/g,
    severity: "high",
    type: "EVAL",
    message: "eval() detected — potential code injection",
  },
  {
    pattern: /child_process.*exec\s*\(/g,
    severity: "medium",
    type: "CMD_INJECTION",
    message: "exec() with potential unsanitized input",
  },
  {
    pattern: /Math\.random\(\).*(?:token|secret|key|nonce|csrf)/gi,
    severity: "high",
    type: "WEAK_RANDOM",
    message: "Math.random() used for security token — use crypto.randomBytes()",
  },
];

const SUGGESTIONS: Record<string, string> = {
  HARDCODED_FALLBACK:
    "Move secrets to environment variables or a secret manager.",
  HARDCODED_SECRET:
    "Remove hardcoded credentials and rotate the exposed secret.",
  XSS_RISK: "Sanitize or escape user input before rendering.",
  EVAL: "Avoid eval(); use safe parsing or a whitelist approach.",
  CMD_INJECTION:
    "Prefer spawn with args and validate or escape user input.",
  WEAK_RANDOM: "Use crypto.randomBytes() or a CSPRNG.",
};

const SCORE_BY_SEVERITY: Record<Severity, number> = {
  low: 30,
  medium: 55,
  high: 75,
  critical: 90,
};

function getSuggestion(type: string) {
  return SUGGESTIONS[type] ?? "Review this finding and apply a safe fix.";
}

function getScore(severity: Severity) {
  return SCORE_BY_SEVERITY[severity];
}

export async function scanCommand(scanPath: string = ".", options: ScanOptions) {
  const resolvedPath = path.resolve(process.cwd(), scanPath);

  console.log(`\n${chalk.bold("votrio")} ${chalk.dim("scan")}\n`);

  const defaultIgnore = [
    "node_modules/**",
    ".next/**",
    "dist/**",
    "build/**",
    ".git/**",
    "**/*.min.js",
    "**/*.map",
    ...(options.ignore ?? []),
  ];

  const rulesConfig = await loadRulesConfig(
    options.rules ? path.resolve(process.cwd(), options.rules) : undefined
  );
  if (rulesConfig?.ignore?.length) {
    defaultIgnore.push(...rulesConfig.ignore);
  }

  const customPatterns = buildCustomPatterns(rulesConfig?.rules ?? []);

  if (options.watch) {
    await watchScan(resolvedPath, defaultIgnore, customPatterns);
    return;
  }

  await runScanOnce(resolvedPath, defaultIgnore, customPatterns, options);
}

async function runScanOnce(
  resolvedPath: string,
  defaultIgnore: string[],
  customPatterns: Array<{
    pattern: RegExp;
    severity: Severity;
    type: string;
    message: string;
    suggestion?: string;
    score?: number;
  }>,
  options: ScanOptions
) {
  // Find files
  const spinner = ora("Discovering files...").start();
  const files = await glob("**/*.{ts,tsx,js,jsx,py,go,rs,java,cs,kt,rb,php}", {
    cwd: resolvedPath,
    ignore: defaultIgnore,
    absolute: true,
  });
  spinner.succeed(`Found ${chalk.cyan(files.length)} files to scan`);

  const scanSpinner = ora("Scanning for vulnerabilities...").start();
  const findings: Finding[] = [];
  let scanned = 0;

  for (const file of files) {
    scanned++;
    scanSpinner.text = `Scanning ${scanned}/${files.length} — ${path.relative(process.cwd(), file)}`;

    try {
      const content = await fs.readFile(file, "utf-8");
      const lines = content.split("\n");
      const relFile = path.relative(process.cwd(), file);

      for (const check of [...QUICK_PATTERNS, ...customPatterns]) {
        const matches = [...content.matchAll(check.pattern)];
        for (const match of matches) {
          const lineNum = content.slice(0, match.index).split("\n").length;
          findings.push({
            file: relFile,
            line: lineNum,
            severity: check.severity,
            score: check.score ?? getScore(check.severity),
            type: check.type,
            message: check.message,
            snippet: lines[lineNum - 1]?.trim().slice(0, 120),
            suggestion: check.suggestion ?? getSuggestion(check.type),
          });
        }
      }
    } catch {
      // skip unreadable files
    }
  }

  scanSpinner.succeed(`Scanned ${chalk.cyan(scanned)} files`);

  // Dedup & sort by severity
  const deduped = deduplicate(findings).sort(
    (a, b) => SEVERITY_ORDER[b.severity] - SEVERITY_ORDER[a.severity]
  );

  // Output
  if (options.format === "json") {
    console.log(JSON.stringify(deduped, null, 2));
    if (options.publish) {
      await publishScan(deduped, resolvedPath);
    }
    return;
  }

  if (options.format === "markdown") {
    console.log(`# Votrio Scan Report\n`);
    if (deduped.length === 0) {
      console.log("No issues found.");
      return;
    }
    console.log(
      "| Severity | Score | Type | File | Line | Message | Suggestion |"
    );
    console.log(
      "| --- | --- | --- | --- | --- | --- | --- |"
    );
    for (const f of deduped) {
      console.log(
        `| ${f.severity} | ${f.score} | ${f.type} | ${f.file} | ${f.line} | ${f.message} | ${f.suggestion ?? ""} |`
      );
    }
    if (options.publish) {
      await publishScan(deduped, resolvedPath);
    }
    return;
  }

  console.log();

  if (deduped.length === 0) {
    console.log(`${chalk.green("✓")} No issues found\n`);
  } else {
    for (const f of deduped) {
      const color = SEVERITY_COLORS[f.severity];
      const severityBadge = color(`[${f.severity.toUpperCase()}]`);
      console.log(
        `${severityBadge} ${chalk.white(f.type)} (${chalk.yellow(f.score)}) — ${chalk.dim(f.file)}:${chalk.yellow(f.line)}`
      );
      console.log(`  ${chalk.dim(f.message)}`);
      if (f.snippet) {
        console.log(`  ${chalk.dim("→")} ${chalk.dim(f.snippet)}`);
      }
      if (f.suggestion) {
        console.log(`  ${chalk.dim("fix")} ${chalk.dim(f.suggestion)}`);
      }
      console.log();
    }

    const bySeverity = deduped.reduce((acc, f) => {
      acc[f.severity] = (acc[f.severity] ?? 0) + 1;
      return acc;
    }, {} as Record<Severity, number>);

    const summary = (["critical", "high", "medium", "low"] as Severity[])
      .filter((s) => bySeverity[s])
      .map((s) => `${SEVERITY_COLORS[s](bySeverity[s])} ${s}`)
      .join("  ");

    console.log(`${deduped.length} issue${deduped.length > 1 ? "s" : ""} found  ${summary}`);

    if (!options.fix) {
      console.log(
        `\nRun ${chalk.cyan("votrio scan --fix")} to auto-patch safe issues\n`
      );
    }
  }

  // CI exit code
  if (options.ci) {
    const threshold = SEVERITY_ORDER[options.failOn];
    const hasAboveThreshold = deduped.some(
      (f) => SEVERITY_ORDER[f.severity] >= threshold
    );
    if (hasAboveThreshold) {
      process.exit(1);
    }
  }

  if (options.publish) {
    await publishScan(deduped, resolvedPath);
  }
}

async function watchScan(
  resolvedPath: string,
  defaultIgnore: string[],
  customPatterns: Array<{
    pattern: RegExp;
    severity: Severity;
    type: string;
    message: string;
    suggestion?: string;
    score?: number;
  }>
) {
  const { default: chokidar } = await import("chokidar");
  const watched = await glob("**/*.{ts,tsx,js,jsx,py,go,rs,java,cs,kt,rb,php}", {
    cwd: resolvedPath,
    ignore: defaultIgnore,
    absolute: true,
  });

  console.log(
    chalk.dim(`Watching ${watched.length} files for changes... (ctrl+c to exit)\n`)
  );

  let timer: NodeJS.Timeout | null = null;

  const trigger = () => {
    if (timer) clearTimeout(timer);
    timer = setTimeout(async () => {
      console.log(chalk.dim("\nChange detected. Re-scanning...\n"));
      await runScanOnce(
        resolvedPath,
        defaultIgnore,
        customPatterns,
        {
          fix: false,
          ci: false,
          failOn: "high",
          format: "text",
          ignore: [],
        }
      );
    }, 400);
  };

  chokidar
    .watch(watched, { ignoreInitial: true })
    .on("add", trigger)
    .on("change", trigger)
    .on("unlink", trigger);
}

function summarizeScan(findings: Finding[]) {
  if (findings.length === 0) {
    return { severity: "low" as Severity, score: 0, issues: 0 };
  }

  const maxSeverity = findings.reduce((current, f) => {
    return SEVERITY_ORDER[f.severity] > SEVERITY_ORDER[current]
      ? f.severity
      : current;
  }, "low" as Severity);

  const avgScore =
    Math.round(findings.reduce((sum, f) => sum + f.score, 0) / findings.length) ||
    0;

  return { severity: maxSeverity, score: avgScore, issues: findings.length };
}

function decodeUserId(token: string): string | null {
  const parts = token.split(".");
  if (parts.length < 2) return null;
  try {
    const payload = JSON.parse(
      Buffer.from(parts[1].replace(/-/g, "+").replace(/_/g, "/"), "base64").toString(
        "utf-8"
      )
    );
    return payload.sub ?? null;
  } catch {
    return null;
  }
}

async function publishScan(findings: Finding[], resolvedPath: string) {
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;
  const accessToken = process.env.SUPABASE_ACCESS_TOKEN;

  if (!supabaseUrl || !supabaseAnonKey || !accessToken) {
    console.log(
      chalk.yellow(
        "  Skipping publish: set SUPABASE_URL, SUPABASE_ANON_KEY, and SUPABASE_ACCESS_TOKEN"
      )
    );
    return;
  }

  const userId = decodeUserId(accessToken);
  if (!userId) {
    console.log(chalk.yellow("  Skipping publish: invalid SUPABASE_ACCESS_TOKEN"));
    return;
  }

  const summary = summarizeScan(findings);
  const repo = path.basename(resolvedPath);

  const payload = {
    user_id: userId,
    repo,
    severity: summary.severity,
    issues: summary.issues,
    score: summary.score,
    findings,
  };

  try {
    const response = await fetch(`${supabaseUrl}/rest/v1/scan_history`, {
      method: "POST",
      headers: {
        apikey: supabaseAnonKey,
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
        Prefer: "return=representation",
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.log(
        chalk.yellow(`  Publish failed: ${response.status} ${errorText}`)
      );
      return;
    }

    console.log(chalk.dim("  Published scan to Supabase."));
  } catch (err: any) {
    console.log(chalk.yellow(`  Publish failed: ${err.message}`));
  }
}

async function loadRulesConfig(pathOverride?: string): Promise<RulesFile | null> {
  const candidate = pathOverride ?? path.join(process.cwd(), ".votrio/rules.json");
  try {
    const content = await fs.readFile(candidate, "utf-8");
    return JSON.parse(content) as RulesFile;
  } catch {
    return null;
  }
}

function buildCustomPatterns(rules: CustomRule[]) {
  const patterns: Array<{
    pattern: RegExp;
    severity: Severity;
    type: string;
    message: string;
    suggestion?: string;
    score?: number;
  }> = [];

  for (const rule of rules) {
    try {
      const regex = new RegExp(rule.pattern, rule.flags ?? "g");
      patterns.push({
        pattern: regex,
        severity: rule.severity,
        type: rule.type,
        message: rule.message,
        suggestion: rule.suggestion,
        score: rule.score,
      });
    } catch {
      // skip invalid regex rules
    }
  }

  return patterns;
}

function deduplicate(findings: Finding[]): Finding[] {
  const seen = new Set<string>();
  return findings.filter((f) => {
    const key = `${f.file}:${f.line}:${f.type}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}
