/**
 * Auth Analyzer
 * Detects authentication and authorization issues
 */

import fs from "fs/promises";
import type { RepositoryContext, Finding } from "../../core/types.js";

export class AuthAnalyzer {
  async analyze(context: RepositoryContext): Promise<Finding[]> {
    const findings: Finding[] = [];

    for (const file of context.files) {
      const authIssues = await this.analyzeFile(file);
      findings.push(...authIssues);
    }

    return findings;
  }

  private async analyzeFile(file: any): Promise<Finding[]> {
    const findings: Finding[] = [];

    try {
      const content = await fs.readFile(file.absolutePath, "utf-8");

      // Check for hardcoded credentials in auth
      const hardcodedAuthPatterns = [
        { pattern: /(?:username|user)\s*[:=]\s*['"]\w+['"]/gi, severity: "medium" as const },
        { pattern: /(?:password|pass)\s*[:=]\s*['"][^'"]{4,}['"]/gi, severity: "high" as const },
        { pattern: /basic\s+auth\s+['"][^'"]+['"]/gi, severity: "high" as const },
      ];

      for (const { pattern, severity } of hardcodedAuthPatterns) {
        const matches = content.match(pattern);
        if (matches) {
          findings.push({
            id: `hardcoded-auth-${file.path}`,
            type: "HARDCODED-AUTH",
            severity,
            score: severity === "high" ? 75 : 50,
            file: file.path,
            line: 1,
            message: "Hardcoded authentication credentials detected",
            description: "Authentication credentials should not be hardcoded",
            suggestion: "Use environment variables or secure credential management",
            category: "security",
          });
        }
      }

      // Check for weak password handling
      const weakPasswordPatterns = [
        { pattern: /password\s*=\s*['"]123456['"]/gi, severity: "critical" as const },
        { pattern: /password\s*=\s*['"]password['"]/gi, severity: "critical" as const },
        { pattern: /password\s*=\s*['"]admin['"]/gi, severity: "critical" as const },
        { pattern: /password\s*=\s*['"]root['"]/gi, severity: "critical" as const },
      ];

      for (const { pattern, severity } of weakPasswordPatterns) {
        const matches = content.match(pattern);
        if (matches) {
          findings.push({
            id: `weak-password-${file.path}`,
            type: "WEAK-PASSWORD",
            severity,
            score: 85,
            file: file.path,
            line: 1,
            message: "Weak or default password detected",
            description: "Common or weak password in use",
            suggestion: "Use strong, unique passwords and proper password policies",
            category: "security",
          });
        }
      }

      // Check for missing authentication
      const publicApiPatterns = [
        { pattern: /app\.(get|post|put|delete)\s*\(\s*['"][^'"]*['"]\s*,\s*\([^)]*\)\s*=>\s*{/gi, severity: "medium" as const },
        { pattern: /router\.(get|post|put|delete)\s*\(\s*['"][^'"]*['"]\s*,\s*\([^)]*\)\s*=>\s*{/gi, severity: "medium" as const },
      ];

      for (const { pattern, severity } of publicApiPatterns) {
        const matches = content.match(pattern);
        if (matches && matches.length > 3) {
          const hasAuth = /(?:auth|authenticate|authorize|middleware|guard)/i.test(content);
          if (!hasAuth) {
            findings.push({
              id: `missing-auth-${file.path}`,
              type: "MISSING-AUTHENTICATION",
              severity,
              score: 60,
              file: file.path,
              line: 1,
              message: "Public API endpoints without authentication",
              description: "Multiple API endpoints without visible authentication",
              suggestion: "Add authentication middleware to protect sensitive endpoints",
              category: "security",
            });
          }
        }
      }

      // Check for insecure session handling
      const insecureSessionPatterns = [
        { pattern: /session\s*=\s*[^;]+;/gi, severity: "medium" as const },
        { pattern: /cookie\s*\(\s*['"][^'"]*['"]\s*,\s*[^,)]+[^)]*\)/gi, severity: "medium" as const },
      ];

      for (const { pattern, severity } of insecureSessionPatterns) {
        const matches = content.match(pattern);
        if (matches) {
          const hasSecure = /(?:secure|httponly|sameSite)/i.test(content);
          if (!hasSecure) {
            findings.push({
              id: `insecure-session-${file.path}`,
              type: "INSECURE-SESSION",
              severity,
              score: 55,
              file: file.path,
              line: 1,
              message: "Insecure session/cookie handling",
              description: "Session or cookie without security flags",
              suggestion: "Add secure, httpOnly, and sameSite flags to cookies",
              category: "security",
            });
          }
        }
      }

      // Check for JWT without verification
      const jwtPatterns = [
        { pattern: /jwt\.verify\s*\(\s*token\s*,\s*[^)]+\)/gi, severity: "low" as const },
        { pattern: /jsonwebtoken\.verify\s*\(\s*token\s*,\s*[^)]+\)/gi, severity: "low" as const },
      ];

      const hasJwtUsage = /jwt|jsonwebtoken/i.test(content);
      if (hasJwtUsage) {
        const hasVerification = /jwt\.verify|jsonwebtoken\.verify/i.test(content);
        if (!hasVerification) {
          findings.push({
            id: `unverified-jwt-${file.path}`,
            type: "UNVERIFIED-JWT",
            severity: "high",
            score: 70,
            file: file.path,
            line: 1,
            message: "JWT usage without verification",
            description: "JWT tokens are used but verification is not visible",
            suggestion: "Always verify JWT signatures before using token data",
            category: "security",
          });
        }
      }

    } catch (error) {
      console.warn(`Auth analysis failed for ${file.path}:`, error);
    }

    return findings;
  }
}
