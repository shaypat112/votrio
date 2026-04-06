"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { commandCatalog, type EvalCommandId } from "../lib/types";

export function EvalTerminalPanel({
  lines,
  disabled,
  onRunCommand,
}: {
  lines: string[];
  disabled: boolean;
  onRunCommand: (commandId: EvalCommandId) => void;
}) {
  return (
    <Card className="border-border bg-card">
      <CardHeader>
        <CardTitle className="text-lg">Agent Terminal</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="rounded-2xl border border-border bg-[#05070d] p-4 font-mono text-sm text-[#9ef7c9]">
          <div className="space-y-2">
            {lines.map((line, index) => (
              <p key={`${line}-${index}`} className="break-words">
                {line}
              </p>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          {commandCatalog.map((command) => (
            <button
              key={command.id}
              onClick={() => onRunCommand(command.id)}
              disabled={disabled}
              className="w-full rounded-2xl border border-border bg-background p-4 text-left transition hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50"
            >
              <p className="font-mono text-sm font-semibold text-foreground">
                {command.label}
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                {command.description}
              </p>
            </button>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
