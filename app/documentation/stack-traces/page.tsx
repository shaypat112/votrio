import { Badge } from "@/components/ui/badge";
import { Card, CardDescription, CardHeader } from "@/components/ui/card";

export default function StackTraces() {
  return (
    <div>
      <Badge className="mb-5">Stack Traces</Badge>

      <div>
        {" "}
        <Card>
          <CardHeader> Stack Traces Documentation</CardHeader>
          <CardDescription> fbwhfbw</CardDescription>
        </Card>
      </div>
    </div>
  );
}
