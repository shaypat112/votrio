"use client";

import { useMemo, useState } from "react";

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

const resourceOptions: ResourceOption[] = ["Database", "Admin Panel", "API"];
const accessOptions: AccessLevel[] = ["Read", "Write", "Admin"];
const durationOptions: DurationOption[] = [15, 30, 60];

const defaultForm: AccessRequestForm = {
  resourceType: "Database",
  accessType: "Read",
  durationMinutes: 30,
  reason: "",
};

export function RequestAccessDialog({
  open,
  onOpenChange,
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (values: AccessRequestForm) => void;
}) {
  const [form, setForm] = useState<AccessRequestForm>(defaultForm);

  const resourceName = useMemo(() => {
    switch (form.resourceType) {
      case "Database":
        return "Production Database";
      case "Admin Panel":
        return "Admin Panel";
      case "API":
        return "Staging API";
    }
  }, [form.resourceType]);

  const handleSubmit = () => {
    onSubmit(form);
    setForm(defaultForm);
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
            <label className="text-sm font-medium text-foreground">Resource</label>
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
            <label className="text-sm font-medium text-foreground">Duration</label>
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
              Session duration: {form.durationMinutes} min
            </p>
          </div>
        </div>

        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline">Cancel</Button>
          </DialogClose>
          <Button onClick={handleSubmit}>Request Access</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
