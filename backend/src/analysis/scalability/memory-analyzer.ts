/**
 * Memory Analyzer
 * Identifies memory-heavy operations and potential leaks
 */

import fs from "fs/promises";
import type { RepositoryContext, Finding } from "../../core/types.js";

export class MemoryAnalyzer {
  async analyze(context: RepositoryContext): Promise<Finding[]> {
    const findings: Finding[] = [];

    for (const file of context.files) {
      const memoryIssues = await this.analyzeFile(file);
      findings.push(...memoryIssues);
    }

    return findings;
  }

  private async analyzeFile(file: any): Promise<Finding[]> {
    const findings: Finding[] = [];

    try {
      const content = await fs.readFile(file.absolutePath, "utf-8");

      // Check for event listener leaks
      const eventListenerPattern = /addEventListener\s*\(/g;
      const eventListeners = content.match(eventListenerPattern);
      const removeListeners = content.match(/removeEventListener\s*\(/g);

      if (eventListeners && (!removeListeners || eventListeners.length > removeListeners.length)) {
        findings.push({
          id: `event-leak-${file.path}`,
          type: "POTENTIAL-EVENT-LISTENER-LEAK",
          severity: "medium",
          score: 55,
          file: file.path,
          line: 1,
          message: "Potential event listener leak",
          description: "More addEventListener calls than removeEventListener",
          suggestion: "Ensure event listeners are properly removed when no longer needed",
          category: "scalability",
        });
      }

      // Check for timer leaks
      const timerPattern = /(?:setInterval|setTimeout)\s*\(/g;
      const timers = content.match(timerPattern);
      const clearTimers = content.match(/(?:clearInterval|clearTimeout)\s*\(/g);

      if (timers && (!clearTimers || timers.length > clearTimers.length)) {
        findings.push({
          id: `timer-leak-${file.path}`,
          type: "POTENTIAL-TIMER-LEAK",
          severity: "medium",
          score: 55,
          file: file.path,
          line: 1,
          message: "Potential timer leak",
          description: "More timer creation than cleanup",
          suggestion: "Ensure timers are properly cleared when no longer needed",
          category: "scalability",
        });
      }

      // Check for large in-memory data structures
      const largeDataPattern = /(?:let|const|var)\s+\w+\s*=\s*(?:new\s+Array\(\)|\[\].*\.fill|new\s+Map\(\)|new\s+Set\()/g;
      const largeData = content.match(largeDataPattern);
      if (largeData && largeData.length > 2) {
        findings.push({
          id: `large-data-structure-${file.path}`,
          type: "LARGE-IN-MEMORY-DATA",
          severity: "medium",
          score: 50,
          file: file.path,
          line: 1,
          message: "Large in-memory data structures detected",
          description: "Multiple large data structure allocations",
          suggestion: "Consider streaming or pagination for large datasets",
          category: "scalability",
        });
      }

      // Check for missing cleanup in async operations
      const asyncPattern = /async\s+function/g;
      const asyncFunctions = content.match(asyncPattern);
      if (asyncFunctions && asyncFunctions.length > 3) {
        const hasFinally = /finally/.test(content);
        const hasCatch = /catch/.test(content);

        if (!hasFinally && !hasCatch) {
          findings.push({
            id: `missing-cleanup-${file.path}`,
            type: "MISSING-ASYNC-CLEANUP",
            severity: "low",
            score: 35,
            file: file.path,
            line: 1,
            message: "Async operations without proper cleanup",
            description: "Async functions without catch/finally blocks",
            suggestion: "Add proper error handling and cleanup in async operations",
            category: "scalability",
          });
        }
      }

      // Check for DOM manipulation in loops
      const domPattern = /(?:querySelector|getElementById|getElementsBy)/g;
      const domOps = content.match(domPattern);
      const loopPattern = /(?:for\s*\(|forEach|while\s*\()/g;
      const loops = content.match(loopPattern);

      if (domOps && loops && domOps.length > 2 && loops.length > 2) {
        findings.push({
          id: `dom-in-loop-${file.path}`,
          type: "DOM-MANIPULATION-IN-LOOP",
          severity: "high",
          score: 70,
          file: file.path,
          line: 1,
          message: "DOM manipulation in loops detected",
          description: "DOM operations inside loops can cause performance issues",
          suggestion: "Batch DOM operations or use document fragments",
          category: "scalability",
        });
      }

      // Check for closure retention
      const closurePattern = /function\s*\([^)]*\)\s*\{[\s\S]{0,500}return\s+function/g;
      const closures = content.match(closurePattern);
      if (closures && closures.length > 3) {
        findings.push({
          id: `closure-retention-${file.path}`,
          type: "POTENTIAL-CLOSURE-RETENTION",
          severity: "low",
          score: 30,
          file: file.path,
          line: 1,
          message: "Potential closure memory retention",
          description: "Multiple nested closures may retain large scopes",
          suggestion: "Be mindful of closure scope and memory retention",
          category: "scalability",
        });
      }

    } catch (error) {
      console.warn(`Memory analysis failed for ${file.path}:`, error);
    }

    return findings;
  }
}
