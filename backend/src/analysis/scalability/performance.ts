/**
 * Performance Analyzer
 * Identifies performance anti-patterns
 */

import fs from "fs/promises";
import type { RepositoryContext, Finding } from "../../core/types.js";

export class PerformanceAnalyzer {
  async analyze(context: RepositoryContext): Promise<Finding[]> {
    const findings: Finding[] = [];

    for (const file of context.files) {
      const performanceIssues = await this.analyzeFile(file);
      findings.push(...performanceIssues);
    }

    return findings;
  }

  private async analyzeFile(file: any): Promise<Finding[]> {
    const findings: Finding[] = [];

    try {
      const content = await fs.readFile(file.absolutePath, "utf-8");

      // Check for synchronous operations
      const syncPattern = /(?:readFileSync|writeFileSync|execSync)\s*\(/g;
      const syncOps = content.match(syncPattern);
      if (syncOps && syncOps.length > 0) {
        findings.push({
          id: `sync-operations-${file.path}`,
          type: "SYNCHRONOUS-OPERATIONS",
          severity: "high",
          score: 75,
          file: file.path,
          line: 1,
          message: "Synchronous file operations detected",
          description: `Found ${syncOps.length} synchronous operations that block the event loop`,
          suggestion: "Use async/await or Promise-based APIs instead of synchronous operations",
          category: "scalability",
        });
      }

      // Check for unbounded loops
      const whilePattern = /while\s*\(\s*true\s*\)/g;
      const infiniteLoops = content.match(whilePattern);
      if (infiniteLoops && infiniteLoops.length > 0) {
        findings.push({
          id: `infinite-loop-${file.path}`,
          type: "POTENTIAL-INFINITE-LOOP",
          severity: "critical",
          score: 90,
          file: file.path,
          line: 1,
          message: "Potential infinite loop detected",
          description: "while(true) loop without clear exit condition",
          suggestion: "Ensure loops have proper exit conditions or use timeouts",
          category: "scalability",
        });
      }

      // Check for nested loops (potential O(n²) complexity)
      const nestedLoopPattern = /for\s*\([^)]*\)[\s\S]{0,200}for\s*\(/g;
      const nestedLoops = content.match(nestedLoopPattern);
      if (nestedLoops && nestedLoops.length > 0) {
        findings.push({
          id: `nested-loops-${file.path}`,
          type: "NESTED-LOOPS",
          severity: "medium",
          score: 55,
          file: file.path,
          line: 1,
          message: "Nested loops detected",
          description: "Nested loops can lead to O(n²) time complexity",
          suggestion: "Consider using more efficient algorithms or data structures",
          category: "scalability",
        });
      }

      // Check for excessive API calls
      const apiCallPattern = /(?:fetch|axios|http\.request|request\()/g;
      const apiCalls = content.match(apiCallPattern);
      if (apiCalls && apiCalls.length > 5) {
        findings.push({
          id: `excessive-api-calls-${file.path}`,
          type: "EXCESSIVE-API-CALLS",
          severity: "medium",
          score: 50,
          file: file.path,
          line: 1,
          message: "Excessive API calls detected",
          description: `Found ${apiCalls.length} API calls in single file`,
          suggestion: "Consider batching API calls or implementing caching",
          category: "scalability",
        });
      }

      // Check for missing caching
      const dataFetchPattern = /(?:fetch|axios|http\.request)/g;
      const dataFetches = content.match(dataFetchPattern);
      if (dataFetches && dataFetches.length > 2) {
        const hasCache = /(?:cache|Cache|CACHE)/.test(content);
        if (!hasCache) {
          findings.push({
            id: `missing-caching-${file.path}`,
            type: "MISSING-CACHING",
            severity: "low",
            score: 35,
            file: file.path,
            line: 1,
            message: "Data fetching without caching",
            description: "API calls without caching mechanism",
            suggestion: "Implement caching for frequently accessed data",
            category: "scalability",
          });
        }
      }

      // Check for large object allocations
      const largeObjectPattern = /new\s+Array\s*\(\s*\d{3,}\s*\)/g;
      const largeArrays = content.match(largeObjectPattern);
      if (largeArrays && largeArrays.length > 0) {
        findings.push({
          id: `large-allocation-${file.path}`,
          type: "LARGE-OBJECT-ALLOCATION",
          severity: "medium",
          score: 50,
          file: file.path,
          line: 1,
          message: "Large object allocation detected",
          description: "Large array allocations can cause memory pressure",
          suggestion: "Consider lazy loading or streaming for large datasets",
          category: "scalability",
        });
      }

    } catch (error) {
      console.warn(`Performance analysis failed for ${file.path}:`, error);
    }

    return findings;
  }
}
