# votrio

> AI-powered terminal trace analysis, security scanning, and code quality for developers who ship fast.

```bash
npm install -g votrio
```

## Features

- **Live trace analysis** — wraps any process and explains stack traces in real time using Claude AI
- **Security scanning** — detects hardcoded secrets, XSS, SQLi, eval injection, and more
- **Git-aware** — knows which commit introduced the error
- **Zero egress** — your code never leaves your machine (AI calls go directly to Anthropic's API using your own key)
- **Works with any stack** — Node.js, Python, Go, Rust, and more

## Quick Start

```bash
# Install
npm install -g votrio

# Initialize in your project
votrio init

# Wrap your start command
votrio run "npm start"

# Scan for security issues
votrio scan
```

## Commands

| Command              | Description                                   |
| -------------------- | --------------------------------------------- |
| `votrio init`        | Initialize votrio in the current project      |
| `votrio run "<cmd>"` | Wrap a process and analyze its output         |
| `votrio scan [path]` | Scan a directory for security vulnerabilities |
| `votrio auth`        | Configure your Anthropic API key              |

## Configuration

After running `votrio init`, a `votrio.config.ts` file is created:

```ts
import { defineConfig } from "votrio";

export default defineConfig({
  model: "claude-sonnet-4-20250514",
  traces: {
    enabled: true,
    minConfidence: 70,
    showFix: true,
  },
  scan: {
    ignore: ["node_modules/**", "dist/**"],
    autoFix: false,
  },
});
```

## Authentication

Votrio uses the Anthropic API for AI features. Set your key via:

```bash
votrio auth
# or
export ANTHROPIC_API_KEY=sk-ant-...
```

Your key is stored locally and never sent to Votrio's servers.

## License

MIT © Votrio, Inc.
