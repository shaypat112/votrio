"use client";

import { useEffect, useState } from "react";
import { buildAuthHeaders } from "@/app/lib/http";
import { createClient } from "@/app/lib/supabase";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  CreditCard,
  CheckCircle,
  AlertCircle,
  Calendar,
  FileText,
  ArrowRight,
  Loader2,
  Crown,
  Users,
  Zap,
  LogIn,
} from "lucide-react";

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

type Plan = {
  id: string;
  name: string;
  price: string;
  description: string;
  features: string[];
  popular?: boolean;
  priceId?: string;
};

const PLANS: Plan[] = [
  {
    id: "pro",
    name: "Pro",
    price: "$29",
    description: "For individual developers",
    features: [
      "Unlimited repository scans",
      "AI-powered security analysis",
      "Priority support",
      "Advanced threat detection",
      "Custom integrations",
    ],
    popular: true,
    priceId: "pro",
  },
  {
    id: "team",
    name: "Team",
    price: "$99",
    description: "For small teams",
    features: [
      "Everything in Pro",
      "Up to 10 team members",
      "Team dashboard",
      "Shared billing",
      "Role-based access",
      "Team analytics",
    ],
    priceId: "team",
  },
  {
    id: "enterprise",
    name: "Enterprise",
    price: "Custom",
    description: "For large organizations",
    features: [
      "Everything in Team",
      "Unlimited team members",
      "SSO/SAML integration",
      "Dedicated support",
      "Custom contracts",
      "SLA guarantees",
    ],
  },
];

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(amount);
}

function formatPlanName(planName: string) {
  switch (planName.toLowerCase()) {
    case "pro":
      return "Pro Plan";
    case "team":
      return "Team Plan";
    case "premium":
      return "Premium Plan";
    default:
      return planName;
  }
}

function getSubscriptionStatusColor(status: string) {
  switch (status.toLowerCase()) {
    case "active":
      return "bg-green-500/10 text-green-500 border-green-500/20";
    case "trialing":
      return "bg-blue-500/10 text-blue-500 border-blue-500/20";
    case "past_due":
      return "bg-red-500/10 text-red-500 border-red-500/20";
    case "canceled":
      return "bg-gray-500/10 text-gray-500 border-gray-500/20";
    default:
      return "bg-yellow-500/10 text-yellow-500 border-yellow-500/20";
  }
}

function getSubscriptionStatusIcon(status: string) {
  switch (status.toLowerCase()) {
    case "active":
      return <CheckCircle className="h-4 w-4" />;
    case "trialing":
      return <Zap className="h-4 w-4" />;
    case "past_due":
      return <AlertCircle className="h-4 w-4" />;
    case "canceled":
      return <AlertCircle className="h-4 w-4" />;
    default:
      return <AlertCircle className="h-4 w-4" />;
  }
}

export function BillingClient() {
  const supabase = createClient();
  const [summary, setSummary] = useState<BillingSummary | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null); // null = unknown yet
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [checkoutLoadingPlanId, setCheckoutLoadingPlanId] = useState<string | null>(null);
  const [portalLoading, setPortalLoading] = useState(false);

  useEffect(() => {
    loadBillingSummary();
  }, []);

  const getAccessToken = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    return session?.access_token ?? null;
  };

  const loadBillingSummary = async () => {
    setLoading(true);
    setError(null);
    try {
      const accessToken = await getAccessToken();

      // No session is a valid, expected state for a public page — not an error.
      if (!accessToken) {
        setIsAuthenticated(false);
        setSummary(null);
        setLoading(false);
        return;
      }

      setIsAuthenticated(true);

      const res = await fetch("/api/billing/summary", {
        headers: buildAuthHeaders(accessToken),
      });
      const data = await res.json().catch(() => null);

      if (!res.ok) {
        setError(data?.error ?? "Unable to load billing summary.");
        setLoading(false);
        return;
      }

      setSummary(data as BillingSummary);
      setLoading(false);
    } catch (err) {
      setError("Failed to load billing information.");
      setLoading(false);
    }
  };

  const goToSignIn = (redirectTo: string) => {
    const params = new URLSearchParams({ redirect: redirectTo });
    window.location.href = `/login?${params.toString()}`;
  };

  const startCheckout = async (planId: string) => {
    if (planId === "enterprise") {
      contactEnterprise();
      return;
    }

    try {
      setCheckoutLoadingPlanId(planId);
      setError(null);

      const accessToken = await getAccessToken();

      if (!accessToken) {
        // Anonymous visitor selected a plan — send them to sign in, then back here.
        goToSignIn(`/billing?plan=${planId}`);
        return;
      }

      const res = await fetch("/api/billing/checkout", {
        method: "POST",
        headers: buildAuthHeaders(accessToken, {
          "Content-Type": "application/json",
        }),
        body: JSON.stringify({ planId, billingCycle: "monthly" }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data?.error ?? "Unable to start checkout process.");
        return;
      }

      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        setError("Checkout session could not be created.");
      }
    } catch (err) {
      setError("Failed to start checkout process.");
    } finally {
      setCheckoutLoadingPlanId(null);
    }
  };

  const openBillingPortal = async () => {
    try {
      setPortalLoading(true);
      setError(null);

      const accessToken = await getAccessToken();
      if (!accessToken) {
        goToSignIn("/billing");
        return;
      }

      const res = await fetch("/api/billing/portal", {
        method: "POST",
        headers: buildAuthHeaders(accessToken, {
          "Content-Type": "application/json",
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data?.error ?? "Unable to open billing portal.");
        return;
      }

      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        setError("Billing portal link could not be created.");
      }
    } catch (err) {
      setError("Failed to open billing portal.");
    } finally {
      setPortalLoading(false);
    }
  };

  const contactEnterprise = () => {
    window.location.href = "mailto:sales@votrio.com?subject=Enterprise Plan Inquiry";
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]" role="status" aria-live="polite">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        <span className="sr-only">Loading billing information…</span>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      {/* Header */}
      <div className="space-y-2">
        <h1 className="text-3xl font-bold">Billing & Plans</h1>
        <p className="text-muted-foreground">
          {isAuthenticated
            ? "Manage your subscription and payment methods"
            : "Compare plans and find the right fit — sign in to manage an existing subscription"}
        </p>
      </div>

      {error && (
        <Card className="border-destructive/50 bg-destructive/10" role="alert">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-destructive">
              <AlertCircle className="h-4 w-4" />
              <p className="text-sm">{error}</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Signed-out prompt (page itself stays public) */}
      {isAuthenticated === false && (
        <Card className="border-primary/30 bg-primary/5">
          <CardContent className="pt-6 flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-2 text-sm">
              <LogIn className="h-4 w-4" />
              <span>Sign in to view or manage an existing subscription.</span>
            </div>
            <Button variant="outline" size="sm" onClick={() => goToSignIn("/billing")}>
              Sign in
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Current Subscription (signed-in only) */}
      {isAuthenticated && summary?.subscription && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5" />
              Current Subscription
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-start justify-between flex-wrap gap-4">
              <div className="flex items-center gap-3">
                <Badge
                  variant="outline"
                  className={getSubscriptionStatusColor(summary.subscription.status)}
                >
                  <span className="flex items-center gap-1">
                    {getSubscriptionStatusIcon(summary.subscription.status)}
                    {summary.subscription.status.charAt(0).toUpperCase() +
                      summary.subscription.status.slice(1)}
                  </span>
                </Badge>
                <div>
                  <h3 className="font-semibold text-lg">
                    {formatPlanName(summary.subscription.planName)}
                  </h3>
                  {summary.subscription.currentPeriodEnd && (
                    <p className="text-sm text-muted-foreground flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      Renews on {new Date(summary.subscription.currentPeriodEnd).toLocaleDateString()}
                    </p>
                  )}
                </div>
              </div>
              <Button variant="outline" onClick={openBillingPortal} disabled={portalLoading}>
                {portalLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                Manage Subscription
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Pricing Plans — always visible, public or signed in */}
      <div className="space-y-4">
        <h2 className="text-2xl font-bold">Choose Your Plan</h2>
        <div className="grid md:grid-cols-3 gap-6">
          {PLANS.map((plan) => {
            const isCurrentPlan =
              isAuthenticated &&
              summary?.subscription?.planName.toLowerCase() === plan.name.toLowerCase();
            const isLoadingThisPlan = checkoutLoadingPlanId === plan.id;

            return (
              <Card
                key={plan.id}
                className={`relative ${plan.popular ? "border-primary shadow-lg" : ""}`}
              >
                {plan.popular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <Badge className="bg-primary">Most Popular</Badge>
                  </div>
                )}
                <CardHeader>
                  <div className="flex items-center gap-2">
                    {plan.id === "team" && <Users className="h-5 w-5 text-primary" />}
                    {plan.id === "pro" && <Zap className="h-5 w-5 text-primary" />}
                    {plan.id === "enterprise" && <Crown className="h-5 w-5 text-primary" />}
                    <CardTitle>{plan.name}</CardTitle>
                  </div>
                  <CardDescription>{plan.description}</CardDescription>
                  <div className="mt-4">
                    <span className="text-4xl font-bold">{plan.price}</span>
                    {plan.price !== "Custom" && (
                      <span className="text-muted-foreground">/month</span>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <ul className="space-y-2">
                    {plan.features.map((feature) => (
                      <li key={feature} className="flex items-start gap-2 text-sm">
                        <CheckCircle className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>
                  <Button
                    className="w-full"
                    variant={plan.popular ? "default" : "outline"}
                    onClick={() => startCheckout(plan.id)}
                    disabled={isLoadingThisPlan || isCurrentPlan}
                    aria-label={`${plan.id === "enterprise" ? "Contact sales about" : "Get started with"} the ${plan.name} plan`}
                  >
                    {isLoadingThisPlan ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                    {isCurrentPlan
                      ? "Current Plan"
                      : plan.id === "enterprise"
                      ? "Contact Sales"
                      : isAuthenticated === false
                      ? "Sign in to get started"
                      : "Get Started"}
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      {/* Recent Invoices (signed-in only) */}
      {isAuthenticated && summary?.invoices && summary.invoices.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Recent Invoices
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {summary.invoices.map((invoice) => (
                <div
                  key={invoice.id}
                  className="flex items-center justify-between p-3 rounded-lg border border-border"
                >
                  <div className="flex items-center gap-3">
                    <FileText className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="font-medium">{invoice.month}</p>
                      <p className="text-xs text-muted-foreground">{invoice.id}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge
                      variant="outline"
                      className={
                        invoice.status === "paid"
                          ? "bg-green-500/10 text-green-500 border-green-500/20"
                          : "bg-yellow-500/10 text-yellow-500 border-yellow-500/20"
                      }
                    >
                      {invoice.status.charAt(0).toUpperCase() + invoice.status.slice(1)}
                    </Badge>
                    <span className="font-semibold">{formatCurrency(invoice.amount)}</span>
                  </div>
                </div>
              ))}
            </div>
            <Button variant="outline" className="mt-4" onClick={openBillingPortal} disabled={portalLoading}>
              {portalLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              View All Invoices
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Stripe Configuration Notice */}
      {isAuthenticated && !summary?.configured && (
        <Card className="border-yellow-500/50 bg-yellow-500/10">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-yellow-600 dark:text-yellow-500">
              <AlertCircle className="h-4 w-4" />
              <p className="text-sm">
                Stripe is not configured for this environment yet. Please contact the administrator.
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
