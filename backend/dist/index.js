#!/usr/bin/env node

// src/index.ts
import { Command } from "commander";
import chalk6 from "chalk";
import { createRequire } from "module";

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
var HEADER = chalk.dim("\u25CF") + " " + chalk.bold("votrio");
async function runCommand(userCommand, options) {
  const apiKey = await getApiKey();
  const aiEnabled = options.ai && !!apiKey;
  console.log(
    `
${HEADER} ${chalk.dim("watching")} \u2014 node ${process.version}`
  );
  if (aiEnabled) {
    console.log(
      `${chalk.dim("\u25CF")} ${chalk.dim("AI trace analysis")} ${chalk.green("enabled")} ${chalk.dim(`(${options.model.split("-")[1]})
`)}`
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
        await analyzeTrace(trace, options.model, apiKey);
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
import fs from "fs/promises";
import path from "path";
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
  const configPath = path.join(cwd, "votrio.config.ts");
  const votrioDir = path.join(cwd, ".votrio");
  console.log(`
${chalk2.bold("votrio")} ${chalk2.dim("\u2014")} initializing
`);
  const spinner = ora({ text: "Detecting project stack...", color: "green" }).start();
  await sleep(600);
  const detected = await detectStack(cwd);
  spinner.succeed(`Detected: ${chalk2.cyan(detected.join(", "))}`);
  const dirSpinner = ora("Creating .votrio/ directory...").start();
  await fs.mkdir(votrioDir, { recursive: true });
  await fs.writeFile(path.join(votrioDir, ".gitkeep"), "");
  dirSpinner.succeed("Created .votrio/");
  const configSpinner = ora("Writing votrio.config.ts...").start();
  const exists = await fileExists(configPath);
  if (exists) {
    configSpinner.warn("votrio.config.ts already exists \u2014 skipping");
  } else {
    await fs.writeFile(configPath, CONFIG_TEMPLATE, "utf-8");
    configSpinner.succeed("Created votrio.config.ts");
  }
  if (!options.skipGitignore) {
    const gitignoreSpinner = ora("Updating .gitignore...").start();
    const gitignorePath = path.join(cwd, ".gitignore");
    const entry = "\n# votrio\n.votrio/\n";
    const giExists = await fileExists(gitignorePath);
    if (giExists) {
      const content = await fs.readFile(gitignorePath, "utf-8");
      if (!content.includes(".votrio/")) {
        await fs.appendFile(gitignorePath, entry);
        gitignoreSpinner.succeed("Added .votrio/ to .gitignore");
      } else {
        gitignoreSpinner.succeed(".gitignore already up to date");
      }
    } else {
      await fs.writeFile(gitignorePath, entry.trim() + "\n");
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
    if (await fileExists(path.join(cwd, file))) {
      if (!detected.includes(label)) detected.push(label);
    }
  }
  return detected.length > 0 ? detected : ["Unknown"];
}
async function fileExists(p) {
  try {
    await fs.access(p);
    return true;
  } catch {
    return false;
  }
}
function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

// src/commands/scan.ts
import fs2 from "fs/promises";
import path2 from "path";
import chalk3 from "chalk";
import ora2 from "ora";
import { glob } from "glob";
var SEVERITY_ORDER = {
  low: 0,
  medium: 1,
  high: 2,
  critical: 3
};
var SEVERITY_COLORS = {
  low: chalk3.blue,
  medium: chalk3.yellow,
  high: chalk3.red,
  critical: chalk3.bgRed.white
};
var QUICK_PATTERNS = [
  {
    pattern: /process\.env\.\w+\s*\|\|\s*["'][^"']{8,}/g,
    severity: "medium",
    type: "HARDCODED_FALLBACK",
    message: "Hardcoded fallback secret detected"
  },
  {
    pattern: /(?:password|passwd|secret|api_?key|token)\s*[:=]\s*["'][^"']{6,}/gi,
    severity: "high",
    type: "HARDCODED_SECRET",
    message: "Possible hardcoded credential"
  },
  {
    pattern: /dangerouslySetInnerHTML\s*=\s*\{\s*\{.*__html/g,
    severity: "medium",
    type: "XSS_RISK",
    message: "dangerouslySetInnerHTML detected \u2014 verify input is sanitized"
  },
  {
    pattern: /eval\s*\(/g,
    severity: "high",
    type: "EVAL",
    message: "eval() detected \u2014 potential code injection"
  },
  {
    pattern: /child_process.*exec\s*\(/g,
    severity: "medium",
    type: "CMD_INJECTION",
    message: "exec() with potential unsanitized input"
  },
  {
    pattern: /Math\.random\(\).*(?:token|secret|key|nonce|csrf)/gi,
    severity: "high",
    type: "WEAK_RANDOM",
    message: "Math.random() used for security token \u2014 use crypto.randomBytes()"
  }
];
async function scanCommand(scanPath = ".", options) {
  const apiKey = await getApiKey();
  const resolvedPath = path2.resolve(process.cwd(), scanPath);
  console.log(`
${chalk3.bold("votrio")} ${chalk3.dim("scan")}
`);
  const defaultIgnore = [
    "node_modules/**",
    ".next/**",
    "dist/**",
    "build/**",
    ".git/**",
    "**/*.min.js",
    "**/*.map",
    ...options.ignore ?? []
  ];
  const spinner = ora2("Discovering files...").start();
  const files = await glob("**/*.{ts,tsx,js,jsx,py,go,rs}", {
    cwd: resolvedPath,
    ignore: defaultIgnore,
    absolute: true
  });
  spinner.succeed(`Found ${chalk3.cyan(files.length)} files to scan`);
  const scanSpinner = ora2("Scanning for vulnerabilities...").start();
  const findings = [];
  let scanned = 0;
  for (const file of files) {
    scanned++;
    scanSpinner.text = `Scanning ${scanned}/${files.length} \u2014 ${path2.relative(process.cwd(), file)}`;
    try {
      const content = await fs2.readFile(file, "utf-8");
      const lines = content.split("\n");
      const relFile = path2.relative(process.cwd(), file);
      for (const check of QUICK_PATTERNS) {
        const matches = [...content.matchAll(check.pattern)];
        for (const match of matches) {
          const lineNum = content.slice(0, match.index).split("\n").length;
          findings.push({
            file: relFile,
            line: lineNum,
            severity: check.severity,
            type: check.type,
            message: check.message,
            snippet: lines[lineNum - 1]?.trim().slice(0, 120)
          });
        }
      }
    } catch {
    }
  }
  scanSpinner.succeed(`Scanned ${chalk3.cyan(scanned)} files`);
  const deduped = deduplicate(findings).sort(
    (a, b) => SEVERITY_ORDER[b.severity] - SEVERITY_ORDER[a.severity]
  );
  if (options.format === "json") {
    console.log(JSON.stringify(deduped, null, 2));
    return;
  }
  console.log();
  if (deduped.length === 0) {
    console.log(`${chalk3.green("\u2713")} No issues found
`);
  } else {
    for (const f of deduped) {
      const color = SEVERITY_COLORS[f.severity];
      const severityBadge = color(`[${f.severity.toUpperCase()}]`);
      console.log(
        `${severityBadge} ${chalk3.white(f.type)} \u2014 ${chalk3.dim(f.file)}:${chalk3.yellow(f.line)}`
      );
      console.log(`  ${chalk3.dim(f.message)}`);
      if (f.snippet) {
        console.log(`  ${chalk3.dim("\u2192")} ${chalk3.dim(f.snippet)}`);
      }
      console.log();
    }
    const bySeverity = deduped.reduce((acc, f) => {
      acc[f.severity] = (acc[f.severity] ?? 0) + 1;
      return acc;
    }, {});
    const summary = ["critical", "high", "medium", "low"].filter((s) => bySeverity[s]).map((s) => `${SEVERITY_COLORS[s](bySeverity[s])} ${s}`).join("  ");
    console.log(`${deduped.length} issue${deduped.length > 1 ? "s" : ""} found  ${summary}`);
    if (!options.fix) {
      console.log(
        `
Run ${chalk3.cyan("votrio scan --fix")} to auto-patch safe issues
`
      );
    }
  }
  if (options.ci) {
    const threshold = SEVERITY_ORDER[options.failOn];
    const hasAboveThreshold = deduped.some(
      (f) => SEVERITY_ORDER[f.severity] >= threshold
    );
    if (hasAboveThreshold) {
      process.exit(1);
    }
  }
}
function deduplicate(findings) {
  const seen = /* @__PURE__ */ new Set();
  return findings.filter((f) => {
    const key = `${f.file}:${f.line}:${f.type}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
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
${chalk4.bold("votrio")} ${chalk4.dim("\u2014 authenticate")}
`);
  console.log(
    chalk4.dim("  Your key is stored locally and never transmitted to votrio servers.\n")
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

// src/index.ts
var require2 = createRequire(import.meta.url);
var pkg = require2("../package.json");
checkUpdate(pkg.name, pkg.version);
var program = new Command();
program.name("votrio").description(
  chalk6.bold("votrio") + " \u2014 AI-powered terminal trace analysis & security scanning"
).version(pkg.version, "-v, --version", "print current version").helpOption("-h, --help", "display help");
program.command("init").description("initialize votrio in the current project").option("--skip-gitignore", "do not modify .gitignore").action(initCommand);
program.command("run <command>").description('wrap a process and analyze its output (e.g. votrio run "npm start")').option("--no-ai", "disable AI analysis, just pipe output").option("--model <model>", "Anthropic model to use", "claude-sonnet-4-20250514").option("--verbose", "print debug info from votrio itself").allowUnknownOption().action(runCommand);
program.command("scan [path]").description("scan a directory for security vulnerabilities (default: .)").option("--fix", "auto-apply safe patches where possible").option("--ci", "exit with code 1 if issues found (for CI pipelines)").option("--fail-on <severity>", "fail on: low | medium | high | critical", "high").option("--format <fmt>", "output format: text | json | sarif", "text").option("--ignore <patterns...>", "glob patterns to ignore").action(scanCommand);
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
