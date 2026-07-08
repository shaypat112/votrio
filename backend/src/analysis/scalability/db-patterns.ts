/**
 * Database Pattern Analyzer
 * Identifies database patterns that don't scale
 */

import fs from "fs/promises";
import type { RepositoryContext, Finding } from "../../core/types.js";

export class DatabasePatternAnalyzer {
  async analyze(context: RepositoryContext): Promise<Finding[]> {
    const findings: Finding[] = [];

    for (const file of context.files) {
      const dbIssues = await this.analyzeFile(file);
      findings.push(...dbIssues);
    }

    return findings;
  }

  private async analyzeFile(file: any): Promise<Finding[]> {
    const findings: Finding[] = [];

    try {
      const content = await fs.readFile(file.absolutePath, "utf-8");

      // Check for N+1 query patterns
      const nPlusOnePattern = /(?:forEach|for\s*\(\w+\s+of|\.map\([^)]*\)\s*=>\s*\{[\s\S]*?query)/g;
      const nPlusOneQueries = content.match(nPlusOnePattern);
      if (nPlusOneQueries && nPlusOneQueries.length > 0) {
        findings.push({
          id: `n-plus-one-${file.path}`,
          type: "N-PLUS-ONE-QUERY",
          severity: "high",
          score: 75,
          file: file.path,
          line: 1,
          message: "Potential N+1 query pattern detected",
          description: "Query inside loop may cause performance issues",
          suggestion: "Use eager loading or batch queries instead of querying in loops",
          category: "scalability",
        });
      }

      // Check for missing indexes hints (simplified)
      const selectPattern = /SELECT\s+\*\s+FROM/gi;
      const selectAll = content.match(selectPattern);
      if (selectAll && selectAll.length > 2) {
        findings.push({
          id: `select-all-${file.path}`,
          type: "SELECT-ALL-QUERY",
          severity: "medium",
          score: 50,
          file: file.path,
          line: 1,
          message: "SELECT * queries detected",
          description: "SELECT * can be inefficient for large tables",
          suggestion: "Specify only required columns instead of SELECT *",
          category: "scalability",
        });
      }

      // Check for missing pagination
      const queryPattern = /(?:query|find|selectAll)\([^)]*\)/g;
      const queries = content.match(queryPattern);
      if (queries && queries.length > 3) {
        const hasPagination = /(?:limit|skip|offset|take)/i.test(content);
        if (!hasPagination) {
          findings.push({
            id: `missing-pagination-${file.path}`,
            type: "MISSING-PAGINATION",
            severity: "high",
            score: 70,
            file: file.path,
            line: 1,
            message: "Queries without pagination detected",
            description: "Unpaginated queries can cause performance issues with large datasets",
            suggestion: "Add pagination to all queries that can return large result sets",
            category: "scalability",
          });
        }
      }

      // Check for transaction usage issues
      const transactionPattern = /transaction/gi;
      const transactions = content.match(transactionPattern);
      if (transactions && transactions.length > 3) {
        findings.push({
          id: `heavy-transactions-${file.path}`,
          type: "HEAVY-TRANSACTION-USAGE",
          severity: "medium",
          score: 55,
          file: file.path,
          line: 1,
          message: "Heavy transaction usage detected",
          description: "Many transactions can impact database performance",
          suggestion: "Review transaction boundaries and minimize transaction duration",
          category: "scalability",
        });
      }

    } catch (error) {
      console.warn(`Database pattern analysis failed for ${file.path}:`, error);
    }

    return findings;
  }
}
