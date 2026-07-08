/**
 * Complexity Analyzer
 * Analyzes code complexity metrics
 */

import fs from "fs/promises";
import type { RepositoryContext, Finding } from "../../core/types.js";

export class ComplexityAnalyzer {
  private readonly COMPLEXITY_THRESHOLD = 10;
  private readonly NESTING_THRESHOLD = 4;

  async analyze(context: RepositoryContext): Promise<Finding[]> {
    const findings: Finding[] = [];

    for (const file of context.files) {
      const complexityIssues = await this.analyzeFile(file);
      findings.push(...complexityIssues);
    }

    return findings;
  }

  private async analyzeFile(file: any): Promise<Finding[]> {
    const findings: Finding[] = [];

    try {
      const content = await fs.readFile(file.absolutePath, "utf-8");
      const lines = content.split("\n");

      // Calculate cyclomatic complexity (simplified)
      const complexity = this.calculateCyclomaticComplexity(content);

      if (complexity > this.COMPLEXITY_THRESHOLD) {
        findings.push({
          id: `high-complexity-${file.path}`,
          type: "HIGH-CYCLOMATIC-COMPLEXITY",
          severity: "medium",
          score: 50,
          file: file.path,
          line: 1,
          message: "High cyclomatic complexity detected",
          description: `File has complexity score of ${complexity} (threshold: ${this.COMPLEXITY_THRESHOLD})`,
          suggestion: "Consider breaking down complex functions into smaller, more focused functions",
          category: "maintainability",
        });
      }

      // Check for deep nesting
      const maxNesting = this.calculateMaxNesting(content);

      if (maxNesting > this.NESTING_THRESHOLD) {
        findings.push({
          id: `deep-nesting-${file.path}`,
          type: "DEEP-NESTING",
          severity: "medium",
          score: 45,
          file: file.path,
          line: 1,
          message: "Deep nesting detected",
          description: `Maximum nesting level of ${maxNesting} (threshold: ${this.NESTING_THRESHOLD})`,
          suggestion: "Consider using early returns, guard clauses, or extracting functions to reduce nesting",
          category: "maintainability",
        });
      }

      // Check for long functions
      const longFunctions = this.findLongFunctions(content, file.language);

      for (const func of longFunctions) {
        findings.push({
          id: `long-function-${file.path}-${func.line}`,
          type: "LONG-FUNCTION",
          severity: "low",
          score: 30,
          file: file.path,
          line: func.line,
          message: "Long function detected",
          description: `Function has ${func.lines} lines (threshold: 50)`,
          suggestion: "Consider breaking down long functions into smaller, more focused functions",
          category: "maintainability",
        });
      }

      // Check for long parameter lists
      const longParamLists = this.findLongParameterLists(content, file.language);

      for (const paramList of longParamLists) {
        findings.push({
          id: `long-params-${file.path}-${paramList.line}`,
          type: "LONG-PARAMETER-LIST",
          severity: "low",
          score: 25,
          file: file.path,
          line: paramList.line,
          message: "Long parameter list detected",
          description: `Function has ${paramList.count} parameters (threshold: 5)`,
          suggestion: "Consider using parameter objects or splitting the function",
          category: "maintainability",
        });
      }

    } catch (error) {
      console.warn(`Complexity analysis failed for ${file.path}:`, error);
    }

    return findings;
  }

  private calculateCyclomaticComplexity(content: string): number {
    // Simplified cyclomatic complexity calculation
    const decisionPoints = content.match(/(?:if|else|for|while|case|catch|&&|\|\|)/g);
    return (decisionPoints?.length || 0) + 1;
  }

  private calculateMaxNesting(content: string): number {
    const lines = content.split("\n");
    let maxNesting = 0;
    let currentNesting = 0;

    for (const line of lines) {
      const trimmed = line.trim();

      // Count opening braces/keywords that increase nesting
      const openMatches = trimmed.match(/(?:\{|\bif\b|\bfor\b|\bwhile\b|\btry\b)/g);
      if (openMatches) {
        currentNesting += openMatches.length;
        maxNesting = Math.max(maxNesting, currentNesting);
      }

      // Count closing braces that decrease nesting
      const closeMatches = trimmed.match(/\}/g);
      if (closeMatches) {
        currentNesting -= closeMatches.length;
      }
    }

    return maxNesting;
  }

  private findLongFunctions(content: string, language: string): Array<{ line: number; lines: number }> {
    const longFunctions: Array<{ line: number; lines: number }> = [];
    const lines = content.split("\n");
    const threshold = 50;

    // Simplified function detection
    const functionPattern = this.getFunctionPattern(language);
    let match;

    while ((match = functionPattern.exec(content)) !== null) {
      const startLine = content.slice(0, match.index).split("\n").length;

      // Find function end (simplified)
      const remainingContent = content.slice(match.index);
      const braceCount = (remainingContent.match(/\{/g) || []).length;
      const closeBraceIndex = this.findMatchingBrace(remainingContent);

      if (closeBraceIndex !== -1) {
        const functionContent = remainingContent.slice(0, closeBraceIndex);
        const functionLines = functionContent.split("\n").length;

        if (functionLines > threshold) {
          longFunctions.push({ line: startLine, lines: functionLines });
        }
      }
    }

    return longFunctions;
  }

  private findLongParameterLists(content: string, language: string): Array<{ line: number; count: number }> {
    const longParamLists: Array<{ line: number; count: number }> = [];
    const threshold = 5;

    const paramPattern = this.getParameterPattern(language);
    let match;

    while ((match = paramPattern.exec(content)) !== null) {
      const line = content.slice(0, match.index).split("\n").length;
      const params = match[1];
      const paramCount = params.split(",").filter(p => p.trim()).length;

      if (paramCount > threshold) {
        longParamLists.push({ line, count: paramCount });
      }
    }

    return longParamLists;
  }

  private getFunctionPattern(language: string): RegExp {
    switch (language) {
      case "typescript":
      case "javascript":
        return /(?:function\s+\w+|const\s+\w+\s*=\s*(?:async\s+)?\([^)]*\)\s*=>|export\s+(?:const|function)\s+\w+)/g;
      case "python":
        return /def\s+\w+\s*\(/g;
      case "go":
        return /func\s+\w+\s*\(/g;
      case "rust":
        return /fn\s+\w+\s*\(/g;
      default:
        return /function\s+\w+/g;
    }
  }

  private getParameterPattern(language: string): RegExp {
    switch (language) {
      case "typescript":
      case "javascript":
        return /(?:function|const)\s+\w+\s*\(([^)]*)\)/g;
      case "python":
        return /def\s+\w+\s*\(([^)]*)\)/g;
      case "go":
        return /func\s+\w+\s*\(([^)]*)\)/g;
      case "rust":
        return /fn\s+\w+\s*\(([^)]*)\)/g;
      default:
        return /function\s+\w+\s*\(([^)]*)\)/g;
    }
  }

  private findMatchingBrace(content: string): number {
    let braceCount = 0;
    for (let i = 0; i < content.length; i++) {
      if (content[i] === "{") braceCount++;
      if (content[i] === "}") {
        braceCount--;
        if (braceCount === 0) return i;
      }
    }
    return -1;
  }
}
