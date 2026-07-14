#!/usr/bin/env node

// src/index.ts
import { pathToFileURL as pathToFileURL2 } from "url";

// src/cli.ts
import { Command } from "commander";
import chalk6 from "chalk";
import { createRequire as createRequire2 } from "module";

// src/commands/run.ts
import { spawn } from "child_process";
import chalk from "chalk";
import Anthropic from "@anthropic-ai/sdk";

// src/utils/config.ts
import Conf from "conf";
var store = new Conf({ projectName: "votrio" });
async function getApiKey() {
  return process.env.ANTHROPIC_API_KEY ?? store.get("apiKey");
}

// src/utils/trace-extractor.ts
var TRACE_STARTERS = [
  /^(Error|TypeError|ReferenceError|SyntaxError|RangeError|URIError|EvalError):/m,
  /^Traceback \(most recent call last\):/m,
  // Python
  /^goroutine \d+ \[/m,
  // Go
  /^thread '.*' panicked at/m,
  // Rust
  /^fatal error:/m,
  /^panic:/m
];
var STACK_LINE = /^\s+at\s|^\s+File\s"|^\s+goroutine|^\s+\d+\s+0x/m;
function extractTraces(buffer) {
  const traces = [];
  for (const starter of TRACE_STARTERS) {
    const match = starter.exec(buffer);
    if (!match) continue;
    const startIdx = match.index;
    let endIdx = buffer.length;
    const afterStart = buffer.slice(startIdx);
    const blankLineEnd = afterStart.search(/\n\n\n|\n\n(?!\s+at\s)/);
    if (blankLineEnd > 100) {
      endIdx = startIdx + blankLineEnd;
    }
    const trace = buffer.slice(startIdx, endIdx).trim();
    if (STACK_LINE.test(trace) && trace.length > 50) {
      traces.push(trace);
    }
  }
  return traces;
}

// src/commands/run.ts
import stripAnsi from "strip-ansi";

// src/config.ts
import fs from "fs/promises";
import path from "path";
import { pathToFileURL } from "url";
import { createRequire } from "module";
function defineConfig(config) {
  return config;
}
var CONFIG_FILES = [
  "votrio.config.mjs",
  "votrio.config.js",
  "votrio.config.cjs",
  "votrio.config.json",
  ".votrio/config.json"
];
var TS_CONFIG = "votrio.config.ts";
async function loadConfig(cwd = process.cwd()) {
  const warnings = [];
  const found = await firstExisting(cwd, CONFIG_FILES);
  if (!found) {
    const tsPath = path.join(cwd, TS_CONFIG);
    if (await exists(tsPath)) {
      warnings.push(
        `Found ${TS_CONFIG} but it is not loadable at runtime. Rename to votrio.config.mjs or votrio.config.json.`
      );
    }
    return { config: {}, warnings };
  }
  try {
    const config = await importConfig(found);
    return { config: config ?? {}, source: found, warnings };
  } catch (err) {
    warnings.push(
      `Failed to load ${path.relative(cwd, found)}: ${err?.message ?? String(err)}`
    );
    return { config: {}, source: found, warnings };
  }
}
async function importConfig(filePath) {
  if (filePath.endsWith(".json")) {
    const raw = await fs.readFile(filePath, "utf8");
    return JSON.parse(raw);
  }
  if (filePath.endsWith(".cjs")) {
    const require2 = createRequire(import.meta.url);
    const mod2 = require2(filePath);
    return mod2?.default ?? mod2;
  }
  const mod = await import(pathToFileURL(filePath).href);
  return mod?.default ?? mod;
}
async function firstExisting(cwd, files) {
  for (const file of files) {
    const p = path.join(cwd, file);
    if (await exists(p)) return p;
  }
  return void 0;
}
async function exists(p) {
  try {
    await fs.access(p);
    return true;
  } catch {
    return false;
  }
}

// src/commands/run.ts
var HEADER = chalk.dim("\u25CF") + " " + chalk.bold("votrio");
var DEFAULT_MODEL = "claude-sonnet-4-20250514";
async function runCommand(userCommand, options) {
  const { config, warnings, source } = await loadConfig();
  if (options.verbose && warnings.length) {
    for (const warning of warnings) {
      console.log(chalk.yellow(`
${HEADER} ${warning}
`));
    }
  }
  if (options.verbose && source) {
    console.log(chalk.dim(`${HEADER} using config ${source}
`));
  }
  const traceConfig = config.traces ?? {};
  const envModel = process.env.VOTRIO_TRACE_MODEL || process.env.VOTRIO_MODEL || process.env.ANTHROPIC_MODEL;
  const model = options.model !== DEFAULT_MODEL ? options.model : envModel || config.model || DEFAULT_MODEL;
  const apiKey = await getApiKey();
  const tracesEnabled = traceConfig.enabled ?? true;
  const aiEnabled = options.ai && tracesEnabled && !!apiKey;
  console.log(
    `
${HEADER} ${chalk.dim("watching")} \u2014 node ${process.version}`
  );
  if (aiEnabled) {
    console.log(
      `${chalk.dim("\u25CF")} ${chalk.dim("AI trace analysis")} ${chalk.green("enabled")} ${chalk.dim(`(${model.split("-")[1] ?? model})
`)}`
    );
  } else if (options.ai && !tracesEnabled) {
    console.log(
      chalk.yellow(
        `${chalk.dim("\u25CF")} AI disabled \u2014 traces are disabled in config
`
      )
    );
  } else if (options.ai && !apiKey) {
    console.log(
      chalk.yellow(
        `${chalk.dim("\u25CF")} AI disabled \u2014 run ${chalk.cyan("votrio auth")} to enable trace analysis
`
      )
    );
  }
  const [cmd, ...args] = parseCommand(userCommand);
  const child = spawn(cmd, args, {
    stdio: ["inherit", "pipe", "pipe"],
    shell: true,
    env: { ...process.env }
  });
  let stderrBuffer = "";
  child.stdout?.on("data", (data) => {
    process.stdout.write(data);
  });
  child.stderr?.on("data", async (data) => {
    const raw = data.toString();
    process.stderr.write(data);
    stderrBuffer += stripAnsi(raw);
    if (!aiEnabled) return;
    const traces = extractTraces(stderrBuffer);
    if (traces.length > 0) {
      stderrBuffer = "";
      for (const trace of traces) {
        await analyzeTrace(trace, model, apiKey);
      }
    }
  });
  child.on("exit", (code) => {
    if (code !== 0) {
      console.log(
        `
${HEADER} ${chalk.dim("process exited with code")} ${chalk.red(code ?? "null")}
`
      );
    }
    process.exit(code ?? 0);
  });
  child.on("error", (err) => {
    console.error(chalk.red(`
${HEADER} failed to start process: ${err.message}
`));
    process.exit(1);
  });
  process.on("SIGINT", () => child.kill("SIGINT"));
  process.on("SIGTERM", () => child.kill("SIGTERM"));
}
async function analyzeTrace(trace, model, apiKey) {
  const client = new Anthropic({ apiKey });
  const divider = chalk.dim("\u2500".repeat(50));
  console.log(`
${divider}`);
  console.log(`${HEADER} ${chalk.bold("\u2014 trace analysis")}
`);
  try {
    const stream = client.messages.stream({
      model,
      max_tokens: 800,
      system: `You are an expert debugger embedded in a developer's terminal. 
When given a stack trace or error output, you:
1. Identify the root cause in ONE short sentence
2. Explain why it happens (2-3 sentences max)
3. Give the minimal code fix, if applicable
4. State your confidence percentage

Format your response like this (no markdown headers, keep it concise):
Root cause: <one sentence>
<blank line>
Why: <2-3 sentences>
<blank line>  
Fix: <code block or instruction>
<blank line>
Confidence: <X>%`,
      messages: [
        {
          role: "user",
          content: `Stack trace:

${trace}`
        }
      ]
    });
    process.stdout.write("  ");
    for await (const chunk of stream) {
      if (chunk.type === "content_block_delta" && chunk.delta.type === "text_delta") {
        const text = chunk.delta.text.replace(/\n/g, "\n  ");
        process.stdout.write(chalk.white(text));
      }
    }
    console.log(`
${divider}
`);
  } catch (err) {
    console.log(
      chalk.yellow(`  AI analysis unavailable: ${err.message}
`)
    );
    console.log(`${divider}
`);
  }
}
function parseCommand(input) {
  const parts = [];
  let current = "";
  let inQuote = false;
  let quoteChar = "";
  for (const char of input) {
    if (inQuote) {
      if (char === quoteChar) {
        inQuote = false;
      } else {
        current += char;
      }
    } else if (char === '"' || char === "'") {
      inQuote = true;
      quoteChar = char;
    } else if (char === " ") {
      if (current) {
        parts.push(current);
        current = "";
      }
    } else {
      current += char;
    }
  }
  if (current) parts.push(current);
  return parts;
}

// src/commands/init.ts
import fs2 from "fs/promises";
import path2 from "path";
import chalk2 from "chalk";
import ora from "ora";
var CONFIG_TEMPLATE = `import { defineConfig } from "votrio";

export default defineConfig({
  // AI model for trace analysis
  model: "claude-sonnet-4-20250514",

  // Stack trace analysis settings
  traces: {
    enabled: true,
    // Minimum confidence to display (0-100)
    minConfidence: 70,
    // Show fix suggestions
    showFix: true,
  },

  // Security scanning settings
  scan: {
    // Glob patterns to ignore
    ignore: ["node_modules/**", ".next/**", "dist/**", "build/**"],
    // Auto-fix safe issues
    autoFix: false,
  },

  // Slop detection settings  
  slop: {
    enabled: true,
    // Flag imports that don't exist in npm
    checkImports: true,
  },
});
`;
async function initCommand(options) {
  const cwd = process.cwd();
  const configPath = path2.join(cwd, "votrio.config.mjs");
  const legacyConfigPath = path2.join(cwd, "votrio.config.ts");
  const votrioDir = path2.join(cwd, ".votrio");
  console.log(`
${chalk2.bold("votrio")} ${chalk2.dim("\u2014")} initializing
`);
  const spinner = ora({ text: "Detecting project stack...", color: "green" }).start();
  await sleep(600);
  const detected = await detectStack(cwd);
  spinner.succeed(`Detected: ${chalk2.cyan(detected.join(", "))}`);
  const dirSpinner = ora("Creating .votrio/ directory...").start();
  await fs2.mkdir(votrioDir, { recursive: true });
  await fs2.writeFile(path2.join(votrioDir, ".gitkeep"), "");
  dirSpinner.succeed("Created .votrio/");
  const configSpinner = ora("Writing votrio.config.mjs...").start();
  const exists3 = await fileExists(configPath) || await fileExists(legacyConfigPath);
  if (exists3) {
    configSpinner.warn("votrio.config already exists \u2014 skipping");
  } else {
    await fs2.writeFile(configPath, CONFIG_TEMPLATE, "utf-8");
    configSpinner.succeed("Created votrio.config.mjs");
  }
  if (!options.skipGitignore) {
    const gitignoreSpinner = ora("Updating .gitignore...").start();
    const gitignorePath = path2.join(cwd, ".gitignore");
    const entry = "\n# votrio\n.votrio/\n";
    const giExists = await fileExists(gitignorePath);
    if (giExists) {
      const content = await fs2.readFile(gitignorePath, "utf-8");
      if (!content.includes(".votrio/")) {
        await fs2.appendFile(gitignorePath, entry);
        gitignoreSpinner.succeed("Added .votrio/ to .gitignore");
      } else {
        gitignoreSpinner.succeed(".gitignore already up to date");
      }
    } else {
      await fs2.writeFile(gitignorePath, entry.trim() + "\n");
      gitignoreSpinner.succeed("Created .gitignore with .votrio/");
    }
  }
  console.log(`
${chalk2.green("\u2713")} ${chalk2.bold("Ready.")}
`);
  console.log(
    `  Run your app:  ${chalk2.cyan('votrio run "npm start"')}`
  );
  console.log(
    `  Scan now:      ${chalk2.cyan("votrio scan")}
`
  );
}
async function detectStack(cwd) {
  const detected = [];
  const checks = [
    ["package.json", "Node.js"],
    ["tsconfig.json", "TypeScript"],
    ["next.config.js", "Next.js"],
    ["next.config.ts", "Next.js"],
    ["vite.config.ts", "Vite"],
    ["requirements.txt", "Python"],
    ["Cargo.toml", "Rust"],
    ["go.mod", "Go"]
  ];
  for (const [file, label] of checks) {
    if (await fileExists(path2.join(cwd, file))) {
      if (!detected.includes(label)) detected.push(label);
    }
  }
  return detected.length > 0 ? detected : ["Unknown"];
}
async function fileExists(p) {
  try {
    await fs2.access(p);
    return true;
  } catch {
    return false;
  }
}
function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

// src/commands/scan.ts
import fs3 from "fs/promises";
import path3 from "path";
import chalk3 from "chalk";
import ora2 from "ora";
import { glob } from "glob";
var SEVERITY_SCORE = {
  low: 30,
  medium: 55,
  high: 75,
  critical: 90
};
var SEVERITY_COLOR = {
  low: chalk3.blue,
  medium: chalk3.yellow,
  high: chalk3.red,
  critical: chalk3.bgRed.white
};
var QUICK_PATTERNS = [
  {
    pattern: /eval\s*\(/g,
    severity: "high",
    type: "EVAL",
    message: "eval() detected \u2014 possible code injection",
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
async function scanCommand(scanPath = ".", options) {
  const { config, warnings } = await loadConfig();
  if (warnings.length) {
    for (const warning of warnings) {
      console.log(chalk3.yellow(`
${warning}
`));
    }
  }
  const scanConfig = config.scan ?? {};
  const rulesPath = options.rules || scanConfig.rules || await defaultRulesPath(process.cwd());
  const rules = await loadRules(rulesPath);
  for (const warning of rules.warnings) {
    console.log(chalk3.yellow(`
${warning}
`));
  }
  const resolved = path3.resolve(process.cwd(), scanPath);
  console.log(`
${chalk3.bold("votrio")} ${chalk3.dim("scan")}
`);
  const ignore = [
    "node_modules/**",
    ".git/**",
    ".next/**",
    "dist/**",
    "build/**",
    "**/*.min.js",
    ...scanConfig.ignore ?? [],
    ...rules.ignore ?? [],
    ...options.ignore ?? []
  ];
  const aiEnabled = options.ai || scanConfig.ai || process.env.VOTRIO_SCAN_AI === "true";
  const aiModel = options.aiModel || scanConfig.aiModel || process.env.VOTRIO_SCAN_AI_MODEL || "mistral-large-latest";
  const publishEnabled = options.publish || scanConfig.publish || process.env.VOTRIO_PUBLISH === "true";
  const files = await discoverFiles(resolved, ignore);
  const findings = await scanFiles(files, {
    ...options,
    aiModel,
    fix: options.fix || scanConfig.autoFix || false,
    extraPatterns: rules.patterns
  });
  const deduped = dedupe(findings);
  const aiSummary = aiEnabled && deduped.length > 0 ? await summarizeFindings(deduped, aiModel) : null;
  outputResults(deduped, options, aiSummary);
  if (options.ci) handleCI(deduped, options);
  if (publishEnabled) {
    await publishScanSummary(deduped);
  }
}
async function discoverFiles(root, ignore) {
  const spinner = ora2("Discovering files").start();
  const files = await glob("**/*.{ts,tsx,js,jsx,py,go,rs,java,cs,php}", {
    cwd: root,
    ignore,
    absolute: true
  });
  spinner.succeed(`Found ${chalk3.cyan(files.length)} files`);
  return files;
}
async function scanFiles(files, options) {
  const spinner = ora2("Scanning").start();
  const findings = [];
  const checks = [...QUICK_PATTERNS, ...options.extraPatterns ?? []];
  let index = 0;
  for (const file of files) {
    index++;
    spinner.text = `Scanning ${index}/${files.length}`;
    let content;
    try {
      content = await fs3.readFile(file, "utf8");
    } catch {
      continue;
    }
    const lines = content.split("\n");
    for (const check of checks) {
      const matches = [...content.matchAll(check.pattern)];
      for (const match of matches) {
        const line = content.slice(0, match.index).split("\n").length;
        findings.push({
          file: path3.relative(process.cwd(), file),
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
async function defaultRulesPath(cwd) {
  const p = path3.join(cwd, ".votrio", "rules.json");
  return await exists2(p) ? p : void 0;
}
async function loadRules(rulesPath) {
  const warnings = [];
  if (!rulesPath) {
    return { patterns: [], ignore: [], warnings };
  }
  const absolute = path3.isAbsolute(rulesPath) ? rulesPath : path3.join(process.cwd(), rulesPath);
  if (!await exists2(absolute)) {
    warnings.push(`Rules file not found: ${rulesPath}`);
    return { patterns: [], ignore: [], warnings };
  }
  try {
    const raw = await fs3.readFile(absolute, "utf8");
    const data = JSON.parse(raw);
    const patterns = [];
    for (const rule of data.patterns ?? []) {
      if (!rule.pattern || !rule.severity || !rule.type || !rule.message) {
        warnings.push(`Invalid rule in ${rulesPath} \u2014 missing required fields.`);
        continue;
      }
      try {
        patterns.push({
          pattern: new RegExp(rule.pattern, rule.flags),
          severity: rule.severity,
          type: rule.type,
          message: rule.message,
          suggestion: rule.suggestion
        });
      } catch {
        warnings.push(`Invalid regex in ${rulesPath}: ${rule.pattern}`);
      }
    }
    return {
      patterns,
      ignore: data.ignore ?? [],
      warnings
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    warnings.push(`Failed to parse ${rulesPath}: ${message}`);
    return { patterns: [], ignore: [], warnings };
  }
}
function dedupe(findings) {
  const map = /* @__PURE__ */ new Map();
  for (const f of findings) {
    const key = `${f.file}:${f.line}:${f.type}`;
    if (!map.has(key)) map.set(key, f);
  }
  return [...map.values()].sort(
    (a, b) => SEVERITY_SCORE[b.severity] - SEVERITY_SCORE[a.severity]
  );
}
function outputResults(findings, options, aiSummary) {
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
      console.log(`
## AI Summary

${aiSummary}`);
    }
    return;
  }
  if (options.format === "sarif") {
    console.log(JSON.stringify(toSarif(findings), null, 2));
    return;
  }
  console.log();
  if (!findings.length) {
    console.log(chalk3.green("\u2713 No issues found\n"));
    return;
  }
  for (const f of findings) {
    const badge = f.source === "ai" ? chalk3.magenta("[AI]") : SEVERITY_COLOR[f.severity](`[${f.severity.toUpperCase()}]`);
    console.log(
      `${badge} ${chalk3.white(f.type)} (${chalk3.yellow(
        f.score
      )}) ${chalk3.dim(f.file)}:${chalk3.yellow(f.line)}`
    );
    console.log(`  ${chalk3.dim(f.message)}`);
    if (f.snippet) console.log(`  ${chalk3.dim("\u2192")} ${chalk3.dim(f.snippet)}`);
    if (f.suggestion)
      console.log(`  ${chalk3.dim("fix")} ${chalk3.dim(f.suggestion)}`);
    console.log();
  }
  if (aiSummary) {
    console.log(chalk3.cyan("AI summary"));
    console.log(`  ${chalk3.dim(aiSummary)}
`);
  }
  console.log(`${findings.length} issue(s) detected
`);
}
function toSarif(findings) {
  const rules = [];
  const ruleIndex = /* @__PURE__ */ new Map();
  for (const f of findings) {
    if (ruleIndex.has(f.type)) continue;
    ruleIndex.set(f.type, rules.length);
    rules.push({
      id: f.type,
      name: f.type,
      shortDescription: { text: f.message },
      properties: { severity: f.severity, score: f.score }
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
          region: { startLine: Math.max(1, f.line) }
        }
      }
    ],
    properties: { severity: f.severity, score: f.score }
  }));
  return {
    $schema: "https://raw.githubusercontent.com/oasis-tcs/sarif-spec/master/Schemata/sarif-schema-2.1.0.json",
    version: "2.1.0",
    runs: [
      {
        tool: {
          driver: {
            name: "votrio",
            informationUri: "https://votrio.dev",
            rules
          }
        },
        results
      }
    ]
  };
}
function sarifLevel(severity) {
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
function handleCI(findings, options) {
  const threshold = SEVERITY_SCORE[options.failOn];
  const fail = findings.some((f) => SEVERITY_SCORE[f.severity] >= threshold);
  if (fail) process.exit(1);
}
async function publishScanSummary(findings, options) {
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;
  const accessToken = process.env.SUPABASE_ACCESS_TOKEN;
  if (!supabaseUrl || !supabaseAnonKey || !accessToken) {
    console.log(
      chalk3.yellow(
        "\nPublish skipped: SUPABASE_URL, SUPABASE_ANON_KEY, and SUPABASE_ACCESS_TOKEN are required.\n"
      )
    );
    return;
  }
  const repo = options?.repoOverride || await inferRepoSlug(process.cwd());
  const { total, severity, avgScore } = summarizeFindings(findings);
  const userId = decodeUserId(accessToken);
  const payload = {
    repo,
    created_at: (/* @__PURE__ */ new Date()).toISOString(),
    severity,
    issues: total,
    score: avgScore,
    findings: { list: findings }
  };
  if (userId) payload.user_id = userId;
  const spinner = ora2("Publishing scan summary...").start();
  try {
    const res = await fetch(`${supabaseUrl}/rest/v1/scan_history`, {
      method: "POST",
      headers: {
        apikey: supabaseAnonKey,
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
        Prefer: "return=representation"
      },
      body: JSON.stringify(payload)
    });
    if (!res.ok) {
      const text = await res.text();
      spinner.fail(`Publish failed: ${text}`);
      return;
    }
    spinner.succeed("Published scan summary");
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    spinner.fail(`Publish failed: ${message}`);
  }
}
function summarizeFindings(findings) {
  const total = findings.length;
  const maxScore = findings.reduce((max, item) => Math.max(max, item.score), 0);
  const severity = findings.find((item) => item.score === maxScore)?.severity ?? "low";
  const avgScore = total > 0 ? Math.round(findings.reduce((sum, item) => sum + item.score, 0) / total) : 0;
  return { total, severity, avgScore };
}
function decodeUserId(token) {
  try {
    const [, payload] = token.split(".");
    if (!payload) return null;
    const json = Buffer.from(payload, "base64url").toString("utf8");
    const data = JSON.parse(json);
    return data.sub ?? data.user_id ?? null;
  } catch {
    return null;
  }
}
async function inferRepoSlug(cwd) {
  const gitConfigPath = path3.join(cwd, ".git", "config");
  if (await exists2(gitConfigPath)) {
    try {
      const content = await fs3.readFile(gitConfigPath, "utf8");
      const match = content.match(/\[remote "origin"\][^\[]*?url = (.+)/);
      if (match?.[1]) {
        const url = match[1].trim();
        const slug = parseRepoSlug(url);
        if (slug) return slug;
      }
    } catch {
    }
  }
  return path3.basename(cwd);
}
function parseRepoSlug(remoteUrl) {
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
async function exists2(p) {
  try {
    await fs3.access(p);
    return true;
  } catch {
    return false;
  }
}

// src/commands/auth.ts
import chalk4 from "chalk";
import Conf2 from "conf";
import inquirer from "inquirer";
import Anthropic2 from "@anthropic-ai/sdk";
var store2 = new Conf2({ projectName: "votrio" });
async function authCommand(options) {
  if (options.clear) {
    store2.delete("apiKey");
    console.log(`
${chalk4.green("\u2713")} Credentials cleared.
`);
    return;
  }
  const envKey = process.env.ANTHROPIC_API_KEY;
  if (envKey) {
    console.log(
      `
${chalk4.green("\u2713")} ANTHROPIC_API_KEY found in environment \u2014 votrio will use it automatically.
`
    );
    return;
  }
  console.log(`
${chalk4.bold("votrio")} ${chalk4.dim("\u2014 Enable AI Logic ")}
`);
  console.log(
    chalk4.dim("  Your key is stored locally and never accesed publicly.\n")
  );
  const { apiKey } = await inquirer.prompt([
    {
      type: "password",
      name: "apiKey",
      message: "Anthropic API key:",
      mask: "\u2022",
      validate: (v) => v.startsWith("sk-ant-") || "Must be a valid Anthropic key (starts with sk-ant-)"
    }
  ]);
  const spinner = (await import("ora")).default("Verifying key...").start();
  try {
    const client = new Anthropic2({ apiKey });
    await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 10,
      messages: [{ role: "user", content: "hi" }]
    });
    store2.set("apiKey", apiKey);
    spinner.succeed("Key verified and saved");
    console.log(`
  You're all set. Run ${chalk4.cyan('votrio run "npm start"')} to begin.
`);
  } catch (err) {
    spinner.fail("Key verification failed");
    console.error(chalk4.red(`  ${err.message}
`));
  }
}

// src/utils/update.ts
import updateNotifier from "update-notifier";
import chalk5 from "chalk";
function checkUpdate(pkgName, pkgVersion) {
  try {
    const notifier = updateNotifier({
      pkg: { name: pkgName, version: pkgVersion },
      updateCheckInterval: 1e3 * 60 * 60 * 12
    });
    if (notifier.update && process.stdout.isTTY) {
      const latest = notifier.update.latest;
      console.log(
        `
${chalk5.dim("\u25CF")} ${chalk5.bold(pkgName)} update available ${chalk5.dim(
          pkgVersion
        )} \u2192 ${chalk5.green(latest)}`
      );
      console.log(
        `${chalk5.dim("  Run")} ${chalk5.cyan(`npm i -g ${pkgName}`)} ${chalk5.dim("to update.")}
`
      );
    }
  } catch {
  }
}

// src/cli.ts
function runCli() {
  const require2 = createRequire2(import.meta.url);
  const pkg = require2("../package.json");
  checkUpdate(pkg.name, pkg.version);
  const program = new Command();
  program.name("votrio").description(
    chalk6.bold("votrio") + " \u2014 AI-powered terminal trace analysis & security scanning"
  ).version(pkg.version, "-v, --version", "print current version").helpOption("-h, --help", "display help");
  program.command("init").description("initialize votrio in the current project").option("--skip-gitignore", "do not modify .gitignore").action(initCommand);
  program.command("run <command>").description('wrap a process and analyze its output (e.g. votrio run "npm start")').option("--no-ai", "disable AI analysis, just pipe output").option("--model <model>", "Anthropic model to use", "claude-sonnet-4-20250514").option("--verbose", "print debug info from votrio itself").allowUnknownOption().action(runCommand);
  program.command("scan [path]").description("scan a directory for security vulnerabilities (default: .)").option("--fix", "auto-apply safe patches where possible").option("--ci", "exit with code 1 if issues found (for CI pipelines)").option("--fail-on <severity>", "fail on: low | medium | high | critical", "high").option("--format <fmt>", "output format: text | json | markdown | sarif", "text").option("--ignore <patterns...>", "glob patterns to ignore").option("--rules <path>", "path to custom rules JSON (default: .votrio/rules.json)").option("--watch", "daemon mode: rescan on file changes").option("--publish", "publish scan summary to Supabase scan_history").option("--ai", "enable AI refactoring suggestions via Mistral").option("--ai-model <model>", "Mistral model name", "mistral-large-latest").action(scanCommand);
  program.command("auth").description("configure your Anthropic API key").option("--clear", "remove stored credentials").action(authCommand);
  program.on("command:*", (operands) => {
    console.error(
      chalk6.red(`
Error: unknown command '${operands[0]}'
`)
    );
    console.log(`Run ${chalk6.cyan("votrio --help")} to see available commands.
`);
    process.exit(1);
  });
  program.parse(process.argv);
  if (!process.argv.slice(2).length) {
    program.outputHelp();
  }
}

// src/index.ts
var isMain = process.argv[1] && pathToFileURL2(process.argv[1]).href === import.meta.url;
if (isMain) {
  runCli();
}
export {
  defineConfig
};
