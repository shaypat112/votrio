"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import type {
  AccessLevel,
  AccessRequestForm,
  DurationOption,
  ResourceOption,
} from "../types";

type RepoOption = {
  id: string;
  full_name: string;
  private: boolean;
};

const resourceOptions: ResourceOption[] = ["Database", "Admin Panel", "API"];
const accessOptions: AccessLevel[] = ["Read", "Write", "Admin"];
const durationOptions: DurationOption[] = [15, 30, 60];

const defaultForm: AccessRequestForm = {
  repoId: "",
  resourceType: "Database",
  accessType: "Read",
  durationMinutes: 30,
  reason: "",
};

export function RequestAccessDialog({
  open,
  onOpenChange,
  onSubmit,
  repos,
  onConnectGitHub,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (values: AccessRequestForm) => Promise<string | null>;
  repos: RepoOption[];
  onConnectGitHub: () => void;
}) {
  const [form, setForm] = useState<AccessRequestForm>(defaultForm);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const resourceName =
    form.resourceType === "Database"
      ? "Production Database"
      : form.resourceType === "Admin Panel"
        ? "Admin Panel"
        : "Staging API";

  const handleSubmit = async () => {
    setSubmitting(true);
    setSubmitError(null);
    const nextError = await onSubmit(form);
    setSubmitting(false);

    if (nextError) {
      setSubmitError(nextError);
      return;
    }

    setForm(defaultForm);
    setSubmitError(null);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Request Access</DialogTitle>
          <DialogDescription>
            Create a temporary access session with an automatic expiration.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">
              Repository
            </label>
            <Select
              value={form.repoId}
              onValueChange={(value) =>
                setForm((prev) => ({
                  ...prev,
                  repoId: value,
                }))
              }
            >
              <SelectTrigger className="h-10 w-full bg-background">
                <SelectValue placeholder="Select a connected repository" />
              </SelectTrigger>
              <SelectContent>
                {repos.map((repo) => (
                  <SelectItem key={repo.id} value={repo.id}>
                    {repo.full_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {repos.length === 0 ? (
              <div className="rounded-xl border border-dashed border-border bg-muted/20 p-3 text-xs text-muted-foreground">
                <p>No repositories connected yet.</p>
                <button
                  type="button"
                  onClick={onConnectGitHub}
                  className="mt-2 font-medium text-foreground underline underline-offset-4"
                >
                  Connect GitHub to load repositories
                </button>
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">
                Pick the repository this sandbox session should be tied to.
              </p>
            )}
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">
              Resource
            </label>
            <Select
              value={form.resourceType}
              onValueChange={(value) =>
                setForm((prev) => ({
                  ...prev,
                  resourceType: value as ResourceOption,
                }))
              }
            >
              <SelectTrigger className="h-10 w-full bg-background">
                <SelectValue placeholder="Select resource" />
              </SelectTrigger>
              <SelectContent>
                {resourceOptions.map((option) => (
                  <SelectItem key={option} value={option}>
                    {option}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {submitError ? (
              <p className="text-xs text-destructive">{submitError}</p>
            ) : null}
            <p className="text-xs text-muted-foreground">{resourceName}</p>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">
              Access Level
            </label>
            <Select
              value={form.accessType}
              onValueChange={(value) =>
                setForm((prev) => ({
                  ...prev,
                  accessType: value as AccessLevel,
                }))
              }
            >
              <SelectTrigger className="h-10 w-full bg-background">
                <SelectValue placeholder="Select access level" />
              </SelectTrigger>
              <SelectContent>
                {accessOptions.map((option) => (
                  <SelectItem key={option} value={option}>
                    {option}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">
              Duration
            </label>
            <Select
              value={String(form.durationMinutes)}
              onValueChange={(value) =>
                setForm((prev) => ({
                  ...prev,
                  durationMinutes: Number(value) as DurationOption,
                }))
              }
            >
              <SelectTrigger className="h-10 w-full bg-background">
                <SelectValue placeholder="Select duration" />
              </SelectTrigger>
              <SelectContent>
                {durationOptions.map((option) => (
                  <SelectItem key={option} value={String(option)}>
                    {option} min
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">
              Reason for access
            </label>
            <Input
              value={form.reason}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, reason: event.target.value }))
              }
              placeholder="Optional reason"
              className="h-10 bg-background"
            />
          </div>

          <div className="rounded-xl border border-border bg-muted/30 p-3 text-sm">
            <p className="font-medium text-foreground">
              {form.accessType} access to {resourceName}
            </p>
            <p className="mt-1 text-muted-foreground">
              Sandbox session with automatic expiration
            </p>
            <p className="mt-1 text-muted-foreground">
              Session duration: {form.durationMinutes} min
            </p>
          </div>
        </div>

        <DialogFooter>
          <DialogClose asChild>
          <Button variant="outline" disabled={submitting}>Cancel</Button>
          </DialogClose>
          <Button
            onClick={() => void handleSubmit()}
            disabled={submitting || repos.length === 0 || !form.repoId}
          >
            {submitting ? "Creating..." : "Request Access"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
