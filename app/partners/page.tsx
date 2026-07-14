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

export default function PartnersSection() {
  return (
    <section className="py-24">
      <div className="container mx-auto max-w-7xl px-6">
        <div className="text-center max-w-3xl mx-auto mb-14">
          <Badge variant="default" className="mb-4">
            Trusted Partners
          </Badge>

          <h2 className="text-4xl font-bold tracking-tight">
            Organizations Building Secure Software with Votrio
          </h2>

          <p className="mt-4 text-muted-foreground text-lg">
            From education to fintech and retail, organizations use Votrio to
            review AI-generated code, identify security issues, and improve the
            quality of large-scale codebases before deployment.
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-3">
          {partners.map((partner) => (
            <Card
              key={partner.name}
              className="group border-border/50 hover:border-primary/40 transition-all hover:shadow-lg"
            >
              <CardContent className="p-7">
                <div className="flex items-center justify-between mb-6">
                  <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center">
                    <Building2 className="h-6 w-6 text-primary" />
                  </div>

                  <Badge variant="outline">{partner.badge}</Badge>
                </div>

                <h3 className="text-xl font-semibold">{partner.name}</h3>

                <p className="text-sm text-primary mt-1">
                  {partner.category}
                </p>

                <p className="mt-4 text-muted-foreground leading-7">
                  {partner.description}
                </p>

                <Button
                  variant="ghost"
                  className="mt-6 p-0 h-auto group-hover:translate-x-1 transition-transform"
                >
                  Learn more
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}
