/**
 * Gitignore Parser
 * Parses .gitignore files and returns ignore patterns
 */

import fs from "fs/promises";
import path from "path";

export class GitignoreParser {
  async parse(root: string): Promise<string[]> {
    const gitignorePath = path.join(root, ".gitignore");

    try {
      await fs.access(gitignorePath);
      const content = await fs.readFile(gitignorePath, "utf-8");
      return this.parseContent(content);
    } catch {
      // No .gitignore file
      return [];
    }
  }

  private parseContent(content: string): string[] {
    const patterns: string[] = [];
    const lines = content.split("\n");

    for (const line of lines) {
      const trimmed = line.trim();

      // Skip empty lines and comments
      if (!trimmed || trimmed.startsWith("#")) {
        continue;
      }

      // Handle negation patterns
      if (trimmed.startsWith("!")) {
        // Negation patterns are complex to handle with glob
        // For now, we'll skip them
        continue;
      }

      // Convert gitignore pattern to glob pattern
      const globPattern = this.gitignoreToGlob(trimmed);
      patterns.push(globPattern);
    }

    return patterns;
  }

  private gitignoreToGlob(pattern: string): string {
    // Gitignore patterns are similar to glob patterns but have some differences
    // This is a simplified conversion

    if (pattern.startsWith("/")) {
      // Pattern is anchored to root
      return pattern.slice(1);
    }

    if (pattern.endsWith("/")) {
      // Pattern is a directory
      return pattern + "**";
    }

    if (pattern.includes("/")) {
      // Pattern includes directory, it's already relative
      return pattern;
    }

    // Pattern is filename-only, should match anywhere
    return "**/" + pattern;
  }
}
