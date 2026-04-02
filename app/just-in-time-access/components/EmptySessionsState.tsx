import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export function EmptySessionsState({
  onRequestAccess,
}: {
  onRequestAccess: () => void;
}) {
  return (
    <Card className="border-dashed border-border bg-card">
      <CardContent className="flex min-h-72 flex-col items-center justify-center gap-4 text-center">
        <div className="space-y-2">
          <h2 className="text-xl font-semibold text-foreground">
            No active access sessions
          </h2>
          <p className="text-sm text-muted-foreground">
            Request temporary access to a resource and manage it here.
          </p>
        </div>
        <Button onClick={onRequestAccess}>Request your first access session</Button>
      </CardContent>
    </Card>
  );
}
