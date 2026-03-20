import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function ProfilePage() {
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Your profile</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-zinc-400">
          <p>This is a placeholder profile page.</p>
          <p>Add user details and connected accounts here.</p>
        </CardContent>
      </Card>
    </div>
  );
}
