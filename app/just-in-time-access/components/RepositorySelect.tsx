"use client";

import { useEffect, useState } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export default function RepositorySelect({
  accessToken,
  value,
  onChange,
}: {
  accessToken?: string | null;
  value?: string | null;
  onChange: (id: string | null) => void;
}) {
  const [repos, setRepos] = useState<
    Array<{ id: string; name: string; repo_url: string }>
  >([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!accessToken) return;
    let mounted = true;
    setLoading(true);
    fetch(
      `/api/repositories/mine?accessToken=${encodeURIComponent(accessToken)}`,
    )
      .then((res) => (res.ok ? res.json() : Promise.reject(res)))
      .then((data) => {
        if (!mounted) return;
        setRepos(
          (data?.repos ?? []).map((r: any) => ({
            id: r.id,
            name: r.name || r.repo_url,
            repo_url: r.repo_url,
          })),
        );
      })
      .catch(() => {
        if (!mounted) return;
        setRepos([]);
      })
      .finally(() => mounted && setLoading(false));

    return () => {
      mounted = false;
    };
  }, [accessToken]);

  return (
    <div>
      <label className="text-sm font-medium text-foreground">
        Repository (optional)
      </label>
      {/* Use a non-empty sentinel for the "none" option because Select.Item
          requires a non-empty value. Map the sentinel back to null for callers. */}
      <Select
        value={value ?? "__none"}
        onValueChange={(v) => onChange(v === "__none" ? null : v)}
      >
        <SelectTrigger className="h-10 w-full bg-background">
          <SelectValue
            placeholder={
              loading
                ? "Loading repositories..."
                : "Select repository (optional)"
            }
          />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="__none">None</SelectItem>
          {repos.map((repo) => (
            <SelectItem key={repo.id} value={repo.id}>
              {repo.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <p className="mt-1 text-xs text-muted-foreground">
        Optional: tie this access request to one of your repositories.
      </p>
    </div>
  );
}
