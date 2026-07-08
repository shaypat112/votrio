/**
 * Secret Detector
 * Detects hardcoded secrets and credentials
 */

import fs from "fs/promises";
import type { RepositoryContext, Finding } from "../../core/types.js";

export class SecretDetector {
  private secretPatterns = [
    // API Keys
    { pattern: /(?:api_?key|apikey|api-key)\s*[:=]\s*['"]([a-zA-Z0-9]{20,})['"]/gi, severity: "critical" as const },
    { pattern: /(?:secret_?key|secretkey|secret-key)\s*[:=]\s*['"]([a-zA-Z0-9]{20,})['"]/gi, severity: "critical" as const },

    // Tokens
    { pattern: /(?:access_?token|accesstoken|access-token)\s*[:=]\s*['"]([a-zA-Z0-9]{20,})['"]/gi, severity: "critical" as const },
    { pattern: /(?:refresh_?token|refreshtoken|refresh-token)\s*[:=]\s*['"]([a-zA-Z0-9]{20,})['"]/gi, severity: "critical" as const },
    { pattern: /(?:auth_?token|authtoken|auth-token)\s*[:=]\s*['"]([a-zA-Z0-9]{20,})['"]/gi, severity: "critical" as const },

    // Passwords
    { pattern: /(?:password|passwd|pass)\s*[:=]\s*['"]([^'"]{8,})['"]/gi, severity: "high" as const },

    // Database credentials
    { pattern: /(?:db_?password|dbpassword|db-password)\s*[:=]\s*['"]([^'"]{8,})['"]/gi, severity: "critical" as const },
    { pattern: /(?:database_?url|databaseurl|database-url)\s*[:=]\s*['"]([^'"]{10,})['"]/gi, severity: "high" as const },

    // Cloud provider keys
    { pattern: /aws_access_key_id\s*[:=]\s*['"]([A-Z0-9]{20})['"]/gi, severity: "critical" as const },
    { pattern: /aws_secret_access_key\s*[:=]\s*['"]([a-zA-Z0-9/+]{40})['"]/gi, severity: "critical" as const },
    { pattern: /google_api_key\s*[:=]\s*['"]([a-zA-Z0-9_-]{39})['"]/gi, severity: "critical" as const },

    // Service tokens
    { pattern: /(?:stripe_?secret|stripesecret|stripe-secret)\s*[:=]\s*['"]([a-zA-Z0-9]{20,})['"]/gi, severity: "critical" as const },
    { pattern: /(?:github_?token|githubtoken|github-token)\s*[:=]\s*['"]([a-zA-Z0-9]{20,})['"]/gi, severity: "critical" as const },

    // Private keys
    { pattern: /-----BEGIN\s+(?:RSA\s+)?PRIVATE\s+KEY-----/g, severity: "critical" as const },
    { pattern: /-----BEGIN\s+EC\s+PRIVATE\s+KEY-----/g, severity: "critical" as const },

    // Base64 encoded secrets (heuristic)
    { pattern: /['"]([a-zA-Z0-9+/]{50,}={0,2})['"]/g, severity: "medium" as const },
  ];

  async detect(context: RepositoryContext): Promise<Finding[]> {
    const findings: Finding[] = [];

    for (const file of context.files) {
      const secrets = await this.analyzeFile(file);
      findings.push(...secrets);
    }

    return findings;
  }

  private async analyzeFile(file: any): Promise<Finding[]> {
    const findings: Finding[] = [];

    try {
      const content = await fs.readFile(file.absolutePath, "utf-8");
      const lines = content.split("\n");

      for (const { pattern, severity } of this.secretPatterns) {
        let match;
        const regex = new RegExp(pattern.source, pattern.flags);

        while ((match = regex.exec(content)) !== null) {
          const line = content.slice(0, match.index).split("\n").length;
          const matchedValue = match[1] || match[0];

          // Skip if it's clearly a placeholder
          if (this.isPlaceholder(matchedValue)) {
            continue;
          }

          findings.push({
            id: `secret-${file.path}-${line}`,
            type: "HARDCODED-SECRET",
            severity,
            score: severity === "critical" ? 95 : 75,
            file: file.path,
            line,
            message: "Hardcoded secret detected",
            description: `Potential hardcoded secret: ${this.maskSecret(matchedValue)}`,
            suggestion: "Move secrets to environment variables or secret management service",
            category: "security",
          });
        }
      }

    } catch (error) {
      console.warn(`Secret detection failed for ${file.path}:`, error);
    }

    return findings;
  }

  private isPlaceholder(value: string): boolean {
    const placeholders = [
      "your_api_key",
      "your_secret",
      "your_token",
      "your_password",
      "placeholder",
      "example",
      "test",
      "dummy",
      "xxx",
      "___",
    ];

    const lowerValue = value.toLowerCase();
    return placeholders.some(placeholder => lowerValue.includes(placeholder));
  }

  private maskSecret(secret: string): string {
    if (secret.length <= 8) {
      return "******";
    }
    return secret.substring(0, 4) + "..." + secret.substring(secret.length - 4);
  }
}
