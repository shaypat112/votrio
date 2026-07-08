/**
 * State Analyzer
 * Detects global mutable state and shared state issues
 */

import fs from "fs/promises";
import type { RepositoryContext, Finding } from "../../core/types.js";

export class StateAnalyzer {
  async analyze(context: RepositoryContext): Promise<Finding[]> {
    const findings: Finding[] = [];

    for (const file of context.files) {
      const stateIssues = await this.analyzeFile(file);
      findings.push(...stateIssues);
    }

    return findings;
  }

  private async analyzeFile(file: any): Promise<Finding[]> {
    const findings: Finding[] = [];

    try {
      const content = await fs.readFile(file.absolutePath, "utf-8");

      // Check for global variables
      const globalVarPattern = /(?:global|window|process)\.\w+\s*=/g;
      const globalVars = content.match(globalVarPattern);
      if (globalVars && globalVars.length > 0) {
        findings.push({
          id: `global-state-${file.path}`,
          type: "GLOBAL-MUTABLE-STATE",
          severity: "high",
          score: 70,
          file: file.path,
          line: 1,
          message: "Global mutable state detected",
          description: `Found ${globalVars.length} instances of global variable assignment`,
          suggestion: "Avoid global mutable state. Use dependency injection or state management libraries",
          category: "scalability",
        });
      }

      // Check for singleton patterns that might cause issues
      const singletonPattern = /static\s+instance\s*=/g;
      const singletons = content.match(singletonPattern);
      if (singletons && singletons.length > 0) {
        findings.push({
          id: `singleton-pattern-${file.path}`,
          type: "SINGLETON-PATTERN",
          severity: "medium",
          score: 50,
          file: file.path,
          line: 1,
          message: "Singleton pattern detected",
          description: "Singletons can cause issues with testing and parallel execution",
          suggestion: "Consider using dependency injection instead of singletons",
          category: "scalability",
        });
      }

      // Check for module-level state
      const moduleStatePattern = /^(let|var|const)\s+\w+\s*=\s*\{/gm;
      const moduleState = content.match(moduleStatePattern);
      if (moduleState && moduleState.length > 2) {
        findings.push({
          id: `module-state-${file.path}`,
          type: "MODULE-LEVEL-STATE",
          severity: "medium",
          score: 55,
          file: file.path,
          line: 1,
          message: "Module-level state detected",
          description: "Module-level state can cause issues with hot reloading and testing",
          suggestion: "Move state to class instances or use proper state management",
          category: "scalability",
        });
      }

      // Check for shared mutable objects
      const sharedObjectPattern = /export\s+(?:const|let|var)\s+\w+\s*=\s*\{/g;
      const sharedObjects = content.match(sharedObjectPattern);
      if (sharedObjects && sharedObjects.length > 0) {
        findings.push({
          id: `shared-object-${file.path}`,
          type: "SHARED-MUTABLE-OBJECT",
          severity: "medium",
          score: 45,
          file: file.path,
          line: 1,
          message: "Shared mutable object detected",
          description: "Exported mutable objects can be modified by other modules",
          suggestion: "Use frozen objects or provide accessor methods",
          category: "scalability",
        });
      }

    } catch (error) {
      console.warn(`State analysis failed for ${file.path}:`, error);
    }

    return findings;
  }
}
