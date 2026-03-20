import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export default function IntegrationPanel({
  title,
  description,
  connected,
  onClick,
}: {
  title: string;
  description: string;
  connected?: boolean;
  onClick?: () => void;
}) {
  return (
    <Card>
      <CardContent className="p-5 flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <p className="text-sm font-medium text-white">{title}</p>
            {connected ? (
              <Badge variant="outline" className="text-xs">
                connected
              </Badge>
            ) : null}
          </div>
          <p className="text-xs text-zinc-500 mt-1">{description}</p>
        </div>
        <Button size="sm" variant="outline" onClick={onClick}>
          {connected ? "Disconnect" : "Connect"}
        </Button>
      </CardContent>
    </Card>
  );
}
