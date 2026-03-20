import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function SettingsPage() {
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Settings</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-zinc-400">
          <p>This is a placeholder settings page.</p>
          <p>Wire preferences and integrations here.</p>
        </CardContent>
      </Card>
    </div>
  );
}
