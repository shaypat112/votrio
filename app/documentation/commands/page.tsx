import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function CommandsPage() {
  return (
    <div className="max-w-4xl">
      <h2 className="text-2xl font-semibold mb-4 text-foreground">
        Votrio CLI
      </h2>

      <Card className="mb-4">
        <CardHeader>
          <CardTitle>init</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-zinc-400">
            Initialize votrio in the current project.
          </p>
          <div className="mt-2">
            <div className="rounded bg-muted px-3 py-2 font-mono text-sm">
              votrio init
            </div>
          </div>
          <p className="mt-2 text-xs text-zinc-500">
            Options: <code>--skip-gitignore</code>
          </p>
        </CardContent>
      </Card>

      <Card className="mb-4">
        <CardHeader>
          <CardTitle>run</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-zinc-400">
            Wrap a process and analyze its output.
          </p>
          <div className="mt-2">
            <div className="rounded bg-muted px-3 py-2 font-mono text-sm">
              votrio run "npm start"
            </div>
          </div>
          <p className="mt-2 text-xs text-zinc-500">
            Options: <code>--no-ai</code>, <code>--model &lt;model&gt;</code>{" "}
            (default: <code>claude-sonnet-4-20250514</code>),{" "}
            <code>--verbose</code>
          </p>
        </CardContent>
      </Card>

      <Card className="mb-4">
        <CardHeader>
          <CardTitle>scan</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-zinc-400">
            Scan a directory for security vulnerabilities (default:{" "}
            <code>.</code>).
          </p>
          <div className="mt-2">
            <div className="rounded bg-muted px-3 py-2 font-mono text-sm">
              votrio scan [path]
            </div>
          </div>
          <ul className="mt-2 text-xs text-zinc-500 space-y-1 list-disc pl-5">
            <li>
              <code>--fix</code> — auto-apply safe patches where possible
            </li>
            <li>
              <code>--ci</code> — exit with code 1 if issues found (CI)
            </li>
            <li>
              <code>--fail-on &lt;severity&gt;</code> — fail on:{" "}
              <code>low</code> | <code>medium</code> | <code>high</code> |{" "}
              <code>critical</code> (default: <code>high</code>)
            </li>
            <li>
              <code>--format &lt;fmt&gt;</code> — output format:{" "}
              <code>text</code> | <code>json</code> | <code>markdown</code> |{" "}
              <code>sarif</code> (default: <code>text</code>)
            </li>
            <li>
              <code>--ignore &lt;patterns...&gt;</code> — glob patterns to
              ignore
            </li>
            <li>
              <code>--rules &lt;path&gt;</code> — path to custom rules JSON
              (default: <code>.votrio/rules.json</code>)
            </li>
            <li>
              <code>--watch</code> — daemon mode: rescan on file changes
            </li>
            <li>
              <code>--publish</code> — publish scan summary to Supabase{" "}
              <code>scan_history</code>
            </li>
            <li>
              <code>--ai</code> — enable AI refactoring suggestions via Mistral
            </li>
            <li>
              <code>--ai-model &lt;model&gt;</code> — Mistral model name
              (default: <code>mistral-large-latest</code>)
            </li>
          </ul>
        </CardContent>
      </Card>

      <Card className="mb-4">
        <CardHeader>
          <CardTitle>auth</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-zinc-400">
            Configure your Anthropic API key.
          </p>
          <div className="mt-2">
            <div className="rounded bg-muted px-3 py-2 font-mono text-sm">
              votrio auth
            </div>
          </div>
          <p className="mt-2 text-xs text-zinc-500">
            Options: <code>--clear</code> to remove stored credentials.
          </p>
        </CardContent>
      </Card>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Notes</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-zinc-400">
            To publish scans to Supabase you must set environment variables and
            provide a user session token (see backend/README.md).
          </p>
          <div className="mt-2 space-y-2">
            <div className="rounded bg-muted px-3 py-2 font-mono text-sm">
              export SUPABASE_URL="https://&lt;your-project&gt;.supabase.co"
            </div>
            <div className="rounded bg-muted px-3 py-2 font-mono text-sm">
              export SUPABASE_ACCESS_TOKEN="&lt;user-session-jwt&gt;"
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
