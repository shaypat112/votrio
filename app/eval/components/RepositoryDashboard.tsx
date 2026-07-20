"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  FileText,
  FolderOpen,
  Code,
  Shield,
  AlertTriangle,
  CheckCircle,
  TrendingUp,
  Users,
  GitBranch,
  Package,
  Server,
  Database,
  Lock,
  Globe,
  Cpu,
  Activity,
  Download,
  Share2,
} from "lucide-react";
import { AIExecutiveSummary } from "./AIExecutiveSummary";

interface RepositoryMetrics {
  totalFiles: number;
  totalFolders: number;
  totalLines: number;
  languages: Array<{ name: string; percentage: number; files: number }>;
  frameworks: string[];
  packageManagers: string[];
  contributors: number;
  commits: number;
  branches: number;
  releases: number;
}

interface SecurityMetrics {
  exposedSecrets: number;
  apiKeys: number;
  credentialLeaks: number;
  insecureAuth: number;
  weakCrypto: number;
  insecureHeaders: number;
  injectionRisks: number;
  ssrf: number;
  xss: number;
  csrf: number;
  commandInjection: number;
  insecureDeserialization: number;
  pathTraversal: number;
  privilegeEscalation: number;
  dependencyVulnerabilities: number;
  supplyChainRisks: number;
  securityScore: number;
}

interface CodeQualityMetrics {
  complexity: number;
  deadCode: number;
  duplicatedCode: number;
  maintainability: number;
  testCoverage: number;
  documentationCoverage: number;
  lintIssues: number;
  performanceBottlenecks: number;
}

interface ArchitectureInfo {
  framework: string;
  buildTools: string[];
  deploymentProvider: string;
  cloudProvider: string;
  database: string;
  orm: string;
  authentication: string;
  hostingPlatform: string;
  cicd: string;
}

interface RepositoryDashboardProps {
  metrics: RepositoryMetrics;
  security: SecurityMetrics;
  codeQuality: CodeQualityMetrics;
  architecture: ArchitectureInfo;
  aiSummary?: string;
}

export function RepositoryDashboard({
  metrics,
  security,
  codeQuality,
  architecture,
  aiSummary,
}: RepositoryDashboardProps) {
  const getSecurityScoreColor = (score: number) => {
    if (score >= 80) return "text-green-500";
    if (score >= 60) return "text-yellow-500";
    return "text-red-500";
  };

  const getSecurityScoreLabel = (score: number) => {
    if (score >= 80) return "Excellent";
    if (score >= 60) return "Good";
    if (score >= 40) return "Fair";
    return "Poor";
  };

  return (
    <div className="space-y-6">
      {/* Repository Overview */}
      <Card className="subtle-border bg-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Repository Overview
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <FileText className="h-4 w-4" />
                Total Files
              </div>
              <p className="text-2xl font-bold">
                {metrics.totalFiles.toLocaleString()}
              </p>
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <FolderOpen className="h-4 w-4" />
                Total Folders
              </div>
              <p className="text-2xl font-bold">
                {metrics.totalFolders.toLocaleString()}
              </p>
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Code className="h-4 w-4" />
                Lines of Code
              </div>
              <p className="text-2xl font-bold">
                {metrics.totalLines > 0 ? metrics.totalLines.toLocaleString() : "—"}
              </p>
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Users className="h-4 w-4" />
                Contributors
              </div>
              <p className="text-2xl font-bold">{metrics.contributors}</p>
            </div>
          </div>

          <div className="mt-6 space-y-3">
            <h4 className="text-sm font-semibold">Languages</h4>
            <div className="flex flex-wrap gap-2">
              {metrics.languages.map((lang) => (
                <Badge key={lang.name} variant="outline" className="text-xs">
                  {lang.name} ({lang.percentage}%)
                </Badge>
              ))}
            </div>
          </div>

          <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <GitBranch className="h-4 w-4" />
                Branches
              </div>
              <p className="text-lg font-semibold">{metrics.branches}</p>
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Activity className="h-4 w-4" />
                Commits
              </div>
              <p className="text-lg font-semibold">
                {metrics.commits.toLocaleString()}
              </p>
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Package className="h-4 w-4" />
                Releases
              </div>
              <p className="text-lg font-semibold">{metrics.releases}</p>
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <TrendingUp className="h-4 w-4" />
                Activity
              </div>
              <p className="text-lg font-semibold">Active</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Architecture Analysis */}
      <Card className="subtle-border bg-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Server className="h-5 w-5" />
            Architecture Analysis
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Framework</p>
              <p className="font-medium">{architecture.framework}</p>
            </div>
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Build Tools</p>
              <div className="flex flex-wrap gap-1">
                {architecture.buildTools.map((tool) => (
                  <Badge key={tool} variant="outline" className="text-xs">
                    {tool}
                  </Badge>
                ))}
              </div>
            </div>
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Deployment</p>
              <p className="font-medium">{architecture.deploymentProvider}</p>
            </div>
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Cloud Provider</p>
              <p className="font-medium">{architecture.cloudProvider}</p>
            </div>
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Database</p>
              <p className="font-medium">{architecture.database}</p>
            </div>
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">ORM</p>
              <p className="font-medium">{architecture.orm}</p>
            </div>
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Authentication</p>
              <p className="font-medium">{architecture.authentication}</p>
            </div>
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Hosting</p>
              <p className="font-medium">{architecture.hostingPlatform}</p>
            </div>
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">CI/CD</p>
              <p className="font-medium">{architecture.cicd}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Security Intelligence */}
      <Card className="subtle-border bg-card">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Security Intelligence
            </CardTitle>
            <div className="flex items-center gap-2">
              <span
                className={`text-3xl font-bold ${getSecurityScoreColor(security.securityScore)}`}
              >
                {security.securityScore}
              </span>
              <span className="text-sm text-muted-foreground">/ 100</span>
              <Badge
                variant="outline"
                className={getSecurityScoreColor(security.securityScore)}
              >
                {getSecurityScoreLabel(security.securityScore)}
              </Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Lock className="h-4 w-4" />
                Exposed Secrets
              </div>
              <p
                className={`text-lg font-semibold ${security.exposedSecrets > 0 ? "text-destructive" : "text-success"}`}
              >
                {security.exposedSecrets}
              </p>
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Globe className="h-4 w-4" />
                API Keys
              </div>
              <p
                className={`text-lg font-semibold ${security.apiKeys > 0 ? "text-destructive" : "text-success"}`}
              >
                {security.apiKeys}
              </p>
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <AlertTriangle className="h-4 w-4" />
                Injection Risks
              </div>
              <p
                className={`text-lg font-semibold ${security.injectionRisks > 0 ? "text-destructive" : "text-success"}`}
              >
                {security.injectionRisks}
              </p>
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Cpu className="h-4 w-4" />
                Dependency Vulns
              </div>
              <p
                className={`text-lg font-semibold ${security.dependencyVulnerabilities > 0 ? "text-destructive" : "text-success"}`}
              >
                {security.dependencyVulnerabilities}
              </p>
            </div>
          </div>

          <div className="mt-6 space-y-3">
            <h4 className="text-sm font-semibold">Security Issues Breakdown</h4>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {security.credentialLeaks > 0 && (
                <div className="flex items-center justify-between p-2 rounded bg-destructive/10 border border-destructive/20">
                  <span className="text-sm">Credential Leaks</span>
                  <Badge variant="outline" className="text-xs">
                    {security.credentialLeaks}
                  </Badge>
                </div>
              )}
              {security.insecureAuth > 0 && (
                <div className="flex items-center justify-between p-2 rounded bg-destructive/10 border border-destructive/20">
                  <span className="text-sm">Insecure Auth</span>
                  <Badge variant="outline" className="text-xs">
                    {security.insecureAuth}
                  </Badge>
                </div>
              )}
              {security.weakCrypto > 0 && (
                <div className="flex items-center justify-between p-2 rounded bg-destructive/10 border border-destructive/20">
                  <span className="text-sm">Weak Crypto</span>
                  <Badge variant="outline" className="text-xs">
                    {security.weakCrypto}
                  </Badge>
                </div>
              )}
              {security.insecureHeaders > 0 && (
                <div className="flex items-center justify-between p-2 rounded bg-destructive/10 border border-destructive/20">
                  <span className="text-sm">Insecure Headers</span>
                  <Badge variant="outline" className="text-xs">
                    {security.insecureHeaders}
                  </Badge>
                </div>
              )}
              {security.ssrf > 0 && (
                <div className="flex items-center justify-between p-2 rounded bg-destructive/10 border border-destructive/20">
                  <span className="text-sm">SSRF</span>
                  <Badge variant="outline" className="text-xs">
                    {security.ssrf}
                  </Badge>
                </div>
              )}
              {security.xss > 0 && (
                <div className="flex items-center justify-between p-2 rounded bg-destructive/10 border border-destructive/20">
                  <span className="text-sm">XSS</span>
                  <Badge variant="outline" className="text-xs">
                    {security.xss}
                  </Badge>
                </div>
              )}
              {security.csrf > 0 && (
                <div className="flex items-center justify-between p-2 rounded bg-destructive/10 border border-destructive/20">
                  <span className="text-sm">CSRF</span>
                  <Badge variant="outline" className="text-xs">
                    {security.csrf}
                  </Badge>
                </div>
              )}
              {security.commandInjection > 0 && (
                <div className="flex items-center justify-between p-2 rounded bg-destructive/10 border border-destructive/20">
                  <span className="text-sm">Command Injection</span>
                  <Badge variant="outline" className="text-xs">
                    {security.commandInjection}
                  </Badge>
                </div>
              )}
              {security.insecureDeserialization > 0 && (
                <div className="flex items-center justify-between p-2 rounded bg-destructive/10 border border-destructive/20">
                  <span className="text-sm">Insecure Deserialization</span>
                  <Badge variant="outline" className="text-xs">
                    {security.insecureDeserialization}
                  </Badge>
                </div>
              )}
              {security.pathTraversal > 0 && (
                <div className="flex items-center justify-between p-2 rounded bg-destructive/10 border border-destructive/20">
                  <span className="text-sm">Path Traversal</span>
                  <Badge variant="outline" className="text-xs">
                    {security.pathTraversal}
                  </Badge>
                </div>
              )}
              {security.privilegeEscalation > 0 && (
                <div className="flex items-center justify-between p-2 rounded bg-destructive/10 border border-destructive/20">
                  <span className="text-sm">Privilege Escalation</span>
                  <Badge variant="outline" className="text-xs">
                    {security.privilegeEscalation}
                  </Badge>
                </div>
              )}
              {security.supplyChainRisks > 0 && (
                <div className="flex items-center justify-between p-2 rounded bg-destructive/10 border border-destructive/20">
                  <span className="text-sm">Supply Chain Risks</span>
                  <Badge variant="outline" className="text-xs">
                    {security.supplyChainRisks}
                  </Badge>
                </div>
              )}
            </div>
            {security.credentialLeaks === 0 &&
              security.insecureAuth === 0 &&
              security.weakCrypto === 0 &&
              security.insecureHeaders === 0 &&
              security.ssrf === 0 &&
              security.xss === 0 &&
              security.csrf === 0 &&
              security.commandInjection === 0 &&
              security.insecureDeserialization === 0 &&
              security.pathTraversal === 0 &&
              security.privilegeEscalation === 0 &&
              security.supplyChainRisks === 0 && (
                <div className="flex items-center gap-2 p-3 rounded bg-success/10 border border-success/20">
                  <CheckCircle className="h-5 w-5 text-success" />
                  <span className="text-sm font-medium text-success">
                    No critical security issues found
                  </span>
                </div>
              )}
          </div>
        </CardContent>
      </Card>

      {/* Code Quality Metrics */}
      <Card className="subtle-border bg-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Code className="h-5 w-5" />
            Code Quality Metrics
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Complexity</p>
              <p className="text-lg font-semibold">{codeQuality.complexity}</p>
            </div>
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Dead Code</p>
              <p className="text-lg font-semibold">{codeQuality.deadCode}</p>
            </div>
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Duplicated Code</p>
              <p className="text-lg font-semibold">
                {codeQuality.duplicatedCode}%
              </p>
            </div>
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Maintainability</p>
              <p className="text-lg font-semibold">
                {codeQuality.maintainability}/100
              </p>
            </div>
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Test Coverage</p>
              <p className="text-lg font-semibold">
                {codeQuality.testCoverage}%
              </p>
            </div>
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Documentation</p>
              <p className="text-lg font-semibold">
                {codeQuality.documentationCoverage}%
              </p>
            </div>
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Lint Issues</p>
              <p className="text-lg font-semibold">{codeQuality.lintIssues}</p>
            </div>
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">
                Performance Issues
              </p>
              <p className="text-lg font-semibold">
                {codeQuality.performanceBottlenecks}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* AI Executive Summary */}
      <AIExecutiveSummary
        security={security}
        codeQuality={codeQuality}
        metrics={metrics}
        aiSummary={aiSummary}
      />
    </div>
  );
}
