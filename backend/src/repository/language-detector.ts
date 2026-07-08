/**
 * Language Detector
 * Detects programming language from file extension
 */

import type { Language } from "../core/types.js";

export class LanguageDetector {
  private extensionMap: Record<string, Language> = {
    ".ts": "typescript",
    ".tsx": "typescript",
    ".js": "javascript",
    ".jsx": "javascript",
    ".mjs": "javascript",
    ".cjs": "javascript",
    ".py": "python",
    ".go": "go",
    ".rs": "rust",
    ".java": "java",
    ".cs": "csharp",
    ".php": "php",
    ".json": "unknown",
    ".yaml": "unknown",
    ".yml": "unknown",
    ".toml": "unknown",
    ".md": "unknown",
  };

  detect(filePath: string): Language {
    const ext = this.getExtension(filePath);
    return this.extensionMap[ext] || "unknown";
  }

  private getExtension(filePath: string): string {
    const parts = filePath.split(".");
    if (parts.length < 2) return "";

    // Handle cases like .ts, .tsx, etc.
    const lastPart = parts[parts.length - 1];
    const secondLastPart = parts[parts.length - 2];

    if (lastPart === "ts" && secondLastPart === "tsx") return ".tsx";
    if (lastPart === "js" && secondLastPart === "jsx") return ".jsx";

    return "." + lastPart;
  }
}
