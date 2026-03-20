import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function SettingsPanel({
  ignoredPaths,
  setIgnoredPaths,
}: {
  ignoredPaths: string;
  setIgnoredPaths: (value: string) => void;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Scan settings</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="ignored">Ignored paths</Label>
          <Input
            id="ignored"
            value={ignoredPaths}
            onChange={(e) => setIgnoredPaths(e.target.value)}
          />
          <p className="text-xs text-zinc-500">
            Comma-separated glob patterns. Example: node_modules/**, dist/**
          </p>
        </div>
        <Button size="sm" variant="outline">
          Save settings
        </Button>
      </CardContent>
    </Card>
  );
}
