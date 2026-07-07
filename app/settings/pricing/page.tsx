"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Check, Zap, Shield, Cpu, Globe, Clock, ArrowRight, Star } from "lucide-react";

const plans = [
  {
    id: "free",
    name: "Free",
    description: "Perfect for personal projects and exploration",
    price: 0,
    originalPrice: null,
    features: [
      { icon: <Shield className="h-4 w-4" />, text: "3 repository scans per month" },
      { icon: <Zap className="h-4 w-4" />, text: "Basic security pattern detection" },
      { icon: <Cpu className="h-4 w-4" />, text: "Regex-based vulnerability scanning" },
      { icon: <Globe className="h-4 w-4" />, text: "Public GitHub repositories only" },
      { icon: <Clock className="h-4 w-4" />, text: "30-day scan history" },
    ],
    limitations: [
      "No AI-powered analysis",
      "No attack path simulation",
      "No repository intelligence",
      "No team collaboration",
    ],
    cta: "Current Plan",
    disabled: true,
    popular: false,
  },
  {
    id: "pro",
    name: "Pro",
    description: "For serious developers who need advanced security",
    price: 19,
    originalPrice: null,
    features: [
      { icon: <Shield className="h-4 w-4" />, text: "Unlimited repository scans" },
      { icon: <Zap className="h-4 w-4" />, text: "AI-powered vulnerability detection" },
      { icon: <Cpu className="h-4 w-4" />, text: "Attack path simulation" },
      { icon: <Globe className="h-4 w-4" />, text: "Private GitHub repositories" },
      { icon: <Clock className="h-4 w-4" />, text: "Unlimited scan history" },
      { icon: <Star className="h-4 w-4" />, text: "Repository intelligence dashboard" },
      { icon: <Globe className="h-4 w-4" />, text: "GitLab & Bitbucket integration" },
    ],
    limitations: [
      "Basic team features",
      "Standard support",
    ],
    cta: "Upgrade to Pro",
    disabled: false,
    popular: true,
    deal: null,
  },
  {
    id: "premium",
    name: "Premium",
    description: "Enterprise-grade security for teams and organizations",
    price: 49,
    originalPrice: 79,
    features: [
      { icon: <Shield className="h-4 w-4" />, text: "Everything in Pro" },
      { icon: <Zap className="h-4 w-4" />, text: "Advanced AI architecture analysis" },
      { icon: <Cpu className="h-4 w-4" />, text: "Custom security rules engine" },
      { icon: <Globe className="h-4 w-4" />, text: "Unlimited team members" },
      { icon: <Clock className="h-4 w-4" />, text: "Priority support (24/7)" },
      { icon: <Star className="h-4 w-4" />, text: "SSO & advanced authentication" },
      { icon: <Globe className="h-4 w-4" />, text: "Custom integrations & API access" },
      { icon: <Shield className="h-4 w-4" />, text: "Compliance reporting (SOC2, HIPAA)" },
    ],
    limitations: [],
    cta: "Upgrade to Premium",
    disabled: false,
    popular: false,
    deal: "38% OFF - Limited Time",
  },
];

export default function PricingPage() {
  const [billingCycle, setBillingCycle] = useState<"monthly" | "yearly">("monthly");
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);

  const handleSubscribe = async (planId: string) => {
    try {
      const response = await fetch("/api/billing/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ planId, billingCycle }),
      });

      if (!response.ok) {
        throw new Error("Failed to create checkout session");
      }

      const { url } = await response.json();
      window.location.href = url;
    } catch (error) {
      console.error("Subscription error:", error);
      // Show error message to user
    }
  };

  const getDisplayPrice = (plan: typeof plans[0]) => {
    if (billingCycle === "yearly" && plan.price > 0) {
      return Math.round(plan.price * 0.8); // 20% discount for yearly
    }
    return plan.price;
  };

  const getPeriodLabel = () => {
    return billingCycle === "monthly" ? "/month" : "/month (billed yearly)";
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
      {/* Header */}
      <div className="border-b border-slate-800 bg-slate-950/50 backdrop-blur-xl">
        <div className="container mx-auto px-4 py-8">
          <div className="mx-auto max-w-4xl text-center">
            <h1 className="text-4xl font-bold text-white mb-4">
              Enterprise AI Security for Developers
            </h1>
            <p className="text-lg text-slate-400 mb-8">
              Choose the perfect plan for your security needs. Start free, upgrade when you're ready.
            </p>

            {/* Billing Toggle */}
            <div className="inline-flex items-center gap-4 bg-slate-900 p-1 rounded-lg border border-slate-800">
              <button
                onClick={() => setBillingCycle("monthly")}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
                  billingCycle === "monthly"
                    ? "bg-slate-800 text-white shadow-sm"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                Monthly
              </button>
              <button
                onClick={() => setBillingCycle("yearly")}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-all flex items-center gap-2 ${
                  billingCycle === "yearly"
                    ? "bg-slate-800 text-white shadow-sm"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                Yearly
                <Badge variant="outline" className="text-xs bg-green-500/10 text-green-400 border-green-500/20">
                  Save 20%
                </Badge>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Pricing Cards */}
      <div className="container mx-auto px-4 py-16">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-7xl mx-auto">
          {plans.map((plan) => (
            <Card
              key={plan.id}
              className={`relative overflow-hidden transition-all duration-300 hover:shadow-2xl hover:shadow-primary/5 ${
                plan.popular
                  ? "border-primary/50 bg-gradient-to-b from-primary/5 to-transparent scale-105"
                  : "border-slate-800 bg-slate-900/50"
              }`}
            >
              {plan.popular && (
                <div className="absolute top-0 right-0 bg-primary text-primary-foreground px-3 py-1 text-xs font-semibold rounded-bl-lg">
                  Most Popular
                </div>
              )}

              {plan.deal && (
                <div className="absolute top-0 left-0 right-0 bg-gradient-to-r from-orange-500/20 to-red-500/20 border-b border-orange-500/30 px-3 py-2">
                  <div className="flex items-center justify-center gap-2">
                    <Star className="h-4 w-4 text-orange-400 fill-orange-400" />
                    <span className="text-sm font-semibold text-orange-300">{plan.deal}</span>
                  </div>
                </div>
              )}

              <CardHeader className={plan.deal ? "pt-12" : ""}>
                <CardTitle className="text-2xl font-bold text-white">
                  {plan.name}
                </CardTitle>
                <CardDescription className="text-slate-400">
                  {plan.description}
                </CardDescription>
                <div className="mt-4">
                  <div className="flex items-baseline gap-2">
                    <span className="text-4xl font-bold text-white">
                      ${getDisplayPrice(plan)}
                    </span>
                    <span className="text-slate-400">{getPeriodLabel()}</span>
                  </div>
                  {plan.originalPrice && billingCycle === "monthly" && (
                    <div className="flex items-center gap-2 mt-2">
                      <span className="text-lg text-slate-500 line-through">
                        ${plan.originalPrice}
                      </span>
                      <Badge variant="outline" className="text-xs bg-red-500/10 text-red-400 border-red-500/20">
                        {Math.round((1 - plan.price / plan.originalPrice) * 100)}% OFF
                      </Badge>
                    </div>
                  )}
                </div>
              </CardHeader>

              <CardContent className="flex-1">
                <div className="space-y-4">
                  <div className="space-y-3">
                    {plan.features.map((feature, index) => (
                      <div key={index} className="flex items-start gap-3">
                        <div className="flex-shrink-0 mt-0.5">
                          {feature.icon}
                        </div>
                        <span className="text-sm text-slate-300">{feature.text}</span>
                      </div>
                    ))}
                  </div>

                  {plan.limitations.length > 0 && (
                    <div className="pt-4 border-t border-slate-800">
                      <p className="text-xs text-slate-500 mb-2">Limitations:</p>
                      <div className="space-y-2">
                        {plan.limitations.map((limitation, index) => (
                          <div key={index} className="flex items-start gap-2">
                            <div className="h-4 w-4 rounded-full bg-slate-800 flex items-center justify-center flex-shrink-0 mt-0.5">
                              <span className="text-xs text-slate-500">×</span>
                            </div>
                            <span className="text-xs text-slate-500">{limitation}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>

              <CardFooter>
                <Button
                  onClick={() => handleSubscribe(plan.id)}
                  disabled={plan.disabled}
                  className={`w-full ${
                    plan.popular
                      ? "bg-primary hover:bg-primary/90 text-primary-foreground"
                      : "bg-slate-800 hover:bg-slate-700 text-white"
                  }`}
                >
                  {plan.cta}
                  {!plan.disabled && <ArrowRight className="ml-2 h-4 w-4" />}
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>

        {/* Special Offer Banner */}
        <div className="mt-16 max-w-4xl mx-auto">
          <Card className="bg-gradient-to-r from-primary/10 via-purple-500/10 to-primary/10 border-primary/30">
            <CardContent className="p-8">
              <div className="text-center">
                <div className="flex items-center justify-center gap-2 mb-4">
                  <Star className="h-6 w-6 text-yellow-400 fill-yellow-400" />
                  <h3 className="text-2xl font-bold text-white">Limited Time Offer</h3>
                  <Star className="h-6 w-6 text-yellow-400 fill-yellow-400" />
                </div>
                <p className="text-lg text-slate-300 mb-6">
                  Upgrade to Premium today and get your first month for just <span className="text-2xl font-bold text-primary">$5.99</span>!
                </p>
                <Button
                  size="lg"
                  onClick={() => handleSubscribe("premium")}
                  className="bg-primary hover:bg-primary/90 text-primary-foreground"
                >
                  Claim Your $5.99 First Month
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
                <p className="text-sm text-slate-500 mt-4">
                  *Offer valid for new Premium subscribers. Regular price $49/month.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Trust Signals */}
        <div className="mt-16 text-center">
          <div className="flex items-center justify-center gap-8 text-slate-500 text-sm">
            <div className="flex items-center gap-2">
              <Shield className="h-4 w-4" />
              <span>Enterprise Security</span>
            </div>
            <div className="flex items-center gap-2">
              <Zap className="h-4 w-4" />
              <span>AI-Powered Analysis</span>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4" />
              <span>24/7 Support</span>
            </div>
            <div className="flex items-center gap-2">
              <Globe className="h-4 w-4" />
              <span>Cancel Anytime</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
