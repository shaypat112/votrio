/**
 * Coupling Analyzer
 * Analyzes coupling between modules and identifies tight coupling issues
 */

import type { RepositoryContext, Finding, DependencyGraph } from "../../core/types.js";

export class CouplingAnalyzer {
  private readonly HIGH_COUPLING_THRESHOLD = 10;

  async analyze(context: RepositoryContext): Promise<Finding[]> {
    const findings: Finding[] = [];
    const graph = context.dependencyGraph;

    // Calculate coupling metrics
    const couplingMetrics = this.calculateCoupling(graph);

    // Identify highly coupled modules
    for (const [module, metrics] of Object.entries(couplingMetrics)) {
      if (metrics.outgoingDependencies > this.HIGH_COUPLING_THRESHOLD) {
        findings.push(this.createOutgoingCouplingFinding(module, metrics));
      }

      if (metrics.incomingDependencies > this.HIGH_COUPLING_THRESHOLD) {
        findings.push(this.createIncomingCouplingFinding(module, metrics));
      }
    }

    // Identify bidirectional coupling
    const bidirectional = this.findBidirectionalCoupling(graph);
    for (const [from, to] of bidirectional) {
      findings.push(this.createBidirectionalFinding(from, to));
    }

    return findings;
  }

  private calculateCoupling(graph: DependencyGraph): Record<string, {
    outgoingDependencies: number;
    incomingDependencies: number;
  }> {
    const metrics: Record<string, {
      outgoingDependencies: number;
      incomingDependencies: number;
    }> = {};

    // Initialize metrics
    for (const node of graph.nodes) {
      metrics[node] = {
        outgoingDependencies: 0,
        incomingDependencies: 0,
      };
    }

    // Calculate dependencies
    for (const edge of graph.edges) {
      if (metrics[edge.from]) {
        metrics[edge.from].outgoingDependencies++;
      }
      if (metrics[edge.to]) {
        metrics[edge.to].incomingDependencies++;
      }
    }

    return metrics;
  }

  private findBidirectionalCoupling(graph: DependencyGraph): [string, string][] {
    const bidirectional: [string, string][] = [];
    const edgeSet = new Set<string>();

    for (const edge of graph.edges) {
      const forwardKey = `${edge.from}->${edge.to}`;
      const reverseKey = `${edge.to}->${edge.from}`;

      if (edgeSet.has(reverseKey)) {
        bidirectional.push([edge.from, edge.to]);
      }

      edgeSet.add(forwardKey);
    }

    return bidirectional;
  }

  private createOutgoingCouplingFinding(module: string, metrics: any): Finding {
    return {
      id: `high-outgoing-coupling-${module}`,
      type: "HIGH-OUTGOING-COUPLING",
      severity: "medium",
      score: 50,
      file: module,
      line: 1,
      message: "Module has high outgoing coupling",
      description: `Module depends on ${metrics.outgoingDependencies} other modules`,
      suggestion: "Consider refactoring to reduce dependencies or introduce facade pattern",
      category: "architecture",
    };
  }

  private createIncomingCouplingFinding(module: string, metrics: any): Finding {
    return {
      id: `high-incoming-coupling-${module}`,
      type: "HIGH-INCOMING-COUPLING",
      severity: "medium",
      score: 50,
      file: module,
      line: 1,
      message: "Module has high incoming coupling",
      description: `${metrics.incomingDependencies} modules depend on this module`,
      suggestion: "Consider this module might be doing too much - review for separation of concerns",
      category: "architecture",
    };
  }

  private createBidirectionalFinding(from: string, to: string): Finding {
    return {
      id: `bidirectional-coupling-${from}-${to}`,
      type: "BIDIRECTIONAL-COUPLING",
      severity: "high",
      score: 65,
      file: from,
      line: 1,
      message: "Bidirectional coupling detected",
      description: `Modules ${from} and ${to} depend on each other`,
      suggestion: "Refactor to break bidirectional dependency using dependency inversion principle",
      category: "architecture",
    };
  }
}
