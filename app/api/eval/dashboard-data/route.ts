import { NextResponse } from "next/server";
import { Octokit } from "@octokit/rest";

export const runtime = "nodejs";

// Initialize clients
const MISTRAL_API_KEY = process.env.MISTRAL_API_KEY;
const GITHUB_TOKEN = process.env.GITHUB_TOKEN;

export async function POST(request: Request) {
  try {
    const { repoUrl } = await request.json();

    if (!repoUrl) {
      return NextResponse.json({ error: "Missing repoUrl" }, { status: 400 });
    }

    console.log("🔍 Fetching repository data for:", repoUrl);

    // Parse GitHub URL
    const parsedRepo = parseGitHubUrl(repoUrl);
    if (!parsedRepo) {
      return NextResponse.json({ error: "Invalid GitHub repository URL" }, { status: 400 });
    }

    // Fetch GitHub repository data
    const repoData = await fetchGitHubRepoData(parsedRepo.owner, parsedRepo.repo);
    console.log("📊 Repository data fetched");

    // Fetch repository files and analyze for security issues
    const securityAnalysis = await analyzeRepositoryForSecurity(parsedRepo.owner, parsedRepo.repo, repoData);
    console.log("🔒 Security analysis complete");

    // Generate AI insights using Mistral
    const aiInsights = await generateMistralInsights(repoData, securityAnalysis);
    console.log("✨ AI insights generated");

    // Build comprehensive dashboard data
    const dashboardData = buildDashboardData(repoData, securityAnalysis, aiInsights);

    console.log("🎯 Dashboard data generated successfully");
    return NextResponse.json(dashboardData);

  } catch (error) {
    console.error("❌ Dashboard data error:", error);
    return NextResponse.json(
      {
        error: "Failed to generate dashboard data",
        details: error instanceof Error ? error.message : "Unknown error"
      },
      { status: 500 }
    );
  }
}

function parseGitHubUrl(url: string): { owner: string; repo: string } | null {
  try {
    const urlObj = new URL(url);
    if (!urlObj.hostname.includes("github.com")) return null;

    const parts = urlObj.pathname.split("/").filter(Boolean);
    if (parts.length < 2) return null;

    return { owner: parts[0], repo: parts[1].replace(/\.git$/, "") };
  } catch {
    return null;
  }
}

async function fetchGitHubRepoData(owner: string, repo: string) {
  const octokit = new Octokit({
    auth: GITHUB_TOKEN || undefined,
  });

  try {
    // Get repository info
    const repoResponse = await octokit.repos.get({ owner, repo });
    const repoInfo = repoResponse.data;

    // Get languages
    const languagesResponse = await octokit.repos.listLanguages({ owner, repo });
    const languageBytes = languagesResponse.data || {};
    const languages = Object.keys(languageBytes);

    // Get topics/tags and repository inventory from GitHub. These values are
    // used directly by the dashboard; do not synthesize metrics from stars.
    const topicsResponse = await octokit.repos.getAllTopics({ owner, repo }).catch(() => ({ data: { names: [] } }));
    const topics = topicsResponse.data.names || [];

    // Get recent commits
    const commitsResponse = await octokit.repos.listCommits({ owner, repo, per_page: 10 });
    const recentCommits = commitsResponse.data || [];
    const [branchesResponse, releasesResponse, contributorsResponse, treeResponse] = await Promise.all([
      octokit.repos.listBranches({ owner, repo, per_page: 100 }).catch(() => ({ data: [] })),
      octokit.repos.listReleases({ owner, repo, per_page: 100 }).catch(() => ({ data: [] })),
      octokit.repos.listContributors({ owner, repo, per_page: 100 }).catch(() => ({ data: [] })),
      octokit.git.getTree({ owner, repo, tree_sha: repoInfo.default_branch, recursive: "true" }).catch(() => ({ data: { tree: [] } })),
    ]);
    const repositoryFiles = (treeResponse.data.tree ?? []).filter((entry) => entry.type === "blob");
    const directories = new Set(repositoryFiles.map((entry) => entry.path?.split("/").slice(0, -1).join("/") ?? "").filter(Boolean));
    const totalBytes = repositoryFiles.reduce((sum, entry) => sum + (entry.size ?? 0), 0);

    // Get package.json or other config to detect frameworks
    let frameworks: string[] = [];
    let packageManager = "unknown";
    
    try {
      const packageResponse = await octokit.repos.getContent({ owner, repo, path: "package.json" });
      if (packageResponse.data && 'content' in packageResponse.data) {
        const content = Buffer.from(packageResponse.data.content, 'base64').toString();
        const pkg = JSON.parse(content);

        // Detect frameworks from dependencies
        const allDeps = { ...pkg.dependencies, ...pkg.devDependencies };
        if (allDeps.react) frameworks.push("React");
        if (allDeps.next) frameworks.push("Next.js");
        if (allDeps.vue) frameworks.push("Vue");
        if (allDeps.angular) frameworks.push("Angular");
        if (allDeps.express) frameworks.push("Express");
        if (allDeps.fastify) frameworks.push("Fastify");
        if (allDeps.nestjs) frameworks.push("NestJS");

        packageManager = pkg.packageManager ? pkg.packageManager.split("@")[0] : "npm";
      }
    } catch (e) {
      console.warn("Could not read package.json");
    }

    return {
      name: repoInfo.name,
      owner: repoInfo.owner.login,
      description: repoInfo.description,
      url: repoInfo.html_url,
      stars: repoInfo.stargazers_count,
      forks: repoInfo.forks_count,
      watchers: repoInfo.watchers_count,
      openIssues: repoInfo.open_issues_count,
      createdAt: repoInfo.created_at,
      updatedAt: repoInfo.updated_at,
      pushedAt: repoInfo.pushed_at,
      language: repoInfo.language,
      languages,
      languageBytes,
      topics,
      frameworks,
      packageManager,
      hasWiki: repoInfo.has_wiki,
      hasIssues: repoInfo.has_issues,
      hasDiscussions: repoInfo.has_discussions,
      license: repoInfo.license?.name,
      visibility: repoInfo.private ? "private" : "public",
      recentCommits: recentCommits.map(c => ({
        message: c.commit.message.split('\n')[0],
        author: c.commit.author?.name,
        date: c.commit.author?.date,
      })),
      inventory: {
        totalFiles: repositoryFiles.length,
        totalFolders: directories.size,
        totalBytes,
        contributors: contributorsResponse.data.length,
        branches: branchesResponse.data.length,
        releases: releasesResponse.data.length,
      },
    };
  } catch (error) {
    console.error("Failed to fetch GitHub repo data:", error);
    throw error;
  }
}

async function analyzeRepositoryForSecurity(owner: string, repo: string, repoData: any) {
  const octokit = new Octokit({
    auth: GITHUB_TOKEN || undefined,
  });

  const findings: any[] = [];

  try {
    // Check for common security files
    const securityFiles = ["SECURITY.md", "security.md", ".github/security.md"];
    let hasSecurityPolicy = false;

    for (const file of securityFiles) {
      try {
        await octokit.repos.getContent({ owner, repo, path: file });
        hasSecurityPolicy = true;
        break;
      } catch { /* file not found */ }
    }

    if (!hasSecurityPolicy) {
      findings.push({
        type: "MISSING_SECURITY_POLICY",
        severity: "medium",
        message: "No SECURITY.md file found",
        description: "Repository should have a security policy for responsible disclosure",
      });
    }

    // Check for license
    if (!repoData.license) {
      findings.push({
        type: "MISSING_LICENSE",
        severity: "low",
        message: "No license file found",
        description: "Repository should declare a license",
      });
    }

    // Check for README
    try {
      await octokit.repos.getReadme({ owner, repo });
    } catch {
      findings.push({
        type: "MISSING_README",
        severity: "low",
        message: "No README.md found",
        description: "Repository should have comprehensive documentation",
      });
    }

    // Check for CI/CD workflows
    let hasCICD = false;
    try {
      const workflows = await octokit.actions.listRepoWorkflows({ owner, repo }).catch(() => ({ data: { workflows: [] } }));
      hasCICD = (workflows.data.workflows || []).length > 0;
    } catch { /* workflows not enabled */ }

    if (!hasCICD) {
      findings.push({
        type: "NO_CI_CD",
        severity: "medium",
        message: "No CI/CD workflows detected",
        description: "Automated testing and deployment should be configured",
      });
    }

    // Check for recent activity
    const lastUpdate = new Date(repoData.pushedAt);
    const monthsAgo = (Date.now() - lastUpdate.getTime()) / (1000 * 60 * 60 * 24 * 30);

    if (monthsAgo > 12) {
      findings.push({
        type: "STALE_REPOSITORY",
        severity: "low",
        message: "Repository hasn't been updated in over a year",
        description: "Consider updating dependencies and checking for security vulnerabilities",
      });
    } else if (monthsAgo > 6) {
      findings.push({
        type: "INACTIVE_REPOSITORY",
        severity: "low",
        message: "Repository activity is low (>6 months)",
        description: "Monitor for security updates and maintenance needs",
      });
    }

    // Check for active issues
    if (repoData.openIssues > 50) {
      findings.push({
        type: "HIGH_OPEN_ISSUES",
        severity: "medium",
        message: `${repoData.openIssues} open issues detected`,
        description: "Consider prioritizing bug fixes and security issues",
      });
    }

  } catch (error) {
    console.error("Security analysis error:", error);
  }

  return findings;
}

async function generateMistralInsights(repoData: any, securityFindings: any[]) {
  if (!MISTRAL_API_KEY) {
    console.warn("⚠️ Mistral API key not configured, using fallback insights");
    return generateFallbackInsights(repoData, securityFindings);
  }

  try {
    const prompt = `Analyze this GitHub repository and provide security and architecture insights:

Repository: ${repoData.owner}/${repoData.name}
Description: ${repoData.description}
Languages: ${repoData.languages.join(", ") || "unknown"}
Frameworks: ${repoData.frameworks.join(", ") || "none detected"}
Stars: ${repoData.stars}
Open Issues: ${repoData.openIssues}
Last Updated: ${new Date(repoData.pushedAt).toLocaleDateString()}

Security Issues Detected:
${securityFindings.map(f => `- ${f.message} (${f.severity})`).join("\n") || "- No issues detected"}

Please provide:
1. Overall security posture assessment
2. Key risk areas
3. Recommendations for improvement
4. Architecture health summary`;

    const response = await fetch("https://api.mistral.ai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${MISTRAL_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "mistral-large-latest",
        messages: [
          {
            role: "user",
            content: prompt,
          },
        ],
        temperature: 0.7,
        max_tokens: 1000,
      }),
    });

    if (!response.ok) {
      throw new Error(`Mistral API error: ${response.statusText}`);
    }

    const data = await response.json();
    const insights = data.choices[0]?.message?.content || "";

    return {
      summary: insights,
      timestamp: new Date().toISOString(),
      model: "mistral-large-latest",
    };
  } catch (error) {
    console.error("Mistral AI error:", error);
    return generateFallbackInsights(repoData, securityFindings);
  }
}

function generateFallbackInsights(repoData: any, securityFindings: any[]) {
  const insights: string[] = [];

  // Overall security assessment
  const riskScore = 100 - (20 * securityFindings.length);
  insights.push(`📊 Security Posture: ${Math.max(20, riskScore)}% - ${riskScore > 70 ? "Good" : riskScore > 40 ? "Fair" : "Needs Improvement"}`);

  // Key findings
  if (securityFindings.length > 0) {
    insights.push("\n🔴 Key Issues:");
    securityFindings.forEach(f => {
      insights.push(`  • ${f.message}`);
    });
  }

  // Architecture assessment
  insights.push("\n🏗️ Architecture Health:");
  if (repoData.frameworks.length > 0) {
    insights.push(`  • Using: ${repoData.frameworks.join(", ")}`);
  } else {
    insights.push("  • No popular frameworks detected");
  }

  if (repoData.languages.length > 1) {
    insights.push(`  • Multiple languages: ${repoData.languages.join(", ")}`);
  }

  insights.push(`  • Package manager: ${repoData.packageManager}`);

  // Recommendations
  insights.push("\n💡 Recommendations:");
  if (!securityFindings.find(f => f.type === "NO_CI_CD")) {
    insights.push("  • Maintain active CI/CD pipelines");
  }
  if (securityFindings.find(f => f.type === "HIGH_OPEN_ISSUES")) {
    insights.push("  • Prioritize resolving open issues");
  }
  if (repoData.stars < 100 && repoData.watchers < 20) {
    insights.push("  • Consider improving documentation and README");
  }

  return {
    summary: insights.join("\n"),
    timestamp: new Date().toISOString(),
    model: "fallback",
  };
}

function buildDashboardData(repoData: any, securityFindings: any[], aiInsights: any) {
  const criticalIssues = securityFindings.filter(f => f.severity === "critical").length;
  const highIssues = securityFindings.filter(f => f.severity === "high").length;
  const mediumIssues = securityFindings.filter(f => f.severity === "medium").length;
  const lowIssues = securityFindings.filter(f => f.severity === "low").length;

  // Calculate security score (0-100)
  let securityScore = 100;
  securityScore -= criticalIssues * 25;
  securityScore -= highIssues * 15;
  securityScore -= mediumIssues * 5;
  securityScore -= lowIssues * 2;
  securityScore = Math.max(20, Math.min(100, securityScore));

  const languageBytes = repoData.languages.reduce((sum: number, language: string) => sum + (repoData.languageBytes?.[language] ?? 0), 0);

  return {
    metrics: {
      totalFiles: repoData.inventory.totalFiles,
      totalFolders: repoData.inventory.totalFolders,
      totalLines: 0,
      totalBytes: repoData.inventory.totalBytes,
      lineCountAvailable: false,
      languages: repoData.languages.map((lang: string) => ({
        name: lang,
        percentage: Math.round(((repoData.languageBytes?.[lang] ?? 0) / Math.max(1, languageBytes)) * 100),
        files: null,
      })),
      frameworks: repoData.frameworks,
      packageManagers: [repoData.packageManager],
      contributors: repoData.inventory.contributors,
      commits: repoData.recentCommits.length,
      branches: repoData.inventory.branches,
      releases: repoData.inventory.releases,
    },
    security: {
      exposedSecrets: securityFindings.filter(f => f.type === "EXPOSED_SECRETS").length,
      apiKeys: securityFindings.filter(f => f.type === "API_KEYS").length,
      credentialLeaks: securityFindings.filter(f => f.type === "CREDENTIAL_LEAKS").length,
      insecureAuth: securityFindings.filter(f => f.type === "INSECURE_AUTH").length,
      weakCrypto: securityFindings.filter(f => f.type === "WEAK_CRYPTO").length,
      insecureHeaders: securityFindings.filter(f => f.type === "INSECURE_HEADERS").length,
      injectionRisks: securityFindings.filter(f => f.type === "INJECTION_RISKS").length,
      ssrf: securityFindings.filter(f => f.type === "SSRF").length,
      xss: securityFindings.filter(f => f.type === "XSS").length,
      csrf: securityFindings.filter(f => f.type === "CSRF").length,
      commandInjection: securityFindings.filter(f => f.type === "COMMAND_INJECTION").length,
      insecureDeserialization: securityFindings.filter(f => f.type === "INSECURE_DESERIALIZATION").length,
      pathTraversal: securityFindings.filter(f => f.type === "PATH_TRAVERSAL").length,
      privilegeEscalation: securityFindings.filter(f => f.type === "PRIVILEGE_ESCALATION").length,
      dependencyVulnerabilities: 0,
      supplyChainRisks: securityFindings.filter(f => f.type === "SUPPLY_CHAIN_RISKS").length,
      securityScore,
    },
    codeQuality: {
      complexity: null,
      deadCode: null,
      duplicatedCode: null,
      maintainability: null,
      testCoverage: null,
      documentationCoverage: null,
      lintIssues: null,
      performanceBottlenecks: null,
    },
    architecture: {
      framework: repoData.frameworks[0] || "Unknown",
      buildTools: ["npm", repoData.packageManager].filter(Boolean),
      deploymentProvider: "GitHub Actions",
      cloudProvider: "Unknown",
      database: "Unknown",
      orm: "Unknown",
      authentication: "Unknown",
      hostingPlatform: "Unknown",
      cicd: securityFindings.find(f => f.type === "NO_CI_CD") ? "Not configured" : "Configured",
    },
    aiSummary: aiInsights.summary,
    repository: {
      name: repoData.name,
      owner: repoData.owner,
      url: repoData.url,
      description: repoData.description,
      visibility: repoData.visibility,
      license: repoData.license,
      stars: repoData.stars,
      forks: repoData.forks,
      watchers: repoData.watchers,
      openIssues: repoData.openIssues,
      lastUpdated: repoData.pushedAt,
      createdAt: repoData.createdAt,
      recentCommits: repoData.recentCommits.slice(0, 5),
    },
  };
}
