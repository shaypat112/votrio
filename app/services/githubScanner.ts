import fs from "fs/promises";
import path from "path";
import os from "os";
import { execFile } from "child_process";
import { promisify } from "util";

const execFileAsync = promisify(execFile);

export type Severity = "low" | "medium" | "high" | "critical";

export type ScanOptions = {
  fix?: boolean;
  ci?: boolean;
  ai?: boolean;
  aiModel?: string;
  failOn?: Severity;
  format?: "text" | "json" | "markdown";
  ignore?: string[];
};

export type Finding = {
  file: string;
  line: number;
  severity: Severity;
  score: number;
  type: string;
  message: string;
  snippet?: string;
  suggestion?: string;
  source: "regex" | "ai";
};

const MAX_FILE_SIZE = 1024 * 1024;
const MAX_FILES = 2000;
const SCAN_EXTENSIONS = new Set([
  ".ts",
  ".tsx",
  ".js",
  ".jsx",
  ".py",
  ".go",
  ".rs",
  ".java",
  ".cs",
  ".php",
]);

const DEFAULT_IGNORE = new Set([
  "node_modules",
  ".git",
  ".next",
  "dist",
  "build",
  "coverage",
  "vendor",
]);

const SEVERITY_SCORE: Record<Severity, number> = {
  low: 30,
  medium: 55,
  high: 75,
  critical: 90,
};

const QUICK_PATTERNS = [
  {
    pattern: /eval\s*\(/g,
    severity: "high" as Severity,
    type: "EVAL",
    message: "eval() detected — possible code injection",
    suggestion: "Avoid eval() and use safer parsing.",
  },
  {
    pattern: /dangerouslySetInnerHTML/g,
    severity: "medium" as Severity,
    type: "XSS_RISK",
    message: "dangerouslySetInnerHTML usage detected",
    suggestion: "Sanitize user input before rendering.",
  },
  {
    pattern: /child_process.*exec\s*\(/g,
    severity: "high" as Severity,
    type: "CMD_INJECTION",
    message: "exec() usage detected",
    suggestion: "Use spawn with arguments instead.",
  },
  {
    pattern: /(?:password|secret|token|api_?key)\s*[:=]\s*["'][^"']{6,}/gi,
    severity: "high" as Severity,
    type: "HARDCODED_SECRET",
    message: "Possible hardcoded credential",
    suggestion: "Move secrets to environment variables.",
  },
];

function isValidGitHubUrl(repoUrl: string) {
  const pattern = /^https:\/\/github\.com\/[\w.-]+\/[\w.-]+(\/)?$/;
  return pattern.test(repoUrl.trim());
}

function extractRepoName(repoUrl: string) {
  const trimmed = repoUrl.replace(/\/$/, "");
  const parts = trimmed.split("/");
  return parts.slice(-2).join("/");
}

async function walk(dir: string, ignore: Set<string>, files: string[] = []) {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (ignore.has(entry.name)) continue;
    if (entry.isDirectory()) {
      await walk(fullPath, ignore, files);
    } else if (entry.isFile()) {
      if (!SCAN_EXTENSIONS.has(path.extname(entry.name))) continue;
      const stat = await fs.stat(fullPath);
      if (stat.size > MAX_FILE_SIZE) continue;
      files.push(fullPath);
      if (files.length >= MAX_FILES) return files;
    }
  }
  return files;
}

async function scanFiles(root: string, options: ScanOptions) {
  const ignore = new Set(DEFAULT_IGNORE);
  for (const entry of options.ignore ?? []) {
    ignore.add(entry);
  }

  const files = await walk(root, ignore);
  const findings: Finding[] = [];

  for (const file of files) {
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
        const line = content.slice(0, match.index ?? 0).split("\n").length;
        findings.push({
          file: path.relative(root, file),
          line,
          severity: check.severity,
          score: SEVERITY_SCORE[check.severity],
          type: check.type,
          message: check.message,
          snippet: lines[line - 1]?.trim(),
          suggestion: check.suggestion,
          source: "regex",
        });
      }
    }
  }

  const map = new Map<string, Finding>();
  for (const f of findings) {
    const key = `${f.file}:${f.line}:${f.type}`;
    if (!map.has(key)) map.set(key, f);
  }

  return [...map.values()].sort(
    (a, b) => SEVERITY_SCORE[b.severity] - SEVERITY_SCORE[a.severity],
  );
}

export async function runGitHubScan(repoUrl: string, options: ScanOptions = {}) {
  return runGitHubScanWithToken(repoUrl, options);
}

export async function runGitHubScanWithToken(
  repoUrl: string,
  options: ScanOptions = {},
  providerToken?: string,
) {
  if (!isValidGitHubUrl(repoUrl)) {
    throw new Error("Invalid GitHub repository URL.");
  }

  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "votrio-scan-"));
  const repoName = extractRepoName(repoUrl);
  const repoPath = path.join(tempDir, "repo");

  try {
    await execFileAsync("git", ["--version"], { timeout: 10_000 });
    const cloneArgs = [
      ...(providerToken
        ? [
            "-c",
            `http.extraHeader=AUTHORIZATION: basic ${Buffer.from(
              `x-access-token:${providerToken}`,
            ).toString("base64")}`,
          ]
        : []),
      "clone",
      "--depth",
      "1",
      "--filter=blob:limit=1m",
      "--single-branch",
      repoUrl,
      repoPath,
    ];
    await execFileAsync("git", cloneArgs, {
      env: { ...process.env, GIT_TERMINAL_PROMPT: "0" },
      timeout: 120_000,
      maxBuffer: 5 * 1024 * 1024,
    });

    const findings = await scanFiles(repoPath, options);

    return {
      repoUrl,
      repoName,
      findings,
    };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    const code =
      typeof error === "object" && error !== null && "code" in error
        ? String((error as { code?: unknown }).code ?? "")
        : "";

    if (message.includes("not found") || code === "ENOENT") {
      throw new Error("Git is not available on the server.");
    }
    if (message.includes("clone")) {
      throw new Error("Clone failed.");
    }
    throw new Error("Scan failed.");
  } finally {
    await fs.rm(tempDir, { recursive: true, force: true });
  }
}
