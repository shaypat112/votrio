# Votrio CLI

> AI-powered terminal trace analyzer, security scanner, and code quality tool with real machine learning

## Features

- **Live trace analysis** — wraps any process and explains stack traces in real time using Claude AI
- **Machine Learning Security Scanning** — uses Python/scikit-learn for real vulnerability detection and code analysis
- **Real AI Code Review** — no mock data, actual ML-powered analysis of your codebase
- **Git-aware** — knows which commit introduced the error
- **Zero egress** — your code never leaves your machine (AI calls go directly to Anthropic's API using your own key)
- **Works with any stack** — Node.js, Python, Go, Rust, and more

## Quick Start

```bash
# Install globally
npm install -g votrio

# Initialize in your project
votrio init

# Setup Python ML dependencies (optional but recommended)
cd backend && bash setup_python.sh

# Wrap your start command
votrio run "npm start"

# Scan for security issues
votrio scan

# Scan with AI-powered analysis
votrio scan --ai
```

## Commands

| Command              | Description                                   |
| -------------------- | --------------------------------------------- |
| `votrio init`        | Initialize votrio in the current project      |
| `votrio run "<cmd>"` | Wrap a process and analyze its output         |
| `votrio scan [path]` | Scan a directory for security vulnerabilities |
| `votrio scan --ai`   | Scan with ML-powered AI analysis               |
| `votrio auth`        | Configure your Anthropic API key              |

## AI/ML Setup

For advanced AI code review capabilities, set up the Python ML service:

```bash
# Install Python dependencies
cd backend
bash setup_python.sh

# This installs:
# - scikit-learn for machine learning
# - numpy for numerical operations
# - scipy for scientific computing
```

The AI service includes:
- **Real vulnerability detection** using pattern matching and ML anomaly detection
- **Code quality analysis** with complexity metrics and technical debt assessment
- **Architecture analysis** using clustering algorithms
- **Security scoring** based on actual code analysis

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
    ai: true, // Enable AI-powered scanning
    aiModel: "mistral-large-latest",
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

## Scan publish to Supabase

To write scan summaries to the `scan_history` table, set these environment variables:

```bash
export SUPABASE_URL="https://<your-project>.supabase.co"
export SUPABASE_ANON_KEY="<anon-key>"
export SUPABASE_ACCESS_TOKEN="<user-access-token>"
```

Then run:

```bash
votrio scan --publish
```

Notes:
- `SUPABASE_ACCESS_TOKEN` must be a **user session JWT** so RLS can write to `scan_history`.
- The CLI uses the current folder name as the repo value.

## License

MIT © Votrio, Inc.
