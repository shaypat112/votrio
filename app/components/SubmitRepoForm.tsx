"use client";

import { useState } from "react";
import { createClient } from "../lib/supabase";
import { buildAuthHeaders } from "@/app/lib/http";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import {
  CheckCircle2,
  Github,
  Loader2,
  AlertCircle,
  Shield,
} from "lucide-react";

type Status = "idle" | "loading" | "success" | "error";

interface FormState {
  repoUrl: string;
  description: string;
  scanType: string;
}

const INITIAL_FORM: FormState = {
  repoUrl: "",
  description: "",
  scanType: "full",
};

const SCAN_TYPES = [
  {
    value: "full",
    label: "Full scan",
    description: "Security, secrets, and slop detection",
  },
  {
    value: "security",
    label: "Security only",
    description: "Vulnerabilities and CVEs",
  },
  {
    value: "secrets",
    label: "Secrets only",
    description: "Leaked keys and credentials",
  },
];

function validateGitHubUrl(url: string): string | null {
  if (!url.trim()) return "Repository URL is required.";
  const pattern = /^https:\/\/github\.com\/[\w.-]+\/[\w.-]+(\/)?$/;
  if (!pattern.test(url.trim()))
    return "Must be a valid GitHub URL — https://github.com/owner/repo";
  return null;
}

export function SubmitRepoForm() {
  const [form, setForm] = useState<FormState>(INITIAL_FORM);
  const [status, setStatus] = useState<Status>("idle");
  const [errorMsg, setErrorMsg] = useState("");

  function setField<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
    if (status === "error") setStatus("idle");
  }

  async function handleSubmit() {
    const validationError = validateGitHubUrl(form.repoUrl);
    if (validationError) {
      setErrorMsg(validationError);
      setStatus("error");
      return;
    }

    setStatus("loading");
    setErrorMsg("");

    const supabase = createClient();
    const { data: sessionData } = await supabase.auth.getSession();
    const accessToken = sessionData.session?.access_token;

    if (!accessToken) {
      setErrorMsg("Please sign in to submit a repository.");
      setStatus("error");
      return;
    }

    const res = await fetch("/api/repositories/submit", {
      method: "POST",
      headers: buildAuthHeaders(accessToken, { "Content-Type": "application/json" }),
      body: JSON.stringify({
        repoUrl: form.repoUrl.trim(),
        description: form.description.trim() || null,
        scanType: form.scanType,
      }),
    });

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setErrorMsg(data?.error ?? "Unable to submit repository.");
      setStatus("error");
      return;
    }

    setStatus("success");
  }

  function handleReset() {
    setForm(INITIAL_FORM);
    setStatus("idle");
    setErrorMsg("");
  }

  if (status === "success") {
    return (
      <Card>
        <CardContent className="py-12 flex flex-col items-center gap-4 text-center">
          <div className="w-12 h-12 rounded-full bg-green-500/10 border border-green-500/20 flex items-center justify-center">
            <CheckCircle2 size={22} className="text-green-500" />
          </div>
          <div className="space-y-1">
            <p className="font-semibold text-sm">Repo queued for scan</p>
            <p className="text-xs text-muted-foreground max-w-xs">
              We'll run the scan and notify you when results are ready — usually
              under 2 minutes.
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="text-xs mt-1"
            onClick={handleReset}
          >
            Submit another
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-semibold flex items-center gap-2">
          <Shield size={15} /> Repository details
        </CardTitle>
        <CardDescription className="text-xs">
          Public repos work instantly. Private repos require GitHub OAuth.
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="repo-url" className="text-sm">
            GitHub URL <span className="text-destructive">*</span>
          </Label>
          <div className="relative">
            <Github
              size={14}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none"
            />
            <Input
              id="repo-url"
              placeholder="https://github.com/owner/repository"
              value={form.repoUrl}
              onChange={(e) => setField("repoUrl", e.target.value)}
              className="pl-9 font-mono text-sm h-9"
              autoComplete="off"
              spellCheck={false}
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <Label className="text-sm">Scan type</Label>
          <Select
            value={form.scanType}
            onValueChange={(v) => setField("scanType", v)}
          >
            <SelectTrigger className="h-9 text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {SCAN_TYPES.map((t) => (
                <SelectItem key={t.value} value={t.value} className="text-sm">
                  <span className="font-medium">{t.label}</span>
                  <span className="text-muted-foreground ml-2 text-xs">
                    — {t.description}
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <Separator />

        <div className="space-y-1.5">
          <Label htmlFor="description" className="text-sm">
            Notes{" "}
            <span className="text-muted-foreground font-normal text-xs">
              optional
            </span>
          </Label>
          <Textarea
            id="description"
            placeholder="Anything specific to check — e.g. focus on /api, recently added auth code, etc."
            value={form.description}
            onChange={(e) => setField("description", e.target.value)}
            rows={3}
            className="text-sm resize-none"
          />
        </div>

        {status === "error" && (
          <Alert variant="destructive" className="py-2.5">
            <AlertCircle size={14} className="shrink-0" />
            <AlertDescription className="text-xs">{errorMsg}</AlertDescription>
          </Alert>
        )}
      </CardContent>

      <CardFooter className="flex items-center justify-between gap-3 pt-2">
        <Button
          onClick={handleSubmit}
          disabled={!form.repoUrl.trim() || status === "loading"}
          size="sm"
          className="text-xs min-w-28 gap-1.5"
        >
          {status === "loading" ? (
            <>
              <Loader2 size={13} className="animate-spin" /> Submitting...
            </>
          ) : (
            "Submit repo"
          )}
        </Button>
      </CardFooter>
    </Card>
  );
}
