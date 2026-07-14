import { NextResponse } from "next/server";
import { exec } from "child_process";
import { promisify } from "util";
import path from "path";
import fs from "fs/promises";

const execAsync = promisify(exec);

export const runtime = "nodejs";

interface CodeReviewRequest {
  code: string;
  filePath: string;
  language?: string;
  model?: string;
}

interface CodeReviewResponse {
  review: string;
  suggestions: Array<{
    line: number;
    severity: "low" | "medium" | "high" | "critical";
    message: string;
    suggestion: string;
  }>;
  metrics: {
    complexity: number;
    maintainability: number;
    securityScore: number;
  };
}

export async function POST(request: Request) {
  try {
    const { code, filePath, language, model }: CodeReviewRequest = await request.json();

    if (!code) {
      return NextResponse.json({ error: "Missing code to review" }, { status: 400 });
    }

    console.log(`🔍 Starting AI code review for ${filePath || 'unknown file'}`);
    console.log(`📊 Language: ${language || 'auto-detected'}`);
    console.log(`📏 Code length: ${code.length} characters`);

    // Create temporary file for analysis
    const tempDir = path.join(process.cwd(), 'tmp', 'code-review');
    await fs.mkdir(tempDir, { recursive: true });
    
    const timestamp = Date.now();
    const tempFile = path.join(tempDir, `review-${timestamp}.${language || 'txt'}`);
    await fs.writeFile(tempFile, code, 'utf-8');

    try {
      // Run Python AI service
      const pythonScript = path.join(process.cwd(), 'backend', 'ai_service.py');
      
      console.log(`🐍 Running Python AI service: ${pythonScript}`);
      
      const { stdout, stderr } = await execAsync(
        `python3 "${pythonScript}" "${tempDir}"`,
        {
          timeout: 30000, // 30 second timeout
          maxBuffer: 10 * 1024 * 1024, // 10MB buffer
        }
      );

      if (stderr) {
        console.error(`⚠️  Python service stderr: ${stderr}`);
      }

      console.log(`✅ Python service completed successfully`);
      
      // Parse the output
      let analysisResult;
      try {
        analysisResult = JSON.parse(stdout);
      } catch (parseError) {
        console.error(`❌ Failed to parse Python output: ${parseError}`);
        throw new Error("Invalid analysis result from AI service");
      }

      // Generate review from analysis
      const review = generateCodeReview(analysisResult, code, filePath);
      
      console.log(`📝 Review generated with ${review.suggestions.length} suggestions`);
      console.log(`📊 Overall scores - Complexity: ${review.metrics.complexity}, Maintainability: ${review.metrics.maintainability}, Security: ${review.metrics.securityScore}`);

      return NextResponse.json(review);

    } finally {
      // Cleanup temp file
      try {
        await fs.unlink(tempFile);
        console.log(`🧹 Cleaned up temporary file: ${tempFile}`);
      } catch (cleanupError) {
        console.error(`⚠️  Failed to cleanup temp file: ${cleanupError}`);
      }
    }

  } catch (error) {
    console.error("❌ Code review error:", error);
    
    // Provide detailed error information
    const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
    const errorStack = error instanceof Error ? error.stack : undefined;
    
    console.error(`Error details: ${errorMessage}`);
    if (errorStack) {
      console.error(`Stack trace: ${errorStack}`);
    }
    
    return NextResponse.json(
      { 
        error: "Code review failed", 
        details: errorMessage,
        suggestion: "Ensure Python 3 and required dependencies (scikit-learn, numpy) are installed"
      }, 
      { status: 500 }
    );
  }
}

function generateCodeReview(analysis: any, code: string, filePath: string): CodeReviewResponse {
  // Generate AI-powered review based on the Python analysis
  const suggestions: CodeReviewResponse["suggestions"] = [];
  
  // Extract vulnerabilities from analysis
  if (analysis.metrics?.vulnerabilityBreakdown) {
    const breakdown = analysis.metrics.vulnerabilityBreakdown;
    
    if (breakdown.critical > 0) {
      suggestions.push({
        line: 0,
        severity: "critical",
        message: `${breakdown.critical} critical security vulnerabilities detected`,
        suggestion: "Immediately address all critical security issues before deployment"
      });
    }
    
    if (breakdown.high > 0) {
      suggestions.push({
        line: 0,
        severity: "high",
        message: `${breakdown.high} high-severity issues found`,
        suggestion: "Review and fix high-severity issues to improve code quality"
      });
    }
  }

  // Technical debt suggestions
  if (analysis.technicalDebt?.areas) {
    analysis.technicalDebt.areas.forEach((area: string, index: number) => {
      suggestions.push({
        line: 0,
        severity: analysis.technicalDebt.level === "high" ? "high" : "medium",
        message: `Technical debt: ${area}`,
        suggestion: "Consider refactoring to reduce technical debt"
      });
    });
  }

  // Architecture suggestions
  if (analysis.architecture?.description) {
    suggestions.push({
      line: 0,
      severity: "low",
      message: `Architecture: ${analysis.architecture.description}`,
      suggestion: "Review architecture patterns for consistency"
    });
  }

  // Calculate metrics
  const complexity = analysis.metrics?.averageComplexity || 0;
  const maintainability = 100 - Math.min(complexity * 5, 100);
  const securityScore = analysis.securityPosture?.score || 50;

  // Generate comprehensive review text
  const reviewText = generateReviewText(analysis, filePath);

  return {
    review: reviewText,
    suggestions,
    metrics: {
      complexity: Math.round(complexity * 10) / 10,
      maintainability: Math.round(maintainability),
      securityScore: Math.round(securityScore)
    }
  };
}

function generateReviewText(analysis: any, filePath: string): string {
  const parts: string[] = [];
  
  parts.push(`# Code Review for ${filePath || 'Untitled'}`);
  parts.push("");
  
  // Security posture
  if (analysis.securityPosture) {
    parts.push("## Security Assessment");
    parts.push(`**Score:** ${analysis.securityPosture.score}/100`);
    parts.push(`**Summary:** ${analysis.securityPosture.summary}`);
    parts.push("");
  }
  
  // Architecture
  if (analysis.architecture) {
    parts.push("## Architecture Analysis");
    parts.push(`**Type:** ${analysis.architecture.type}`);
    parts.push(`**Description:** ${analysis.architecture.description}`);
    parts.push("");
  }
  
  // Technical debt
  if (analysis.technicalDebt) {
    parts.push("## Technical Debt");
    parts.push(`**Level:** ${analysis.technicalDebt.level.toUpperCase()}`);
    if (analysis.technicalDebt.areas.length > 0) {
      parts.push("**Areas of concern:**");
      analysis.technicalDebt.areas.forEach((area: string) => {
        parts.push(`- ${area}`);
      });
    }
    parts.push("");
  }
  
  // Technologies detected
  if (analysis.frameworks?.length > 0) {
    parts.push("## Technologies Detected");
    parts.push(`**Frameworks:** ${analysis.frameworks.join(", ")}`);
    parts.push(`**Languages:** ${analysis.languages.join(", ")}`);
    if (analysis.databases?.length > 0) {
      parts.push(`**Databases:** ${analysis.databases.join(", ")}`);
    }
    parts.push("");
  }
  
  // Overall metrics
  if (analysis.metrics) {
    parts.push("## Code Metrics");
    parts.push(`**Total Files:** ${analysis.metrics.totalFiles}`);
    parts.push(`**Lines of Code:** ${analysis.metrics.totalLinesOfCode}`);
    parts.push(`**Average Complexity:** ${analysis.metrics.averageComplexity.toFixed(2)}`);
    parts.push(`**Comment Ratio:** ${(analysis.metrics.averageCommentRatio * 100).toFixed(1)}%`);
    parts.push("");
  }
  
  // Recommendations
  parts.push("## Recommendations");
  if (analysis.technicalDebt?.level === "high") {
    parts.push("- ⚠️ High technical debt detected - consider refactoring");
  }
  if (analysis.securityPosture?.score < 70) {
    parts.push("- 🔒 Security score below 70% - address vulnerabilities");
  }
  if (analysis.metrics?.averageCommentRatio < 0.2) {
    parts.push("- 📝 Low documentation - add more comments");
  }
  if (analysis.metrics?.averageComplexity > 5) {
    parts.push("- 🔧 High complexity - consider simplifying code");
  }
  
  return parts.join("\n");
}
