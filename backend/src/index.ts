#!/usr/bin/env node
import { pathToFileURL } from "url";
import { runCli } from "./cli.js";
export { defineConfig } from "./config.js";

const isMain =
  process.argv[1] &&
  pathToFileURL(process.argv[1]).href === import.meta.url;

if (isMain) {
  runCli();
}
