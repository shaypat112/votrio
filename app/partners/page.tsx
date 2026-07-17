"use client";

import { useEffect, useRef, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Building2, ArrowRight } from "lucide-react";

const partners = [
  {
    name: "BP Gas Station",
    category: "Retail",
    description:
      "Using Votrio to continuously analyze AI-generated code, identify security risks, and strengthen production deployments across customer-facing applications.",
    badge: "Enterprise Partner",
  },
  {
    name: "Charlotte Student Hub",
    category: "Education",
    description:
      "Leveraging Votrio to improve code quality, visualize repository architecture, and help student developers build secure software projects.",
    badge: "Education Partner",
  },
  {
    name: "Finero",
    category: "FinTech",
    description:
      "Using Votrio's AI-powered repository analysis to review AI-assisted code, detect vulnerabilities early, and maintain secure engineering workflows.",
    badge: "Technology Partner",
  },
];

function useReducedMotion() {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduced(mq.matches);
    const handler = (e: MediaQueryListEvent) => setReduced(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);
  return reduced;
}

function useInView<T extends HTMLElement>(reduced: boolean) {
  const ref = useRef<T | null>(null);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    if (reduced) {
      setInView(true);
      return;
    }
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true);
          observer.disconnect();
        }
      },
      { threshold: 0.15 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [reduced]);

  return { ref, inView };
}

function PartnerCard({
  partner,
  index,
  reduced,
}: {
  partner: (typeof partners)[number];
  index: number;
  reduced: boolean;
}) {
  const { ref, inView } = useInView<HTMLDivElement>(reduced);
  const cardRef = useRef<HTMLDivElement | null>(null);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (reduced) return;
    const el = cardRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    el.style.setProperty("--mx", `${e.clientX - rect.left}px`);
    el.style.setProperty("--my", `${e.clientY - rect.top}px`);
  };

  return (
    <div
      ref={ref}
      className="transition-all duration-700 ease-out"
      style={{
        transitionDelay: reduced ? "0ms" : `${index * 90}ms`,
        opacity: inView ? 1 : 0,
        transform: inView ? "translateY(0)" : "translateY(28px)",
      }}
    >
      <Card
        ref={cardRef}
        onMouseMove={handleMouseMove}
        className="group relative overflow-hidden border-border/50 bg-card/60 backdrop-blur-sm
                   transition-all duration-500 ease-out
                   hover:-translate-y-1.5 hover:border-primary/50
                   hover:shadow-[0_20px_60px_-15px_hsl(var(--primary)/0.25)]
                   motion-reduce:transition-none motion-reduce:hover:translate-y-0"
      >
        {/* mouse-follow spotlight */}
        <div
          className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-500 group-hover:opacity-100"
          style={{
            background:
              "radial-gradient(280px circle at var(--mx, 50%) var(--my, 50%), hsl(var(--primary)/0.12), transparent 70%)",
          }}
        />

        {/* top hairline that glows on hover */}
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-border to-transparent opacity-0 transition-opacity duration-500 group-hover:opacity-100 group-hover:via-primary/60" />

        <CardContent className="relative p-7">
          <div className="mb-6 flex items-center justify-between">
            <div
              className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 ring-1 ring-primary/15
                         transition-all duration-500 ease-out
                         group-hover:scale-110 group-hover:rotate-6 group-hover:bg-primary/15"
            >
              <Building2 className="h-6 w-6 text-primary transition-transform duration-500" />
            </div>
            <Badge
              variant="outline"
              className="border-border/60 bg-background/50 backdrop-blur-sm transition-colors duration-300 group-hover:border-primary/40"
            >
              {partner.badge}
            </Badge>
          </div>

          <h3 className="text-xl font-semibold tracking-tight">
            {partner.name}
          </h3>
          <p className="mt-1 text-sm font-medium text-primary">
            {partner.category}
          </p>
          <p className="mt-4 leading-7 text-muted-foreground">
            {partner.description}
          </p>

          <Button
            variant="ghost"
            className="group/btn mt-6 h-auto p-0 font-medium text-foreground hover:bg-transparent hover:text-primary"
          >
            Learn more
            <ArrowRight className="ml-2 h-4 w-4 transition-transform duration-300 ease-out group-hover/btn:translate-x-1.5" />
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

export default function PartnersSection() {
  const reduced = useReducedMotion();
  const { ref: headerRef, inView: headerInView } =
    useInView<HTMLDivElement>(reduced);

  return (
    <section className="relative overflow-hidden py-24">
      {/* ambient background blobs */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 motion-reduce:hidden"
      >
        <div className="animate-float absolute -left-24 top-10 h-72 w-72 rounded-full bg-primary/20 opacity-10 blur-3xl" />
        <div
          className="animate-float absolute -right-24 bottom-0 h-96 w-96 rounded-full bg-primary/20 opacity-10 blur-3xl"
          style={{ animationDelay: "-4s" }}
        />
      </div>

      <div className="container mx-auto max-w-7xl px-6">


        <div className="grid gap-6 md:grid-cols-3">
          {partners.map((partner, index) => (
            <PartnerCard
              key={partner.name}
              partner={partner}
              index={index}
              reduced={reduced}
            />
          ))}
        </div>
      </div>

      <style jsx global>{`
        @keyframes float {
          0%,
          100% {
            transform: translateY(0) translateX(0);
          }
          50% {
            transform: translateY(-24px) translateX(12px);
          }
        }
        .animate-float {
          animation: float 10s ease-in-out infinite;
        }
      `}</style>
    </section>
  );
}
