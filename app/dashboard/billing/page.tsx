"use client";

import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export async function openPortal() {
  const res = await fetch("/api/billing/portal", { method: "POST" });
  const data = await res.json();
  window.location.href = data.url;
}

export default function BillingPage() {
  async function startCheckout() {
    const res = await fetch("/api/billing/checkout", { method: "POST" });
    const data = await res.json();
    window.location.href = data.url;
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6 py-10">
      <h1 className="text-3xl font-semibold text-white">Billing</h1>

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

            <Button onClick={startCheckout} className="w-full">
              Upgrade to Pro
            </Button>

            <Button variant="outline" onClick={openPortal} className="w-full">
              Manage Billing
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
