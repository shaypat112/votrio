"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Cpu, Shield, Code, BarChart3 } from "lucide-react";
import {
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  PieChart,
  Pie,
  Cell,
} from "recharts";

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

interface AIExecutiveSummaryProps {
  security: SecurityMetrics;
  codeQuality: CodeQualityMetrics;
  metrics: RepositoryMetrics;
  aiSummary?: string;
}

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

export function AIExecutiveSummary({
  security,
  codeQuality,
  metrics,
  aiSummary,
}: AIExecutiveSummaryProps) {
  // Prepare data for Security Radar Chart
  const securityRadarData = [
    { subject: 'Secrets', value: Math.min(security.exposedSecrets * 10, 100) },
    { subject: 'API Keys', value: Math.min(security.apiKeys * 10, 100) },
    { subject: 'Injection', value: Math.min(security.injectionRisks * 10, 100) },
    { subject: 'XSS', value: Math.min(security.xss * 10, 100) },
    { subject: 'CSRF', value: Math.min(security.csrf * 10, 100) },
    { subject: 'SSRF', value: Math.min(security.ssrf * 10, 100) },
  ];

  // Prepare data for Code Quality Bar Chart
  const codeQualityData = [
    { name: 'Complexity', value: codeQuality.complexity, max: 100 },
    { name: 'Maintainability', value: codeQuality.maintainability, max: 100 },
    { name: 'Test Coverage', value: codeQuality.testCoverage, max: 100 },
    { name: 'Documentation', value: codeQuality.documentationCoverage, max: 100 },
    { name: 'Duplicated Code', value: codeQuality.duplicatedCode, max: 100 },
  ];

  // Prepare data for Language Distribution Pie Chart
  const languageData = metrics.languages.map((lang, index) => ({
    name: lang.name,
    value: lang.percentage,
    files: lang.files,
  }));

  // Calculate overall health score
  const healthScore = Math.round(
    (security.securityScore * 0.4 + 
     codeQuality.maintainability * 0.3 + 
     codeQuality.testCoverage * 0.2 + 
     codeQuality.documentationCoverage * 0.1)
  );

  const getHealthScoreColor = (score: number) => {
    if (score >= 80) return '#10b981';
    if (score >= 60) return '#f59e0b';
    return '#ef4444';
  };

  const getHealthScoreLabel = (score: number) => {
    if (score >= 80) return 'Excellent';
    if (score >= 60) return 'Good';
    if (score >= 40) return 'Fair';
    return 'Poor';
  };

  return (
    <div className="space-y-6">
      {/* Overall Health Score */}
      <Card className="subtle-border bg-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            AI Executive Summary
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-6 mb-6">
            <div className="text-center">
              <div
                className="text-5xl font-bold"
                style={{ color: getHealthScoreColor(healthScore) }}
              >
                {healthScore}
              </div>
              <div className="text-sm text-muted-foreground mt-1">Health Score</div>
              <Badge
                variant="outline"
                className="mt-2"
                style={{ 
                  borderColor: getHealthScoreColor(healthScore),
                  color: getHealthScoreColor(healthScore)
                }}
              >
                {getHealthScoreLabel(healthScore)}
              </Badge>
            </div>
            <div className="flex-1">
              <p className="text-sm leading-relaxed text-muted-foreground">
                {aiSummary || "AI analysis in progress..."}
              </p>
            </div>
          </div>

          {/* Charts Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Security Radar Chart */}
            <div className="space-y-3">
              <h4 className="text-sm font-semibold flex items-center gap-2">
                <Shield className="h-4 w-4" />
                Security Posture
              </h4>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <RadarChart data={securityRadarData}>
                    <PolarGrid />
                    <PolarAngleAxis dataKey="subject" className="text-xs" />
                    <PolarRadiusAxis angle={90} domain={[0, 100]} className="text-xs" />
                    <Radar
                      name="Security Issues"
                      dataKey="value"
                      stroke="#ef4444"
                      fill="#ef4444"
                      fillOpacity={0.3}
                    />
                  </RadarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Code Quality Bar Chart */}
            <div className="space-y-3">
              <h4 className="text-sm font-semibold flex items-center gap-2">
                <Code className="h-4 w-4" />
                Code Quality Metrics
              </h4>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={codeQualityData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" className="text-xs" />
                    <YAxis className="text-xs" />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="value" fill="#3b82f6" name="Score" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Language Distribution Pie Chart */}
            <div className="space-y-3">
              <h4 className="text-sm font-semibold flex items-center gap-2">
                <Cpu className="h-4 w-4" />
                Language Distribution
              </h4>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={languageData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, value }) => `${name} ${value}%`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {languageData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Key Metrics Summary */}
            <div className="space-y-3">
              <h4 className="text-sm font-semibold">Key Metrics</h4>
              <div className="grid grid-cols-2 gap-4">
                <div className="p-3 rounded-lg bg-muted/50">
                  <div className="text-2xl font-bold">{metrics.totalFiles.toLocaleString()}</div>
                  <div className="text-xs text-muted-foreground">Total Files</div>
                </div>
                <div className="p-3 rounded-lg bg-muted/50">
                  <div className="text-2xl font-bold">{metrics.totalLines.toLocaleString()}</div>
                  <div className="text-xs text-muted-foreground">Lines of Code</div>
                </div>
                <div className="p-3 rounded-lg bg-muted/50">
                  <div className="text-2xl font-bold">{security.securityScore}</div>
                  <div className="text-xs text-muted-foreground">Security Score</div>
                </div>
                <div className="p-3 rounded-lg bg-muted/50">
                  <div className="text-2xl font-bold">{codeQuality.testCoverage}%</div>
                  <div className="text-xs text-muted-foreground">Test Coverage</div>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}