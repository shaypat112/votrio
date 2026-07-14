/**
 * Abstraction Layer Detector
 * Detects missing or improper abstraction layers
 */

import fs from "fs/promises";
import path from "path";
import type { RepositoryContext, Finding } from "../../core/types.js";

export class AbstractionLayerDetector {
  async detect(context: RepositoryContext): Promise<Finding[]> {
    const findings: Finding[] = [];

    // Detect direct database access in business logic
    const dbAccessIssues = await this.detectDirectDatabaseAccess(context);
    findings.push(...dbAccessIssues);

    // Detect missing service layer
    const missingServiceLayer = this.detectMissingServiceLayer(context);
    if (missingServiceLayer) {
      findings.push(missingServiceLayer);
    }

    // Detect improper layering
    const layeringIssues = this.detectImproperLayering(context);
    findings.push(...layeringIssues);

    return findings;
  }

  private async detectDirectDatabaseAccess(
    context: RepositoryContext,
  ): Promise<Finding[]> {
    const findings: Finding[] = [];

    for (const file of context.files) {
      // Skip files that are likely data access layers
      if (this.isDataAccessFile(file.path)) {
        continue;
      }

      try {
        const content = await fs.readFile(file.absolutePath, "utf-8");

        // Check for direct database queries
        const dbPatterns = [
          /SELECT\s+.*FROM/i,
          /INSERT\s+INTO/i,
          /UPDATE\s+.*SET/i,
          /DELETE\s+FROM/i,
          /db\.query/i,
          /connection\.execute/i,
          /sequelize\.query/i,
          /prisma\./i,
        ];

        for (const pattern of dbPatterns) {
          if (pattern.test(content)) {
            findings.push({
              id: `direct-db-access-${file.path}`,
              type: "DIRECT-DATABASE-ACCESS",
              severity: "high",
              score: 70,
              file: file.path,
              line: 1,
              message: "Direct database access detected in non-data layer",
              description: "Business logic should not directly access database",
              suggestion:
                "Move database operations to a dedicated data access layer",
              category: "architecture",
            });
            break;
          }
        }
      } catch (error) {
        console.warn(
          `Failed to analyze database access in ${file.path}:`,
          error,
        );
      }
    }

    return findings;
  }

  private detectMissingServiceLayer(
    context: RepositoryContext,
  ): Finding | null {
    const hasDataAccess = context.files.some((f) =>
      this.isDataAccessFile(f.path),
    );
    const hasControllers = context.files.some((f) =>
      this.isControllerFile(f.path),
    );
    const hasServices = context.files.some((f) => this.isServiceFile(f.path));

    if (hasDataAccess && hasControllers && !hasServices) {
      const missingServiceLayer = {
        id: "missing-service-layer",
        type: "MISSING-SERVICE-LAYER",
        severity: "medium" as const,
        score: 55,
        file: "project",
        line: 1,
        message: "Missing service layer detected",
        description:
          "Project has data access and controller layers but no service layer",
        suggestion:
          "Consider adding a service layer to separate business logic from data access and presentation",
        category: "architecture" as const,
      };
      return missingServiceLayer;
    }

    return null;
  }

  private detectImproperLayering(context: RepositoryContext): Finding[] {
    const findings: Finding[] = [];

    // Check for controller importing data access directly
    const controllers = context.files.filter((f) =>
      this.isControllerFile(f.path),
    );
    const dataAccessFiles = context.files.filter((f) =>
      this.isDataAccessFile(f.path),
    );

    for (const controller of controllers) {
      for (const dataAccess of dataAccessFiles) {
        // Check if controller directly imports data access
        const importPattern = this.getImportPattern(dataAccess.path);
        if (importPattern) {
          findings.push({
            id: `improper-layering-${controller.path}`,
            type: "IMPROPER-LAYERING",
            severity: "medium",
            score: 50,
            file: controller.path,
            line: 1,
            message: "Controller directly imports data access layer",
            description: `Controller ${controller.path} imports ${dataAccess.path} directly`,
            suggestion:
              "Controllers should only import service layer, not data access layer",
            category: "architecture",
          });
        }
      }
    }

    return findings;
  }

  private isDataAccessFile(filePath: string): boolean {
    const lowerPath = filePath.toLowerCase();
    return (
      lowerPath.includes("repository") ||
      lowerPath.includes("dao") ||
      lowerPath.includes("data") ||
      lowerPath.includes("model") ||
      lowerPath.includes("entity") ||
      lowerPath.includes("db") ||
      lowerPath.includes("database")
    );
  }

  private isControllerFile(filePath: string): boolean {
    const lowerPath = filePath.toLowerCase();
    return (
      lowerPath.includes("controller") ||
      lowerPath.includes("route") ||
      lowerPath.includes("handler") ||
      lowerPath.includes("api")
    );
  }

  private isServiceFile(filePath: string): boolean {
    const lowerPath = filePath.toLowerCase();
    return (
      lowerPath.includes("service") ||
      lowerPath.includes("business") ||
      lowerPath.includes("logic") ||
      lowerPath.includes("domain")
    );
  }

  private getImportPattern(filePath: string): string | null {
    // Simple heuristic to check if a file might import another
    const fileName = path.basename(filePath, path.extname(filePath));
    return fileName;
  }
}
