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
import { Loader2, AlertCircle } from "lucide-react";

type Status = "idle" | "loading" | "success" | "error";

interface FormState {
  repoUrl: string;
  description: string;
  category: string;
}

const INITIAL_FORM: FormState = {
  repoUrl: "",
  description: "",
  category: "scanning",
};

export function FeedBackForm() {
  const [form, setForm] = useState<FormState>(INITIAL_FORM);
  const [status, setStatus] = useState<Status>("idle");
  const [errorMsg, setErrorMsg] = useState("");

  function setField<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
    if (status === "error") setStatus("idle");
  }

  async function handleSubmit() {
    setStatus("loading");
    setErrorMsg("");

    const supabase = createClient();
    const { data: sessionData } = await supabase.auth.getSession();
    const accessToken = sessionData.session?.access_token;

    if (!accessToken) {
      setErrorMsg("Please sign in to send feedback.");
      setStatus("error");
      return;
    }

    const res = await fetch("/api/feedback", {
      method: "POST",
      headers: buildAuthHeaders(accessToken, {
        "Content-Type": "application/json",
      }),
      body: JSON.stringify({
        message: form.repoUrl.trim(),
        details: form.description.trim() || null,
        category: form.category,
      }),
    });

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setErrorMsg(data?.error ?? "Unable to submit feedback.");
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
          <div className="space-y-1">
            <p className="font-semibold text-sm">Feedback submitted</p>
            <p className="text-xs text-muted-foreground max-w-xs">
              Thanks for helping us improve Votrio. Your feedback is ready for review.
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
          Submit feedback
        </CardTitle>
        <CardDescription className="text-xs">
          Tell us what would make repository scanning more useful or reliable.
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="repo-url" className="text-sm">
            Feedback <span className="text-destructive">*</span>
          </Label>
          <div className="relative">
            <Input
              id="repo-url"
              placeholder="What should we improve?"
              value={form.repoUrl}
              onChange={(e) => setField("repoUrl", e.target.value)}
              className="pl-9 font-mono text-sm h-9"
              autoComplete="off"
              minLength={10}
              maxLength={2000}
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="feedback-category">Category</Label>
          <Select value={form.category} onValueChange={(value) => setField("category", value)}>
            <SelectTrigger id="feedback-category"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="scanning">Scanning</SelectItem>
              <SelectItem value="bug">Bug</SelectItem>
              <SelectItem value="feature">Feature request</SelectItem>
              <SelectItem value="other">Other</SelectItem>
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
            placeholder="Steps to reproduce, expected behavior, or any other context."
            value={form.description}
            onChange={(e) => setField("description", e.target.value)}
            rows={3}
            className="text-sm resize-none"
            maxLength={4000}
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
          disabled={form.repoUrl.trim().length < 10 || status === "loading"}
          size="sm"
          className="text-xs min-w-28 gap-1.5"
        >
          {status === "loading" ? (
            <>
              <Loader2 size={13} className="animate-spin" /> Submitting...
            </>
          ) : (
            "Submit feedback"
          )}
        </Button>
      </CardFooter>
    </Card>
  );
}
