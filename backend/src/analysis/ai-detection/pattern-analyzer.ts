/**
 * Pattern Analyzer
 * Analyzes code patterns that suggest AI generation
 */

import fs from "fs/promises";
import type { FileInfo } from "../../core/types.js";

export class PatternAnalyzer {
  private aiPatterns = [
    // AI-generated code often has these characteristics
    { pattern: /TODO:|FIXME:|XXX:/g, weight: 0.1 }, // Generic comments
    { pattern: /\/\/ This function/g, weight: 0.2 }, // Generic function comments
    { pattern: /\/\/ \w+ returns? the/g, weight: 0.3 }, // Generic return comments
    { pattern: /\/\*\*[\s\S]*?\*\//g, weight: 0.15 }, // Overly documented code
    { pattern: /\b(simple|basic|standard|common|typical)\b/gi, weight: 0.2 }, // Generic adjectives
    { pattern: /\/\/ Handle error/gi, weight: 0.25 }, // Generic error handling comments
    { pattern: /\/\/ Check if/gi, weight: 0.2 }, // Generic condition comments
    { pattern: /\/\/ Make sure/gi, weight: 0.25 }, // Generic validation comments
    { pattern: /\/\/ Note that/gi, weight: 0.2 }, // Generic note comments
    { pattern: /\/\/ See also/gi, weight: 0.15 }, // Generic reference comments
  ];

  private boilerplatePatterns = [
    // Common AI boilerplate
    { pattern: /\/\/ Import dependencies/gi, weight: 0.3 },
    { pattern: /\/\/ Define types/gi, weight: 0.3 },
    { pattern: /\/\/ Initialize/gi, weight: 0.25 },
    { pattern: /\/\/ Configuration/gi, weight: 0.25 },
  ];

  private consistencyPatterns = [
    // Inconsistent naming suggests AI
    { pattern: /\b(get|set|fetch|retrieve|load)\w+/g, weight: 0.1 },
    { pattern: /\b(handle|process|execute|run)\w+/g, weight: 0.1 },
  ];

  async analyze(file: FileInfo): Promise<number> {
    try {
      const content = await fs.readFile(file.absolutePath, "utf-8");

      let aiScore = 0;
      let totalMatches = 0;

      // Analyze AI patterns
      for (const { pattern, weight } of this.aiPatterns) {
        const matches = content.match(pattern);
        if (matches) {
          aiScore += matches.length * weight;
          totalMatches += matches.length;
        }
      }

      // Analyze boilerplate patterns
      for (const { pattern, weight } of this.boilerplatePatterns) {
        const matches = content.match(pattern);
        if (matches) {
          aiScore += matches.length * weight;
          totalMatches += matches.length;
        }
      }

      // Analyze consistency patterns
      for (const { pattern, weight } of this.consistencyPatterns) {
        const matches = content.match(pattern);
        if (matches) {
          aiScore += matches.length * weight;
          totalMatches += matches.length;
        }
      }

      // Check for excessive comments (AI tends to over-comment)
      const lines = content.split("\n");
      const commentLines = lines.filter(line =>
        line.trim().startsWith("//") || line.trim().startsWith("/*")
      ).length;
      const commentRatio = commentLines / lines.length;

      if (commentRatio > 0.3) {
        aiScore += 0.3;
      }

      // Normalize score to 0-1 range
      const normalizedScore = Math.min(aiScore / 2, 1);

      return normalizedScore;
    } catch (error) {
      console.warn(`Pattern analysis failed for ${file.path}:`, error);
      return 0;
    }
  }
}
