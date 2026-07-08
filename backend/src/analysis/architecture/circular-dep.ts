/**
 * Circular Dependency Detector
 * Detects circular dependencies in the dependency graph
 */

import type { RepositoryContext, Finding, DependencyGraph } from "../../core/types.js";

export class CircularDependencyDetector {
  async detect(context: RepositoryContext): Promise<Finding[]> {
    const findings: Finding[] = [];
    const graph = context.dependencyGraph;

    const cycles = this.findCycles(graph);

    for (const cycle of cycles) {
      findings.push(this.createFinding(cycle));
    }

    return findings;
  }

  private findCycles(graph: DependencyGraph): string[][] {
    const adjacencyList = this.buildAdjacencyList(graph);
    const cycles: string[][] = [];
    const visited = new Set<string>();
    const recursionStack = new Set<string>();
    const path: string[] = [];

    for (const node of graph.nodes) {
      if (!visited.has(node)) {
        this.dfs(node, adjacencyList, visited, recursionStack, path, cycles);
      }
    }

    return cycles;
  }

  private buildAdjacencyList(graph: DependencyGraph): Map<string, string[]> {
    const adjacencyList = new Map<string, string[]>();

    for (const node of graph.nodes) {
      adjacencyList.set(node, []);
    }

    for (const edge of graph.edges) {
      const dependencies = adjacencyList.get(edge.from) || [];
      dependencies.push(edge.to);
      adjacencyList.set(edge.from, dependencies);
    }

    return adjacencyList;
  }

  private dfs(
    node: string,
    adjacencyList: Map<string, string[]>,
    visited: Set<string>,
    recursionStack: Set<string>,
    path: string[],
    cycles: string[][]
  ): void {
    visited.add(node);
    recursionStack.add(node);
    path.push(node);

    const neighbors = adjacencyList.get(node) || [];
    for (const neighbor of neighbors) {
      if (!visited.has(neighbor)) {
        this.dfs(neighbor, adjacencyList, visited, recursionStack, path, cycles);
      } else if (recursionStack.has(neighbor)) {
        // Found a cycle
        const cycleStart = path.indexOf(neighbor);
        const cycle = path.slice(cycleStart).concat(neighbor);
        cycles.push(cycle);
      }
    }

    path.pop();
    recursionStack.delete(node);
  }

  private createFinding(cycle: string[]): Finding {
    return {
      id: `circular-dep-${cycle.join("-")}`,
      type: "CIRCULAR-DEPENDENCY",
      severity: "high",
      score: 70,
      file: cycle[0],
      line: 1,
      message: "Circular dependency detected",
      description: `Dependency cycle: ${cycle.join(" → ")}`,
      suggestion: "Refactor to break the circular dependency by introducing an abstraction layer or using dependency injection",
      category: "architecture",
    };
  }
}
