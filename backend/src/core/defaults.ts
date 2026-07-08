/**
 * Default configuration for Votrio-Scan
 */

import type { ScannerConfig } from "./types.js";

export const defaultConfig: ScannerConfig = {
  analyzers: {
    aiDetection: {
      enabled: true,
      severityThreshold: "medium",
    },
    architecture: {
      enabled: true,
      severityThreshold: "medium",
    },
    scalability: {
      enabled: true,
      severityThreshold: "medium",
    },
    security: {
      enabled: true,
      severityThreshold: "medium",
    },
    maintainability: {
      enabled: true,
      severityThreshold: "medium",
    },
  },
  llm: {
    provider: {
      name: "openai",
      apiKey: process.env.OPENAI_API_KEY,
      model: "gpt-4",
    },
    enableExplanation: true,
  },
  output: {
    format: "json",
    includeCodeSnippets: true,
    maxFindings: 100,
  },
};
