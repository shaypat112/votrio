"use client";

import React from "react";
import { useTeam } from "./TeamProvider";
import Link from "next/link";

export default function TeamBanner() {
  const { selectedTeam, loading } = useTeam();

  if (loading) return null;
  if (!selectedTeam) return null;

  return (
    <div className="mb-4 rounded-md border border-border bg-muted/10 px-4 py-2 text-sm text-foreground">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="rounded-md bg-accent px-2 py-0.5 text-xs font-medium text-accent-foreground">
            Team
          </div>
          <div className="font-medium">{selectedTeam.name}</div>
        </div>
        <div>
          <Link
            href="/settings?section=teams"
            className="text-xs text-muted-foreground hover:underline"
          >
            Manage teams
          </Link>
        </div>
      </div>
    </div>
  );
}
