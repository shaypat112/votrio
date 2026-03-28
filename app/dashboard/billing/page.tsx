"use client";

import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Checkbox } from "@/components/ui/checkbox";
import { createClient } from "@/app/lib/supabase";
import { useMemo, useState } from "react";

export default function BillingPage() {
  const supabase = useMemo(() => createClient(), []);
  const [error, setError] = useState<string | null>(null);
  const [loadingCheckout, setLoadingCheckout] = useState(false);
  const [loadingPortal, setLoadingPortal] = useState(false);
  const [confirmPurchase, setConfirmPurchase] = useState(false);

  async function getAccessToken() {
    const { data: sessionData } = await supabase.auth.getSession();
    return sessionData.session?.access_token;
  }

  async function openPortal() {
    setError(null);
    setLoadingPortal(true);
    const accessToken = await getAccessToken();
    if (!accessToken) {
      setError("Please sign in to manage billing.");
      setLoadingPortal(false);
      return;
    }
    const res = await fetch("/api/billing/portal", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ accessToken }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data?.url) {
      setError(data?.error ?? "Unable to open billing portal.");
      setLoadingPortal(false);
      return;
    }
    window.location.href = data.url;
  }

  async function startCheckout() {
    setError(null);
    setLoadingCheckout(true);
    const accessToken = await getAccessToken();
    if (!accessToken) {
      setError("Please sign in to upgrade.");
      setLoadingCheckout(false);
      return;
    }
    const res = await fetch("/api/billing/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ accessToken }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data?.url) {
      setError(data?.error ?? "Unable to start checkout.");
      setLoadingCheckout(false);
      return;
    }
    window.location.href = data.url;
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6 py-10">
      <h1 className="text-3xl font-semibold text-white">Billing</h1>

      {error ? (
        <Alert>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}

      <div className="grid md:grid-cols-2 gap-6">
        <Card className="bg-zinc-950 border-zinc-900">
          <CardHeader>
            <CardTitle>Free</CardTitle>
          </CardHeader>

          <CardContent className="space-y-4">
            <p className="text-zinc-400">Basic scans and manual analysis</p>

            <p className="text-3xl font-bold">$0</p>

            <Button disabled className="w-full">
              Current Plan
            </Button>
          </CardContent>
        </Card>

        <Card className="bg-zinc-950 border-zinc-900">
          <CardHeader>
            <CardTitle>Pro</CardTitle>
          </CardHeader>

          <CardContent className="space-y-4">
            <p className="text-zinc-400">
              AI code review, CI blocking, unlimited scans
            </p>

            <p className="text-3xl font-bold">$20 / month</p>

            <div className="rounded-lg border border-zinc-800 bg-zinc-950/60 p-3">
              <Alert className="border-zinc-800 bg-transparent">
                <AlertTitle>Confirm before purchase</AlertTitle>
                <AlertDescription>
                  You are about to start a paid subscription. Check the box to confirm.
                </AlertDescription>
              </Alert>
              <label className="mt-3 flex items-center gap-2 text-xs text-zinc-400">
                <Checkbox
                  checked={confirmPurchase}
                  onCheckedChange={(value) => setConfirmPurchase(Boolean(value))}
                />
                I understand this will start a paid subscription.
              </label>
            </div>

            <Button
              onClick={startCheckout}
              className="w-full"
              disabled={loadingCheckout || !confirmPurchase}
            >
              {loadingCheckout ? "Starting checkout..." : "Upgrade to Pro"}
            </Button>

            <Button variant="outline" onClick={openPortal} className="w-full" disabled={loadingPortal}>
              {loadingPortal ? "Opening portal..." : "Manage Billing"}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
