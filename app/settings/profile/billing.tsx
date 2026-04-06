"use client";

import { useEffect, useMemo, useState } from "react";
import { buildAuthHeaders } from "@/app/lib/http";
import StripeBuyButton from "@/app/components/StripeBuyButton";
import { useSettings } from "./context";
import { GhostButton, SectionCard } from "./primitives";

type BillingSummary = {
  configured: boolean;
  customer: { stripeCustomerId: string } | null;
  subscription: {
    status: string;
    priceId: string | null;
    planName: string;
    currentPeriodEnd: string | null;
  } | null;
  invoices: Array<{
    id: string;
    month: string;
    amount: number;
    status: string;
  }>;
};

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(amount);
}

export function BillingSection() {
  const { accessToken, setError } = useSettings();
  const [summary, setSummary] = useState<BillingSummary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    const load = async () => {
      if (!accessToken) {
        setLoading(false);
        return;
      }

      const res = await fetch("/api/billing/summary", {
        headers: buildAuthHeaders(accessToken),
      });
      const data = await res.json().catch(() => null);

      if (!mounted) return;

      if (!res.ok) {
        setError(data?.error ?? "Unable to load billing summary.");
        setLoading(false);
        return;
      }

      setSummary(data as BillingSummary);
      setLoading(false);
    };

    void load();

    return () => {
      mounted = false;
    };
  }, [accessToken, setError]);

  const openBillingPortal = async () => {
    if (!accessToken) return;
    setError(null);

    const res = await fetch("/api/billing/portal", {
      method: "POST",
      headers: buildAuthHeaders(accessToken, { "Content-Type": "application/json" }),
    });

    if (res.ok) {
      const data = await res.json();
      window.location.href = data.url;
      return;
    }

    const data = await res.json().catch(() => ({}));
    setError(data?.error ?? "Unable to open billing portal.");
  };

  const invoiceStats = useMemo(() => {
    const invoices = summary?.invoices ?? [];
    const total = invoices.reduce((sum, invoice) => sum + invoice.amount, 0);
    const max = Math.max(...invoices.map((invoice) => invoice.amount), 0);
    const latest = invoices.at(-1)?.amount ?? 0;
    return { total, max, latest };
  }, [summary]);

  return (
    <SectionCard
      title="Billing"
      description="Manage your subscription, checkout flow, and recent billing activity."
    >
      {loading ? (
        <p className="text-sm text-muted-foreground">Loading billing overview...</p>
      ) : !summary?.configured ? (
        <p className="text-sm text-muted-foreground">
          Stripe is not configured for this environment yet.
        </p>
      ) : (
        <div className="space-y-6">
          <div className="grid gap-4 md:grid-cols-3">
            <div className="rounded-2xl border border-border bg-background p-4">
              <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                Active plan
              </p>
              <p className="mt-3 text-2xl font-semibold text-foreground">
                {summary.subscription?.planName ?? "Starter"}
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                Status: {summary.subscription?.status ?? "inactive"}
              </p>
            </div>
            <div className="rounded-2xl border border-border bg-background p-4">
              <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                Latest charge
              </p>
              <p className="mt-3 text-2xl font-semibold text-foreground">
                {formatCurrency(invoiceStats.latest)}
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                Based on the most recent invoice
              </p>
            </div>
            <div className="rounded-2xl border border-border bg-background p-4">
              <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                Renewal
              </p>
              <p className="mt-3 text-2xl font-semibold text-foreground">
                {summary.subscription?.currentPeriodEnd
                  ? new Date(summary.subscription.currentPeriodEnd).toLocaleDateString()
                  : "Not scheduled"}
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                Next subscription boundary
              </p>
            </div>
          </div>

          <div className="rounded-2xl border border-border bg-background p-5">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-sm font-semibold text-foreground">
                  Billing trend
                </p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Recent invoice amounts across your last six billing events.
                </p>
              </div>
              <p className="text-sm text-muted-foreground">
                Total: {formatCurrency(invoiceStats.total)}
              </p>
            </div>

            <div className="mt-5 flex items-end gap-3">
              {(summary.invoices.length > 0
                ? summary.invoices
                : [
                    { id: "empty-1", month: "Jan", amount: 0, status: "none" },
                    { id: "empty-2", month: "Feb", amount: 0, status: "none" },
                    { id: "empty-3", month: "Mar", amount: 0, status: "none" },
                  ]).map((invoice) => {
                const height =
                  invoiceStats.max > 0
                    ? Math.max(16, Math.round((invoice.amount / invoiceStats.max) * 140))
                    : 16;

                return (
                  <div key={invoice.id} className="flex flex-1 flex-col items-center gap-2">
                    <div
                      className="w-full rounded-t-xl bg-[linear-gradient(180deg,#f59e0b_0%,#f97316_100%)]"
                      style={{ height }}
                    />
                    <div className="text-center">
                      <p className="text-xs font-medium text-foreground">{invoice.month}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatCurrency(invoice.amount)}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
            <div className="rounded-2xl border border-border bg-background p-5">
              <p className="text-sm font-semibold text-foreground">Manage billing</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Open the Stripe portal to update payment methods, download invoices,
                or switch your subscription.
              </p>
              <GhostButton onClick={openBillingPortal} className="mt-4">
                Open billing portal
              </GhostButton>
            </div>

            <div className="rounded-2xl border border-border bg-background p-5">
              <p className="text-sm font-semibold text-foreground">Purchase a plan</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Use the hosted Stripe checkout button to start or upgrade your plan.
              </p>
              <div className="mt-4 overflow-hidden rounded-xl border border-border bg-card p-4">
                <StripeBuyButton
                  buyButtonId="buy_btn_1THOTu2VC9y0vPGPsXBw9w8c"
                  publishableKey="pk_test_51TFxCe2VC9y0vPGPTQuhNVNg3R470rNNC4uDkIt7Cq5fUhknqHYLejX6ZNI2yaMseGqgwQFN96Iz9RkqaVfgyytO00bOAHVE3b"
                />
              </div>
            </div>
          </div>
        </div>
      )}
    </SectionCard>
  );
}
