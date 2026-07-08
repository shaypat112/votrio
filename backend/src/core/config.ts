/**
 * Configuration Management
 * Handles loading and merging configuration from files and CLI options
 */

import fs from "fs/promises";
import path from "path";
import { defaultConfig } from "./defaults.js";
import type { ScannerConfig, ScanOptions } from "./types.js";

export class ConfigManager {
  private static instance: ConfigManager;
  private config: ScannerConfig;

  private constructor() {
    this.config = defaultConfig;
  }

  static getInstance(): ConfigManager {
    if (!ConfigManager.instance) {
      ConfigManager.instance = new ConfigManager();
    }
    return ConfigManager.instance;
  }

  async loadConfig(configPath?: string): Promise<ScannerConfig> {
    if (configPath) {
      await this.loadFromFile(configPath);
    } else {
      await this.loadFromDefaultLocations();
    }

    return this.config;
  }

  private async loadFromDefaultLocations() {
    const locations = [
      "votrio.config.ts",
      "votrio.config.js",
      ".votrio/config.json",
      ".votrio/config.ts",
    ];

    for (const location of locations) {
      const fullPath = path.join(process.cwd(), location);
      try {
        await fs.access(fullPath);
        await this.loadFromFile(fullPath);
        break;
      } catch {
        // File doesn't exist, try next location
      }
    }
  }

  private async loadFromFile(configPath: string) {
    try {
      const content = await fs.readFile(configPath, "utf-8");

      if (configPath.endsWith(".json")) {
        const userConfig = JSON.parse(content);
        this.config = this.mergeConfig(this.config, userConfig);
      } else {
        // For TypeScript/JavaScript configs, we'd need dynamic import
        // For now, skip this and use default
        console.warn(`TypeScript config loading not yet implemented: ${configPath}`);
      }
    } catch (error) {
      console.warn(`Failed to load config from ${configPath}:`, error);
    }
  }

  mergeConfig(base: ScannerConfig, override: Partial<ScannerConfig>): ScannerConfig {
    return {
      ...base,
      ...override,
      analyzers: {
        ...base.analyzers,
        ...override.analyzers,
      },
      llm: {
        ...base.llm,
        ...override.llm,
      },
      output: {
        ...base.output,
        ...override.output,
      },
    };
  }

  getConfig(): ScannerConfig {
    return this.config;
  }

  updateConfig(updates: Partial<ScannerConfig>): void {
    this.config = this.mergeConfig(this.config, updates);
  }
}

export function createScanOptions(
  cliOptions: any,
  config: ScannerConfig
): ScanOptions {
  return {
    path: cliOptions.path || ".",
    format: cliOptions.format || config.output.format,
    ignore: cliOptions.ignore || [],
    enableAI: cliOptions.ai ?? config.llm.enableExplanation,
    aiModel: cliOptions.aiModel || config.llm.provider.model,
    failOn: cliOptions.failOn || "high",
    ci: cliOptions.ci || false,
    verbose: cliOptions.verbose || false,
  };
}
