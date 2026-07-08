/**
 * Dependency Graph Builder
 * Builds a dependency graph from import/require statements
 */

import fs from "fs/promises";
import type { FileInfo, Dependency, DependencyGraph } from "../core/types.js";

export class DependencyGraphBuilder {
  async build(files: FileInfo[]): Promise<DependencyGraph> {
    const nodes = files.map(f => f.path);
    const edges: Dependency[] = [];

    for (const file of files) {
      const dependencies = await this.extractDependencies(file);
      edges.push(...dependencies);
    }

    return { nodes, edges };
  }

  private async extractDependencies(file: FileInfo): Promise<Dependency[]> {
    try {
      const content = await fs.readFile(file.absolutePath, "utf-8");
      const dependencies: Dependency[] = [];

      // TypeScript/JavaScript imports
      const importRegex = /import\s+.*?\s+from\s+['"]([^'"]+)['"]/g;
      const requireRegex = /require\s*\(\s*['"]([^'"]+)['"]\s*\)/g;

      let match;
      while ((match = importRegex.exec(content)) !== null) {
        dependencies.push({
          from: file.path,
          to: match[1],
          type: "import",
        });
      }

      while ((match = requireRegex.exec(content)) !== null) {
        dependencies.push({
          from: file.path,
          to: match[1],
          type: "require",
        });
      }

      // Python imports
      if (file.language === "python") {
        const pythonImportRegex = /(?:from\s+(\S+)\s+import|import\s+(\S+))/g;
        while ((match = pythonImportRegex.exec(content)) !== null) {
          const module = match[1] || match[2];
          dependencies.push({
            from: file.path,
            to: module,
            type: "import",
          });
        }
      }

      // Go imports
      if (file.language === "go") {
        const goImportRegex = /import\s+(['"])([^'"]+)\1/g;
        while ((match = goImportRegex.exec(content)) !== null) {
          dependencies.push({
            from: file.path,
            to: match[2],
            type: "import",
          });
        }
      }

      // Rust use statements
      if (file.language === "rust") {
        const rustUseRegex = /use\s+([^;]+);/g;
        while ((match = rustUseRegex.exec(content)) !== null) {
          dependencies.push({
            from: file.path,
            to: match[1].trim(),
            type: "import",
          });
        }
      }

      return dependencies;
    } catch (error) {
      console.warn(`Failed to extract dependencies from ${file.path}:`, error);
      return [];
    }
  }
}
