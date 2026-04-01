"use client";

import { useSettings } from "./context";
import { SectionCard } from "./primitives";
import { cn } from "@/app/lib/utils";
import StripeBuyButton from "@/app/components/StripeBuyButton";

export function PlanSection() {
  const { accessToken, setError } = useSettings();

  const openBillingPortal = async () => {
    if (!accessToken) return;
    setError(null);

    const res = await fetch("/api/billing/portal", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ accessToken }),
    });

    if (res.ok) {
      const data = await res.json();
      window.location.href = data.url;
    } else {
      const data = await res.json().catch(() => ({}));
      setError(data?.error ?? "Unable to open billing portal.");
    }
  };

  return (
    <SectionCard title="Plan" description="Your current subscription.">
      <div className="rounded-lg border border-white/[0.07] bg-gradient-to-br from-white/[0.04] to-transparent p-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <p className="text-base font-semibold text-white">Pro trial</p>
              <span className="rounded-full border border-emerald-900/50 bg-emerald-950/30 px-2 py-0.5 text-xs font-medium text-emerald-400">
                Active
              </span>
            </div>
            <p className="mt-1 text-sm text-zinc-500">
              Unlimited scans · AI refactors · CI/CD gating
            </p>
          </div>
        </div>
      </div>

      <div className="pt-1">
        <button
          onClick={openBillingPortal}
          className={cn(
            "rounded-lg border border-white/[0.1] bg-white/[0.04] px-4 py-2 text-sm font-medium text-zinc-300",
            "hover:border-white/[0.18] hover:bg-white/[0.08] hover:text-white transition-colors",
          )}
        >
          Manage billing →
        </button>
      </div>

      <div className="pt-4">
        <p className="text-sm text-zinc-400 mb-2">Purchase a plan</p>
        <div>
          <StripeBuyButton
            buyButtonId="buy_btn_1THOTu2VC9y0vPGPsXBw9w8c"
            publishableKey="pk_test_51TFxCe2VC9y0vPGPTQuhNVNg3R470rNNC4uDkIt7Cq5fUhknqHYLejX6ZNI2yaMseGqgwQFN96Iz9RkqaVfgyytO00bOAHVE3b"
          />
        </div>
      </div>
    </SectionCard>
  );
}
