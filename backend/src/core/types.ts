/**
 * Core types for Votrio-Scan
 * Shared interfaces across all analysis modules
 */

export type Language =
  | "typescript"
  | "javascript"
  | "python"
  | "java"
  | "go"
  | "rust"
  | "csharp"
  | "php"
  | "unknown";

export type Severity = "low" | "medium" | "high" | "critical";

export type ReportFormat = "json" | "markdown" | "html" | "sarif";

export interface ScanOptions {
  path: string;
  format: ReportFormat;
  ignore: string[];
  enableAI: boolean;
  aiModel?: string;
  failOn: Severity;
  ci: boolean;
  verbose: boolean;
}

export interface FileInfo {
  path: string;
  absolutePath: string;
  size: number;
  language: Language;
  lines: number;
  lastModified: Date;
}

export interface Dependency {
  from: string;
  to: string;
  type: "import" | "require" | "include" | "extends" | "implements";
}

export interface DependencyGraph {
  nodes: string[]; // file paths
  edges: Dependency[];
}

export interface RepositoryContext {
  root: string;
  files: FileInfo[];
  dependencyGraph: DependencyGraph;
  languages: Language[];
  totalLines: number;
  isMonorepo: boolean;
}

export interface Finding {
  id: string;
  type: string;
  severity: Severity;
  score: number;
  file: string;
  line: number;
  column?: number;
  message: string;
  description?: string;
  suggestion?: string;
  code?: string;
  category: "ai-detection" | "architecture" | "scalability" | "security" | "maintainability";
}

export interface AnalysisResult {
  category: string;
  score: number;
  findings: Finding[];
  summary: string;
  metrics?: Record<string, number>;
}

export interface AIDetectionResult extends AnalysisResult {
  category: "ai-detection";
  metrics: {
    aiLikelihoodScore: number;
    confidence: number;
    suspiciousFiles: number;
    totalFilesAnalyzed: number;
  };
}

export interface ArchitectureResult extends AnalysisResult {
  category: "architecture";
  metrics: {
    architecturalRiskScore: number;
    godFiles: number;
    circularDependencies: number;
    couplingScore: number;
    abstractionLayers: number;
  };
}

export interface ScalabilityResult extends AnalysisResult {
  category: "scalability";
  metrics: {
    scalabilityRiskScore: number;
    globalStateIssues: number;
    databasePatternIssues: number;
    performanceAntiPatterns: number;
    memoryHeavyOperations: number;
  };
}

export interface SecurityResult extends AnalysisResult {
  category: "security";
  metrics: {
    securityRiskScore: number;
    secretsFound: number;
    injectionRisks: number;
    authIssues: number;
    cryptoIssues: number;
  };
}

export interface MaintainabilityResult extends AnalysisResult {
  category: "maintainability";
  metrics: {
    maintainabilityScore: number;
    complexityScore: number;
    duplicationScore: number;
    codeSmells: number;
  };
}

export interface ScanReport {
  repository: {
    name: string;
    path: string;
    languages: Language[];
    totalFiles: number;
    totalLines: number;
    scannedAt: string;
  };
  scores: {
    overall: number;
    aiLikelihood: number;
    architecturalRisk: number;
    scalabilityRisk: number;
    securityRisk: number;
    maintainability: number;
  };
  analyses: {
    aiDetection: AIDetectionResult;
    architecture: ArchitectureResult;
    scalability: ScalabilityResult;
    security: SecurityResult;
    maintainability: MaintainabilityResult;
  };
  explanations: {
    summary: string;
    riskExplanation: string;
    architectureExplanation: string;
    scalabilityExplanation: string;
    securityExplanation: string;
    maintainabilityExplanation: string;
    recommendedFixes: string[];
  };
  findings: Finding[];
}

export interface AnalyzerConfig {
  enabled: boolean;
  severityThreshold: Severity;
  customRules?: Record<string, unknown>;
}

export interface LLMProvider {
  name: string;
  apiKey?: string;
  model?: string;
  endpoint?: string;
}

export interface LLMResponse {
  content: string;
  model: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

export interface AnalyzerInterface {
  name: string;
  version: string;
  analyze(context: RepositoryContext, config: AnalyzerConfig): Promise<AnalysisResult>;
  isAvailable(): boolean;
}

export interface ScannerConfig {
  analyzers: {
    aiDetection: AnalyzerConfig;
    architecture: AnalyzerConfig;
    scalability: AnalyzerConfig;
    security: AnalyzerConfig;
    maintainability: AnalyzerConfig;
  };
  llm: {
    provider: LLMProvider;
    enableExplanation: boolean;
  };
  output: {
    format: ReportFormat;
    includeCodeSnippets: boolean;
    maxFindings: number;
  };
}
