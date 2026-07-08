/**
 * God File Detector
 * Detects files that are too large and do too much
 */

import fs from "fs/promises";
import type { RepositoryContext, Finding } from "../../core/types.js";

export class GodFileDetector {
  private readonly SIZE_THRESHOLD = 500; // lines
  private readonly IMPORT_THRESHOLD = 20; // imports
  private readonly FUNCTION_THRESHOLD = 15; // functions

  async detect(context: RepositoryContext): Promise<Finding[]> {
    const findings: Finding[] = [];

    for (const file of context.files) {
      const godFileResult = await this.analyzeFile(file);

      if (godFileResult.isGodFile) {
        findings.push(this.createFinding(file, godFileResult));
      }
    }

    return findings;
  }

  private async analyzeFile(file: any): Promise<{
    isGodFile: boolean;
    reasons: string[];
  }> {
    try {
      const content = await fs.readFile(file.absolutePath, "utf-8");
      const lines = content.split("\n");

      const reasons: string[] = [];

      // Check file size
      if (lines.length > this.SIZE_THRESHOLD) {
        reasons.push(`File has ${lines.length} lines (threshold: ${this.SIZE_THRESHOLD})`);
      }

      // Check import count
      const importCount = this.countImports(content);
      if (importCount > this.IMPORT_THRESHOLD) {
        reasons.push(`File has ${importCount} imports (threshold: ${this.IMPORT_THRESHOLD})`);
      }

      // Check function count
      const functionCount = this.countFunctions(content, file.language);
      if (functionCount > this.FUNCTION_THRESHOLD) {
        reasons.push(`File has ${functionCount} functions (threshold: ${this.FUNCTION_THRESHOLD})`);
      }

      // Check for multiple responsibilities
      const responsibilities = this.detectResponsibilities(content);
      if (responsibilities.length > 3) {
        reasons.push(`File handles ${responsibilities.length} different responsibilities: ${responsibilities.join(", ")}`);
      }

      return {
        isGodFile: reasons.length >= 2,
        reasons,
      };
    } catch (error) {
      console.warn(`God file analysis failed for ${file.path}:`, error);
      return { isGodFile: false, reasons: [] };
    }
  }

  private countImports(content: string): number {
    const importPatterns = [
      /import\s+.*from/g,
      /require\s*\(/g,
      /from\s+.*import/g,
      /#include/g,
      /use\s+/g,
    ];

    let count = 0;
    for (const pattern of importPatterns) {
      const matches = content.match(pattern);
      if (matches) {
        count += matches.length;
      }
    }

    return count;
  }

  private countFunctions(content: string, language: string): number {
    switch (language) {
      case "typescript":
      case "javascript":
        return (content.match(/(?:function\s+\w+|const\s+\w+\s*=\s*\([^)]*\)\s*=>)/g) || []).length;
      case "python":
        return (content.match(/def\s+\w+/g) || []).length;
      case "go":
        return (content.match(/func\s+\w+/g) || []).length;
      case "rust":
        return (content.match(/fn\s+\w+/g) || []).length;
      case "java":
        return (content.match(/(?:public|private|protected)?\s*(?:static\s+)?\w+\s+\w+\s*\(/g) || []).length;
      default:
        return 0;
    }
  }

  private detectResponsibilities(content: string): string[] {
    const responsibilities: string[] = [];

    // Check for database operations
    if (content.match(/(?:SELECT|INSERT|UPDATE|DELETE|CREATE|DROP)/i)) {
      responsibilities.push("database operations");
    }

    // Check for HTTP operations
    if (content.match(/(?:fetch|axios|http|request|response)/i)) {
      responsibilities.push("HTTP operations");
    }

    // Check for file operations
    if (content.match(/(?:fs\.|readFile|writeFile|open|close)/i)) {
      responsibilities.push("file operations");
    }

    // Check for UI operations
    if (content.match(/(?:render|DOM|element|component)/i)) {
      responsibilities.push("UI operations");
    }

    // Check for validation
    if (content.match(/(?:validate|check|verify|ensure)/i)) {
      responsibilities.push("validation");
    }

    // Check for logging
    if (content.match(/(?:console\.|logger|log)/i)) {
      responsibilities.push("logging");
    }

    return responsibilities;
  }

  private createFinding(file: any, result: any): Finding {
    return {
      id: `god-file-${file.path}`,
      type: "GOD-FILE",
      severity: "high",
      score: 75,
      file: file.path,
      line: 1,
      message: "God file detected - file is too large and handles too many responsibilities",
      description: result.reasons.join("; "),
      suggestion: "Consider splitting this file into smaller, focused modules with single responsibilities",
      category: "architecture",
    };
  }
}
