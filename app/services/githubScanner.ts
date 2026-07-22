import path from "path";

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
  category?: "code" | "secrets";
  confidence?: "high";
  advisoryId?: string;
  technicalDetails?: string;
};

export type RepositoryProfile = {
  metadata: {
    description: string | null;
    defaultBranch: string;
    visibility: string;
    stars: number;
    forks: number;
    openIssues: number;
    sizeKb: number;
    pushedAt: string | null;
  };
  metrics: {
    repositoryFiles: number;
    scannedFiles: number;
    scannedLines: number;
    scannedBytes: number;
    directories: number;
  };
  languages: Array<{ name: string; bytes: number; files: number; lines: number; percent: number }>;
  fileTypes: Array<{ name: string; files: number; lines: number }>;
  largestFiles: Array<{ path: string; bytes: number; lines: number }>;
  manifests: string[];
};

export type ScanStage =
  | "validating"
  | "cloning"
  | "detecting"
  | "reading"
  | "analyzing"
  | "recommendations";

export type ScanProgress = (stage: ScanStage, detail: string) => void;

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

type RepositoryFile = { path: string; content: string };

const LANGUAGE_BY_EXTENSION: Record<string, string> = {
  ".ts": "TypeScript", ".tsx": "TypeScript", ".js": "JavaScript", ".jsx": "JavaScript",
  ".py": "Python", ".go": "Go", ".rs": "Rust", ".java": "Java", ".cs": "C#", ".php": "PHP",
};

function buildRepositoryProfile(input: {
  repository: {
    description: string | null;
    default_branch: string;
    visibility?: string;
    private: boolean;
    stargazers_count: number;
    forks_count: number;
    open_issues_count: number;
    size: number;
    pushed_at: string | null;
  };
  tree: Array<{ path: string; type: string; size?: number }>;
  files: RepositoryFile[];
  manifests: string[];
  languageBytes: Record<string, number>;
}): RepositoryProfile {
  const languageStats = new Map<string, { files: number; lines: number }>();
  const fileTypeStats = new Map<string, { files: number; lines: number }>();
  const largestFiles: RepositoryProfile["largestFiles"] = [];
  let scannedLines = 0;
  let scannedBytes = 0;

  for (const file of input.files) {
    const extension = path.extname(file.path).toLowerCase() || "other";
    const language = LANGUAGE_BY_EXTENSION[extension] ?? extension.replace(".", "").toUpperCase();
    const lines = file.content ? file.content.split("\n").length : 0;
    const bytes = Buffer.byteLength(file.content, "utf8");
    scannedLines += lines;
    scannedBytes += bytes;
    const languageEntry = languageStats.get(language) ?? { files: 0, lines: 0 };
    languageEntry.files += 1;
    languageEntry.lines += lines;
    languageStats.set(language, languageEntry);
    const typeEntry = fileTypeStats.get(extension) ?? { files: 0, lines: 0 };
    typeEntry.files += 1;
    typeEntry.lines += lines;
    fileTypeStats.set(extension, typeEntry);
    largestFiles.push({ path: file.path, bytes, lines });
  }

  const totalLanguageBytes = Object.values(input.languageBytes).reduce((sum, bytes) => sum + bytes, 0);
  const languageNames = new Set([...Object.keys(input.languageBytes), ...languageStats.keys()]);
  const languages = [...languageNames].map((name) => ({
    name,
    bytes: input.languageBytes[name] ?? 0,
    files: languageStats.get(name)?.files ?? 0,
    lines: languageStats.get(name)?.lines ?? 0,
    percent: totalLanguageBytes ? Math.round(((input.languageBytes[name] ?? 0) / totalLanguageBytes) * 1000) / 10 : 0,
  })).sort((a, b) => b.bytes - a.bytes || b.lines - a.lines);

  return {
    metadata: {
      description: input.repository.description,
      defaultBranch: input.repository.default_branch,
      visibility: input.repository.visibility ?? (input.repository.private ? "private" : "public"),
      stars: input.repository.stargazers_count,
      forks: input.repository.forks_count,
      openIssues: input.repository.open_issues_count,
      sizeKb: input.repository.size,
      pushedAt: input.repository.pushed_at,
    },
    metrics: {
      repositoryFiles: input.tree.filter((entry) => entry.type === "blob").length,
      scannedFiles: input.files.length,
      scannedLines,
      scannedBytes,
      directories: input.tree.filter((entry) => entry.type === "tree").length,
    },
    languages,
    fileTypes: [...fileTypeStats].map(([name, value]) => ({ name, ...value })).sort((a, b) => b.lines - a.lines),
    largestFiles: largestFiles.sort((a, b) => b.bytes - a.bytes).slice(0, 8),
    manifests: input.manifests,
  };
}

function shouldScanFile(filePath: string, ignore: Set<string>) {
  const segments = filePath.split("/");
  return (
    !segments.some((segment) => ignore.has(segment)) &&
    SCAN_EXTENSIONS.has(path.extname(filePath))
  );
}

async function scanFiles(files: RepositoryFile[], options: ScanOptions, onProgress?: ScanProgress) {
  const ignore = new Set(DEFAULT_IGNORE);
  for (const entry of options.ignore ?? []) {
    ignore.add(entry);
  }

  const selectedFiles = files.filter((file) => shouldScanFile(file.path, ignore));
  onProgress?.("reading", `Reading ${selectedFiles.length} supported source file${selectedFiles.length === 1 ? "" : "s"}.`);
  onProgress?.("analyzing", "Reviewing supported source files for risky code and exposed credentials.");
  const findings: Finding[] = [];

  for (const file of selectedFiles) {
    const content = file.content;
    const lines = content.split("\n");
    for (const check of QUICK_PATTERNS) {
      const matches = [...content.matchAll(check.pattern)];
      for (const match of matches) {
        const line = content.slice(0, match.index ?? 0).split("\n").length;
        findings.push({
          file: file.path,
          line,
          severity: check.severity,
          score: SEVERITY_SCORE[check.severity],
          type: check.type,
          message: check.message,
          snippet: lines[line - 1]?.trim(),
          suggestion: check.suggestion,
          source: "regex",
          category: check.type === "HARDCODED_SECRET" ? "secrets" : "code",
          confidence: "high",
          advisoryId: `VOTRIO-${check.type}`,
          technicalDetails: `Matched Votrio's ${check.type} static rule in ${file.path}:${line}.`,
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

export async function runGitHubScan(
  repoUrl: string,
  options: ScanOptions = {},
  onProgress?: ScanProgress,
) {
  return runGitHubScanWithToken(repoUrl, options, undefined, onProgress);
}

export async function runGitHubScanWithToken(
  repoUrl: string,
  options: ScanOptions = {},
  providerToken?: string,
  onProgress?: ScanProgress,
) {
  if (!isValidGitHubUrl(repoUrl)) {
    throw new Error("Invalid GitHub repository URL.");
  }

  onProgress?.("validating", "Repository URL validated. Preparing read-only GitHub API access.");
  const repoName = extractRepoName(repoUrl);
  const [owner, repo] = repoName.split("/");
  const token = providerToken ?? process.env.GITHUB_TOKEN;
  const headers: HeadersInit = {
    Accept: "application/vnd.github+json",
    "User-Agent": "votrio-scanner",
    "X-GitHub-Api-Version": "2022-11-28",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };

  const githubRequest = async <T>(endpoint: string): Promise<T> => {
    const response = await fetch(`https://api.github.com${endpoint}`, {
      headers,
      cache: "no-store",
    });
    if (!response.ok) {
      const requestError = new Error(`GitHub API request failed (${response.status}).`) as Error & { status?: number };
      requestError.status = response.status;
      throw requestError;
    }
    return response.json() as Promise<T>;
  };

  try {
    onProgress?.("cloning", "Reading the default branch through the GitHub API.");
    const repository = await githubRequest<{
      description: string | null; default_branch: string; visibility?: string; private: boolean;
      stargazers_count: number; forks_count: number; open_issues_count: number; size: number; pushed_at: string | null;
    }>(`/repos/${owner}/${repo}`);
    const languageBytes = await githubRequest<Record<string, number>>(`/repos/${owner}/${repo}/languages`);
    const tree = await githubRequest<{
      truncated: boolean;
      tree: Array<{ path: string; type: string; sha: string; size?: number }>;
    }>(`/repos/${owner}/${repo}/git/trees/${encodeURIComponent(repository.default_branch)}?recursive=1`);
    if (tree.truncated) {
      throw new Error("Repository is too large to scan safely in one request.");
    }

    onProgress?.("detecting", "Detecting package managers and repository manifests.");
    const rootEntries = tree.tree.filter((entry) => !entry.path.includes("/")).map((entry) => entry.path);
    const manifests = ["package.json", "package-lock.json", "yarn.lock", "pnpm-lock.yaml", "requirements.txt", "poetry.lock", "go.mod", "Cargo.toml"]
      .filter((name) => rootEntries.includes(name));
    onProgress?.(
      "detecting",
      manifests.length > 0
        ? `Found ${manifests.join(", ")}. Dependency advisories are not enabled in this scanner.`
        : "No supported manifest found at the repository root; continuing with source analysis.",
    );
    const ignore = new Set([...DEFAULT_IGNORE, ...(options.ignore ?? [])]);
    const blobs = tree.tree.filter((entry) =>
      entry.type === "blob" &&
      (entry.size ?? MAX_FILE_SIZE + 1) <= MAX_FILE_SIZE &&
      shouldScanFile(entry.path, ignore),
    ).slice(0, MAX_FILES);
    const files: RepositoryFile[] = [];
    for (let index = 0; index < blobs.length; index += 10) {
      const batch = blobs.slice(index, index + 10);
      const loaded = await Promise.all(batch.map(async (blob) => {
        const data = await githubRequest<{ content: string; encoding: string }>(`/repos/${owner}/${repo}/git/blobs/${blob.sha}`);
        if (data.encoding !== "base64") return null;
        return { path: blob.path, content: Buffer.from(data.content.replace(/\n/g, ""), "base64").toString("utf8") };
      }));
      files.push(...loaded.filter((file): file is RepositoryFile => file !== null));
    }
    const findings = await scanFiles(files, options, onProgress);
    const profile = buildRepositoryProfile({ repository, tree: tree.tree, files, manifests, languageBytes });
    onProgress?.("recommendations", "Ranking findings and generating remediation guidance.");

    return {
      repoUrl,
      repoName,
      findings,
      profile,
    };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    const lowerMessage = message.toLowerCase();
    const status = typeof error === "object" && error !== null && "status" in error
      ? Number((error as { status?: unknown }).status)
      : 0;
    if (
      status === 401 || status === 403 || status === 404 ||
      lowerMessage.includes("authentication")
    ) {
      throw new Error("GitHub authorization is required to access this repository.");
    }
    if (status === 429 || lowerMessage.includes("rate limit")) {
      throw new Error("GitHub rate limit reached. Wait and try the scan again.");
    }
    if (message.includes("too large")) throw error;
    throw new Error("Scan failed.");
  }
}
