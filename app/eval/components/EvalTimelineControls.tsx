"use client";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Pause, Play, SkipBack } from "lucide-react";

export function EvalTimelineControls({
  progress,
  playing,
  currentLabel,
  onProgressChange,
  onPlayToggle,
  onReset,
}: {
  progress: number;
  playing: boolean;
  currentLabel: string;
  onProgressChange: (next: number) => void;
  onPlayToggle: () => void;
  onReset: () => void;
}) {
  return (
    <Card className="border-[color:var(--eval-border)] bg-[color:color-mix(in_oklab,var(--eval-panel)_86%,transparent)] p-4 backdrop-blur">
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-[0.22em] text-[color:var(--eval-accent-strong)]">
              Timeline Layer
            </p>
            <p className="mt-1 text-sm text-[color:var(--eval-text)]">
              {currentLabel}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="icon"
              onClick={onReset}
              aria-label="Reset repository timeline"
              className="border-[color:var(--eval-border)] bg-[color:var(--eval-panel)] text-[color:var(--eval-text)] hover:bg-[color:var(--eval-panel-soft)]"
            >
              <SkipBack className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              variant="outline"
              size="icon"
              onClick={onPlayToggle}
              aria-label={playing ? "Pause repository timeline" : "Play repository timeline"}
              className="border-[color:var(--eval-border)] bg-[color:var(--eval-panel)] text-[color:var(--eval-text)] hover:bg-[color:var(--eval-panel-soft)]"
            >
              {playing ? (
                <Pause className="h-4 w-4" />
              ) : (
                <Play className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>
        <input
          type="range"
          min={0}
          max={1000}
          value={Math.round(progress * 1000)}
          onChange={(event) => onProgressChange(Number(event.target.value) / 1000)}
          aria-label="Repository timeline progress"
          className="h-2 w-full cursor-pointer accent-[color:var(--eval-accent)]"
        />
        <div className="flex items-center justify-between text-[11px] uppercase tracking-[0.18em] text-[color:var(--eval-text-muted)]">
          <span>Cold start</span>
          <span>Dense activity</span>
          <span>Current head</span>
        </div>
      </div>
    </Card>
  );
}
