import { Card, CardContent } from "@/components/ui/card";

export default function StatsRow({
  stats,
}: {
  stats: Array<{ label: string; value: string }>;
}) {
  return (
    <div className="grid gap-3 sm:grid-cols-3">
      {stats.map((stat) => (
        <Card key={stat.label}>
          <CardContent className="p-4">
            <div className="text-xs text-zinc-500 uppercase tracking-wide">
              {stat.label}
            </div>
            <div className="text-2xl font-semibold text-white mt-2">
              {stat.value}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
