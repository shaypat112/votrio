/**
 * AST Analyzer
 * Analyzes AST structure for AI-generated code patterns
 */

import fs from "fs/promises";
import type { FileInfo, Language } from "../../core/types.js";

export class ASTAnalyzer {
  async analyze(file: FileInfo): Promise<number> {
    switch (file.language) {
      case "typescript":
      case "javascript":
        return this.analyzeJavaScript(file);
      case "python":
        return this.analyzePython(file);
      default:
        return this.analyzeGeneric(file);
    }
  }

  private async analyzeJavaScript(file: FileInfo): Promise<number> {
    try {
      const content = await fs.readFile(file.absolutePath, "utf-8");

      let aiScore = 0;

      // Check for uniform function lengths (AI tends to generate similar-sized functions)
      const functionLengths = this.extractFunctionLengths(content);
      if (functionLengths.length > 2) {
        const avgLength = functionLengths.reduce((a, b) => a + b, 0) / functionLengths.length;
        const variance = functionLengths.reduce((sum, len) => sum + Math.pow(len - avgLength, 2), 0) / functionLengths.length;

        // Low variance suggests AI generation
        if (variance < 50) {
          aiScore += 0.3;
        }
      }

      // Check for excessive use of default parameters (AI pattern)
      const defaultParamCount = (content.match(/=\s*\w+/g) || []).length;
      if (defaultParamCount > 5) {
        aiScore += 0.2;
      }

      // Check for arrow function dominance (AI prefers arrow functions)
      const arrowFunctions = (content.match(/=>/g) || []).length;
      const regularFunctions = (content.match(/function\s+\w+/g) || []).length;
      if (arrowFunctions > regularFunctions * 2 && arrowFunctions > 3) {
        aiScore += 0.2;
      }

      // Check for destructuring patterns (AI often uses destructuring)
      const destructuringCount = (content.match(/\{[^}]*\}\s*=/g) || []).length;
      if (destructuringCount > 3) {
        aiScore += 0.15;
      }

      // Check for template string usage (AI prefers template strings)
      const templateStringCount = (content.match(/`[^`]*`/g) || []).length;
      if (templateStringCount > 3) {
        aiScore += 0.15;
      }

      return Math.min(aiScore, 1);
    } catch (error) {
      console.warn(`AST analysis failed for ${file.path}:`, error);
      return 0;
    }
  }

  private async analyzePython(file: FileInfo): Promise<number> {
    try {
      const content = await fs.readFile(file.absolutePath, "utf-8");

      let aiScore = 0;

      // Check for type hints (AI tends to add type hints)
      const typeHints = (content.match(/:\s*\w+/g) || []).length;
      if (typeHints > 3) {
        aiScore += 0.3;
      }

      // Check for docstrings (AI tends to add docstrings)
      const docstrings = (content.match(/"""/g) || []).length / 2;
      if (docstrings > 2) {
        aiScore += 0.2;
      }

      // Check for list comprehensions (AI prefers them)
      const listComprehensions = (content.match(/\[[\s\S]*for\s+\w+\s+in/g) || []).length;
      if (listComprehensions > 2) {
        aiScore += 0.2;
      }

      // Check for f-strings (AI prefers f-strings)
      const fStrings = (content.match(/f["']/g) || []).length;
      if (fStrings > 3) {
        aiScore += 0.15;
      }

      return Math.min(aiScore, 1);
    } catch (error) {
      console.warn(`AST analysis failed for ${file.path}:`, error);
      return 0;
    }
  }

  private async analyzeGeneric(file: FileInfo): Promise<number> {
    try {
      const content = await fs.readFile(file.absolutePath, "utf-8");

      // Generic analysis for unsupported languages
      let aiScore = 0;

      // Check for consistent indentation (AI tends to be consistent)
      const lines = content.split("\n");
      const indentSizes = lines
        .filter(line => line.trim().length > 0)
        .map(line => line.match(/^\s*/)?.[0]?.length || 0);

      if (indentSizes.length > 3) {
        const uniqueIndents = new Set(indentSizes);
        if (uniqueIndents.size <= 3) {
          aiScore += 0.2;
        }
      }

      // Check for line length consistency
      const lineLengths = lines.map(line => line.length);
      const avgLength = lineLengths.reduce((a, b) => a + b, 0) / lineLengths.length;
      const tooLongLines = lineLengths.filter(len => len > avgLength * 1.5).length;

      if (tooLongLines < lineLengths.length * 0.1) {
        aiScore += 0.2;
      }

      return Math.min(aiScore, 1);
    } catch (error) {
      console.warn(`Generic analysis failed for ${file.path}:`, error);
      return 0;
    }
  }

  private extractFunctionLengths(content: string): number[] {
    const lengths: number[] = [];
    const functionRegex = /(?:function\s+\w+|const\s+\w+\s*=\s*\([^)]*\)\s*=>|export\s+(?:const|function)\s+\w+)/g;

    let match;
    let lastIndex = 0;

    while ((match = functionRegex.exec(content)) !== null) {
      const startIndex = match.index;
      // Simple heuristic: find next function or end of file
      const nextMatch = functionRegex.exec(content);
      const endIndex = nextMatch ? nextMatch.index : content.length;

      const functionContent = content.slice(startIndex, endIndex);
      const lines = functionContent.split("\n").length;
      lengths.push(lines);

      // Reset regex to continue from next match
      if (nextMatch) {
        functionRegex.lastIndex = nextMatch.index;
      }
    }

    return lengths;
  }
}
