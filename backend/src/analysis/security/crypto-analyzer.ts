/**
 * Crypto Analyzer
 * Detects weak cryptography and encryption issues
 */

import fs from "fs/promises";
import type { RepositoryContext, Finding } from "../../core/types.js";

export class CryptoAnalyzer {
  async analyze(context: RepositoryContext): Promise<Finding[]> {
    const findings: Finding[] = [];

    for (const file of context.files) {
      const cryptoIssues = await this.analyzeFile(file);
      findings.push(...cryptoIssues);
    }

    return findings;
  }

  private async analyzeFile(file: any): Promise<Finding[]> {
    const findings: Finding[] = [];

    try {
      const content = await fs.readFile(file.absolutePath, "utf-8");

      // Check for weak encryption algorithms
      const weakCryptoPatterns = [
        { pattern: /md5\s*\(/gi, severity: "high" as const, algorithm: "MD5" },
        { pattern: /sha1\s*\(/gi, severity: "high" as const, algorithm: "SHA1" },
        { pattern: /createHash\s*\(\s*['"]md5['"]\s*\)/gi, severity: "high" as const, algorithm: "MD5" },
        { pattern: /createHash\s*\(\s*['"]sha1['"]\s*\)/gi, severity: "high" as const, algorithm: "SHA1" },
        { pattern: /des\s*\(/gi, severity: "critical" as const, algorithm: "DES" },
        { pattern: /rc4\s*\(/gi, severity: "critical" as const, algorithm: "RC4" },
      ];

      for (const { pattern, severity, algorithm } of weakCryptoPatterns) {
        const matches = content.match(pattern);
        if (matches) {
          findings.push({
            id: `weak-crypto-${file.path}-${algorithm}`,
            type: "WEAK-CRYPTOGRAPHY",
            severity,
            score: severity === "critical" ? 85 : 70,
            file: file.path,
            line: 1,
            message: `Weak cryptographic algorithm detected: ${algorithm}`,
            description: `${algorithm} is considered weak and should not be used for security purposes`,
            suggestion: `Use stronger alternatives like SHA-256, SHA-512, or AES-256`,
            category: "security",
          });
        }
      }

      // Check for hardcoded IV/keys
      const hardcodedKeyPatterns = [
        { pattern: /iv\s*[:=]\s*['"][a-f0-9]{16,}['"]/gi, severity: "high" as const },
        { pattern: /key\s*[:=]\s*['"][a-f0-9]{16,}['"]/gi, severity: "high" as const },
        { pattern: /salt\s*[:=]\s*['"][a-f0-9]{16,}['"]/gi, severity: "medium" as const },
      ];

      for (const { pattern, severity } of hardcodedKeyPatterns) {
        const matches = content.match(pattern);
        if (matches) {
          findings.push({
            id: `hardcoded-crypto-key-${file.path}`,
            type: "HARDCODED-CRYPTO-KEY",
            severity,
            score: 70,
            file: file.path,
            line: 1,
            message: "Hardcoded cryptographic key/IV detected",
            description: "Cryptographic keys and IVs should not be hardcoded",
            suggestion: "Generate keys and IVs dynamically using secure random number generators",
            category: "security",
          });
        }
      }

      // Check for random number generation issues
      const weakRandomPatterns = [
        { pattern: /Math\.random\s*\(\s*\)/gi, severity: "medium" as const },
        { pattern: /random\s*\(\s*\)/gi, severity: "medium" as const },
      ];

      for (const { pattern, severity } of weakRandomPatterns) {
        const matches = content.match(pattern);
        if (matches && matches.length > 2) {
          const cryptoContext = /(?:crypto|password|key|token|session)/i.test(content);
          if (cryptoContext) {
            findings.push({
              id: `weak-random-${file.path}`,
              type: "WEAK-RANDOM-GENERATION",
              severity,
              score: 55,
              file: file.path,
              line: 1,
              message: "Weak random number generation in security context",
              description: "Math.random() is not cryptographically secure",
              suggestion: "Use crypto.randomBytes() or window.crypto.getRandomValues() for security purposes",
              category: "security",
            });
          }
        }
      }

      // Check for insecure TLS/SSL configurations
      const insecureTlsPatterns = [
        { pattern: /rejectUnauthorized\s*:\s*false/gi, severity: "high" as const },
        { pattern: /secureProtocol\s*:\s*['"]TLSv1['"]/gi, severity: "high" as const },
        { pattern: /secureProtocol\s*:\s*['"]SSLv3['"]/gi, severity: "critical" as const },
        { pattern: /checkServerIdentity\s*:\s*\(\)\s*=>\s*\{[^}]*\}/gi, severity: "high" as const },
      ];

      for (const { pattern, severity } of insecureTlsPatterns) {
        const matches = content.match(pattern);
        if (matches) {
          findings.push({
            id: `insecure-tls-${file.path}`,
            type: "INSECURE-TLS-CONFIG",
            severity,
            score: severity === "critical" ? 85 : 70,
            file: file.path,
            line: 1,
            message: "Insecure TLS/SSL configuration detected",
            description: "TLS configuration allows insecure connections or protocols",
            suggestion: "Use secure TLS protocols (TLS 1.2+) and proper certificate validation",
            category: "security",
          });
        }
      }

      // Check for encryption without integrity check
      const encryptionPatterns = [
        { pattern: /createCipher\s*\(/gi, severity: "high" as const },
        { pattern: /createDecipher\s*\(/gi, severity: "high" as const },
      ];

      for (const { pattern, severity } of encryptionPatterns) {
        const matches = content.match(pattern);
        if (matches) {
          findings.push({
            id: `encryption-without-hmac-${file.path}`,
            type: "ENCRYPTION-WITHOUT-INTEGRITY",
            severity,
            score: 70,
            file: file.path,
            line: 1,
            message: "Encryption without integrity check detected",
            description: "Using createCipher/createDecipher without HMAC for integrity",
            suggestion: "Use authenticated encryption (AEAD) like AES-GCM or add HMAC for integrity verification",
            category: "security",
          });
        }
      }

    } catch (error) {
      console.warn(`Crypto analysis failed for ${file.path}:`, error);
    }

    return findings;
  }
}
