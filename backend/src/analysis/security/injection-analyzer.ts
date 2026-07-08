/**
 * Injection Analyzer
 * Detects injection vulnerabilities (SQL, command, XSS, etc.)
 */

import fs from "fs/promises";
import type { RepositoryContext, Finding } from "../../core/types.js";

export class InjectionAnalyzer {
  async analyze(context: RepositoryContext): Promise<Finding[]> {
    const findings: Finding[] = [];

    for (const file of context.files) {
      const injectionRisks = await this.analyzeFile(file);
      findings.push(...injectionRisks);
    }

    return findings;
  }

  private async analyzeFile(file: any): Promise<Finding[]> {
    const findings: Finding[] = [];

    try {
      const content = await fs.readFile(file.absolutePath, "utf-8");

      // Check for SQL injection risks
      const sqlInjectionPatterns = [
        { pattern: /(?:SELECT|INSERT|UPDATE|DELETE)\s+.*?\s+FROM\s+.*?\$\{[^}]+\}/gi, severity: "critical" as const },
        { pattern: /(?:SELECT|INSERT|UPDATE|DELETE)\s+.*?\s+FROM\s+.*?\+[^;]+;/gi, severity: "critical" as const },
        { pattern: /query\s*\(\s*['"][^'"]*\$\{[^}]+\}['"]\s*\)/gi, severity: "high" as const },
        { pattern: /execute\s*\(\s*['"][^'"]*\$\{[^}]+\}['"]\s*\)/gi, severity: "high" as const },
      ];

      for (const { pattern, severity } of sqlInjectionPatterns) {
        const matches = content.match(pattern);
        if (matches) {
          findings.push({
            id: `sql-injection-${file.path}`,
            type: "SQL-INJECTION",
            severity,
            score: severity === "critical" ? 90 : 75,
            file: file.path,
            line: 1,
            message: "Potential SQL injection vulnerability",
            description: "Direct string concatenation in SQL query",
            suggestion: "Use parameterized queries or prepared statements",
            category: "security",
          });
        }
      }

      // Check for command injection risks
      const commandInjectionPatterns = [
        { pattern: /exec\s*\(\s*['"][^'"]*\$\{[^}]+\}['"]\s*\)/gi, severity: "critical" as const },
        { pattern: /spawn\s*\(\s*['"][^'"]*\$\{[^}]+\}['"]\s*\)/gi, severity: "critical" as const },
        { pattern: /system\s*\(\s*['"][^'"]*\$\{[^}]+\}['"]\s*\)/gi, severity: "critical" as const },
        { pattern: /child_process\.exec\s*\(\s*[^,]*,\s*\{[^}]*\}\s*\)/gi, severity: "high" as const },
      ];

      for (const { pattern, severity } of commandInjectionPatterns) {
        const matches = content.match(pattern);
        if (matches) {
          findings.push({
            id: `cmd-injection-${file.path}`,
            type: "COMMAND-INJECTION",
            severity,
            score: severity === "critical" ? 90 : 75,
            file: file.path,
            line: 1,
            message: "Potential command injection vulnerability",
            description: "User input in command execution",
            suggestion: "Use proper argument arrays and validate input",
            category: "security",
          });
        }
      }

      // Check for XSS risks
      const xssPatterns = [
        { pattern: /dangerouslySetInnerHTML\s*=\s*\{[^}]*\$\{[^}]+\}[^}]*\}/gi, severity: "high" as const },
        { pattern: /innerHTML\s*=\s*[^;]*\$\{[^}]+\}/gi, severity: "high" as const },
        { pattern: /document\.write\s*\(\s*[^)]*\$\{[^}]+\}/gi, severity: "high" as const },
        { pattern: /eval\s*\(\s*[^)]*\$\{[^}]+\}/gi, severity: "critical" as const },
      ];

      for (const { pattern, severity } of xssPatterns) {
        const matches = content.match(pattern);
        if (matches) {
          findings.push({
            id: `xss-${file.path}`,
            type: "XSS-VULNERABILITY",
            severity,
            score: severity === "critical" ? 90 : 75,
            file: file.path,
            line: 1,
            message: "Potential XSS vulnerability",
            description: "Unsanitized user input in rendering",
            suggestion: "Sanitize user input before rendering and use safe rendering methods",
            category: "security",
          });
        }
      }

      // Check for path traversal
      const pathTraversalPatterns = [
        { pattern: /readFile\s*\(\s*[^)]*\$\{[^}]+\}/gi, severity: "high" as const },
        { pattern: /writeFile\s*\(\s*[^)]*\$\{[^}]+\}/gi, severity: "high" as const },
        { pattern: /fs\.readFileSync\s*\(\s*[^)]*\$\{[^}]+\}/gi, severity: "high" as const },
      ];

      for (const { pattern, severity } of pathTraversalPatterns) {
        const matches = content.match(pattern);
        if (matches) {
          findings.push({
            id: `path-traversal-${file.path}`,
            type: "PATH-TRAVERSAL",
            severity,
            score: 70,
            file: file.path,
            line: 1,
            message: "Potential path traversal vulnerability",
            description: "User input in file system operations",
            suggestion: "Validate and sanitize file paths, use path.resolve with base directory",
            category: "security",
          });
        }
      }

    } catch (error) {
      console.warn(`Injection analysis failed for ${file.path}:`, error);
    }

    return findings;
  }
}
