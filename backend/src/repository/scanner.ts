/**
 * Repository Scanner
 * Handles file discovery, language detection, and repository context building
 */

import fs from "fs/promises";
import path from "path";
import { glob } from "glob";
import { GitignoreParser } from "./gitignore-parser.js";
import { LanguageDetector } from "./language-detector.js";
import { DependencyGraphBuilder } from "./dependency-graph.js";
import type {
  RepositoryContext,
  FileInfo,
  ScanOptions,
  Language,
} from "../core/types.js";

export class RepositoryScanner {
  private gitignoreParser: GitignoreParser;
  private languageDetector: LanguageDetector;
  private dependencyGraphBuilder: DependencyGraphBuilder;

  constructor() {
    this.gitignoreParser = new GitignoreParser();
    this.languageDetector = new LanguageDetector();
    this.dependencyGraphBuilder = new DependencyGraphBuilder();
  }

  async scan(options: ScanOptions): Promise<RepositoryContext> {
    const root = path.resolve(options.path);

    // Load .gitignore patterns
    const gitignorePatterns = await this.gitignoreParser.parse(root);

    // Combine ignore patterns
    const ignorePatterns = [
      ...gitignorePatterns,
      ...options.ignore,
      "node_modules/**",
      ".git/**",
      "dist/**",
      "build/**",
      ".next/**",
      "coverage/**",
      "**/*.min.js",
      "**/*.min.css",
    ];

    // Discover files
    const files = await this.discoverFiles(root, ignorePatterns);

    // Detect languages
    const languages = this.detectLanguages(files);

    // Build dependency graph
    const dependencyGraph = await this.dependencyGraphBuilder.build(files);

    // Calculate total lines
    const totalLines = files.reduce((sum, file) => sum + file.lines, 0);

    // Detect monorepo
    const isMonorepo = await this.detectMonorepo(root);

    return {
      root,
      files,
      dependencyGraph,
      languages,
      totalLines,
      isMonorepo,
    };
  }

  private async discoverFiles(
    root: string,
    ignorePatterns: string[]
  ): Promise<FileInfo[]> {
    const supportedExtensions = [
      ".ts", ".tsx", ".js", ".jsx",
      ".py", ".go", ".rs", ".java", ".cs", ".php",
      ".json", ".yaml", ".yml", ".toml", ".md"
    ];

    const pattern = `**/*{${supportedExtensions.join(",")}}`;

    const filePaths = await glob(pattern, {
      cwd: root,
      ignore: ignorePatterns,
      absolute: true,
      nodir: true,
    });

    const fileInfos: FileInfo[] = [];

    for (const filePath of filePaths) {
      try {
        const stats = await fs.stat(filePath);
        const content = await fs.readFile(filePath, "utf-8");
        const relativePath = path.relative(root, filePath);
        const language = this.languageDetector.detect(filePath);
        const lines = content.split("\n").length;

        fileInfos.push({
          path: relativePath,
          absolutePath: filePath,
          size: stats.size,
          language,
          lines,
          lastModified: stats.mtime,
        });
      } catch (error) {
        // Skip files that can't be read
        console.warn(`Failed to read file: ${filePath}`);
      }
    }

    return fileInfos;
  }

  private detectLanguages(files: FileInfo[]): Language[] {
    const languageSet = new Set<Language>();

    for (const file of files) {
      if (file.language !== "unknown") {
        languageSet.add(file.language);
      }
    }

    return Array.from(languageSet);
  }

  private async detectMonorepo(root: string): Promise<boolean> {
    // Check for common monorepo indicators
    const monorepoIndicators = [
      "packages",
      "apps",
      "services",
      "lerna.json",
      "nx.json",
      "turbo.json",
      "pnpm-workspace.yaml",
    ];

    for (const indicator of monorepoIndicators) {
      try {
        await fs.access(path.join(root, indicator));
        return true;
      } catch {
        // Indicator doesn't exist
      }
    }

    return false;
  }
}
