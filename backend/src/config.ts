import fs from "fs/promises";
import path from "path";
import { pathToFileURL } from "url";
import { createRequire } from "module";

export interface VotrioConfig {
  model?: string;
  traces?: {
    enabled?: boolean;
    minConfidence?: number;
    showFix?: boolean;
  };
  scan?: {
    ignore?: string[];
    autoFix?: boolean;
    ai?: boolean;
    aiModel?: string;
    publish?: boolean;
    rules?: string;
  };
  slop?: {
    enabled?: boolean;
    checkImports?: boolean;
  };
}

export function defineConfig(config: VotrioConfig): VotrioConfig {
  return config;
}

interface LoadedConfig {
  config: VotrioConfig;
  source?: string;
  warnings: string[];
}

const CONFIG_FILES = [
  "votrio.config.mjs",
  "votrio.config.js",
  "votrio.config.cjs",
  "votrio.config.json",
  ".votrio/config.json",
];

const TS_CONFIG = "votrio.config.ts";

export async function loadConfig(cwd: string = process.cwd()): Promise<LoadedConfig> {
  const warnings: string[] = [];

  const found = await firstExisting(cwd, CONFIG_FILES);
  if (!found) {
    const tsPath = path.join(cwd, TS_CONFIG);
    if (await exists(tsPath)) {
      warnings.push(
        `Found ${TS_CONFIG} but it is not loadable at runtime. Rename to votrio.config.mjs or votrio.config.json.`
      );
    }
    return { config: {}, warnings };
  }

  try {
    const config = await importConfig(found);
    return { config: config ?? {}, source: found, warnings };
  } catch (err: any) {
    warnings.push(
      `Failed to load ${path.relative(cwd, found)}: ${err?.message ?? String(err)}`
    );
    return { config: {}, source: found, warnings };
  }
}

async function importConfig(filePath: string): Promise<VotrioConfig | undefined> {
  if (filePath.endsWith(".json")) {
    const raw = await fs.readFile(filePath, "utf8");
    return JSON.parse(raw);
  }

  if (filePath.endsWith(".cjs")) {
    const require = createRequire(import.meta.url);
    const mod = require(filePath);
    return mod?.default ?? mod;
  }

  const mod = await import(pathToFileURL(filePath).href);
  return mod?.default ?? mod;
}

async function firstExisting(cwd: string, files: string[]) {
  for (const file of files) {
    const p = path.join(cwd, file);
    if (await exists(p)) return p;
  }
  return undefined;
}

async function exists(p: string): Promise<boolean> {
  try {
    await fs.access(p);
    return true;
  } catch {
    return false;
  }
}
