/**
 * Code Smell Analyzer
 * Detects common code smells and anti-patterns
 */

import fs from "fs/promises";
import type { RepositoryContext, Finding } from "../../core/types.js";

export class CodeSmellAnalyzer {
  async analyze(context: RepositoryContext): Promise<Finding[]> {
    const findings: Finding[] = [];

    for (const file of context.files) {
      const codeSmells = await this.analyzeFile(file);
      findings.push(...codeSmells);
    }

    return findings;
  }

  private async analyzeFile(file: any): Promise<Finding[]> {
    const findings: Finding[] = [];

    try {
      const content = await fs.readFile(file.absolutePath, "utf-8");

      // Check for dead code (commented out code)
      const commentedCode = this.findCommentedCode(content);
      if (commentedCode.length > 5) {
        findings.push({
          id: `dead-code-${file.path}`,
          type: "DEAD-CODE",
          severity: "low",
          score: 20,
          file: file.path,
          line: 1,
          message: "Potential dead code detected",
          description: `Found ${commentedCode.length} blocks of commented code`,
          suggestion: "Remove commented code or use version control instead",
          category: "maintainability",
        });
      }

      // Check for TODO comments
      const todos = content.match(/TODO:/gi);
      if (todos && todos.length > 3) {
        findings.push({
          id: `todo-comments-${file.path}`,
          type: "TODO-COMMENTS",
          severity: "low",
          score: 15,
          file: file.path,
          line: 1,
          message: "Multiple TODO comments detected",
          description: `Found ${todos.length} TODO comments`,
          suggestion: "Address TODOs or convert to proper issue tracking",
          category: "maintainability",
        });
      }

      // Check for magic numbers
      const magicNumbers = this.findMagicNumbers(content);
      if (magicNumbers.length > 5) {
        findings.push({
          id: `magic-numbers-${file.path}`,
          type: "MAGIC-NUMBERS",
          severity: "low",
          score: 25,
          file: file.path,
          line: 1,
          message: "Magic numbers detected",
          description: `Found ${magicNumbers.length} unexplained numeric literals`,
          suggestion: "Replace magic numbers with named constants",
          category: "maintainability",
        });
      }

      // Check for empty catch blocks
      const emptyCatch = content.match(/catch\s*\([^)]*\)\s*\{\s*\}/g);
      if (emptyCatch && emptyCatch.length > 0) {
        findings.push({
          id: `empty-catch-${file.path}`,
          type: "EMPTY-CATCH-BLOCK",
          severity: "medium",
          score: 45,
          file: file.path,
          line: 1,
          message: "Empty catch block detected",
          description: "Catch blocks without error handling can hide bugs",
          suggestion: "Add proper error handling or logging in catch blocks",
          category: "maintainability",
        });
      }

      // Check for console.log in production code
      const consoleLogs = content.match(/console\.log/g);
      if (consoleLogs && consoleLogs.length > 2) {
        findings.push({
          id: `console-logs-${file.path}`,
          type: "CONSOLE-LOGS",
          severity: "low",
          score: 20,
          file: file.path,
          line: 1,
          message: "Console.log statements detected",
          description: `Found ${consoleLogs.length} console.log statements`,
          suggestion: "Remove debug console.log statements or use proper logging",
          category: "maintainability",
        });
      }

      // Check for any type usage
      const anyTypes = content.match(/:\s*any/g);
      if (anyTypes && anyTypes.length > 3) {
        findings.push({
          id: `any-types-${file.path}`,
          type: "ANY-TYPE-USAGE",
          severity: "low",
          score: 25,
          file: file.path,
          line: 1,
          message: "Excessive 'any' type usage detected",
          description: `Found ${anyTypes.length} instances of 'any' type`,
          suggestion: "Use specific types instead of 'any' for better type safety",
          category: "maintainability",
        });
      }

      // Check for boolean parameters
      const booleanParams = content.match(/:\s*boolean/g);
      if (booleanParams && booleanParams.length > 2) {
        findings.push({
          id: `boolean-params-${file.path}`,
          type: "BOOLEAN-PARAMETERS",
          severity: "low",
          score: 20,
          file: file.path,
          line: 1,
          message: "Boolean parameters detected",
          description: `Found ${booleanParams.length} boolean parameters`,
          suggestion: "Consider using enums or option objects for better readability",
          category: "maintainability",
        });
      }

      // Check for primitive obsession
      const primitiveReturns = content.match(/=>\s*(?:string|number|boolean)/g);
      if (primitiveReturns && primitiveReturns.length > 5) {
        findings.push({
          id: `primitive-obsession-${file.path}`,
          type: "PRIMITIVE-OBSSESSION",
          severity: "low",
          score: 25,
          file: file.path,
          line: 1,
          message: "Primitive obsession detected",
          description: "Functions frequently return primitive types",
          suggestion: "Consider using value objects or domain types",
          category: "maintainability",
        });
      }

    } catch (error) {
      console.warn(`Code smell analysis failed for ${file.path}:`, error);
    }

    return findings;
  }

  private findCommentedCode(content: string): string[] {
    const commentedBlocks: string[] = [];
    const lines = content.split("\n");
    let inCommentBlock = false;
    let currentBlock: string[] = [];

    for (const line of lines) {
      const trimmed = line.trim();

      if (trimmed.startsWith("/*") || trimmed.startsWith("//")) {
        inCommentBlock = true;
        currentBlock.push(trimmed);
      } else if (inCommentBlock && (trimmed.includes("*/") || !trimmed.startsWith("//"))) {
        if (currentBlock.length > 2) {
          commentedBlocks.push(currentBlock.join("\n"));
        }
        currentBlock = [];
        inCommentBlock = false;
      } else if (inCommentBlock) {
        currentBlock.push(trimmed);
      }
    }

    return commentedBlocks;
  }

  private findMagicNumbers(content: string): number[] {
    const magicNumbers: number[] = [];
    const numberPattern = /(?<![a-zA-Z0-9_])(\d{2,})(?![a-zA-Z0-9_])/g;
    let match;

    while ((match = numberPattern.exec(content)) !== null) {
      const num = parseInt(match[1]);
      // Skip common numbers that aren't magic
      if (
        num !== 0 &&
        num !== 1 &&
        num !== 10 &&
        num !== 100 &&
        num !== 1000 &&
        !this.isCommonConstant(num)
      ) {
        magicNumbers.push(num);
      }
    }

    return magicNumbers;
  }

  private isCommonConstant(num: number): boolean {
    const commonConstants = [
      24, // hours in day
      60, // minutes in hour
      365, // days in year
      1024, // bytes in KB
      2048, // common memory size
      4096, // common memory size
      8192, // common memory size
    ];

    return commonConstants.includes(num);
  }
}
