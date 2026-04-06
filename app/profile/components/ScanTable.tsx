import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
export type ScanRow = {
  repo: string;
  created_at: string;
  severity: string;
  issues: number;
  score: number;
  summary?: string | null;
};

export default function ScanTable({ scans }: { scans: ScanRow[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Recent scans</CardTitle>
        <CardDescription>Your latest security scans.</CardDescription>
      </CardHeader>
      <CardContent>
        {scans.length === 0 ? (
          <div className="text-sm text-zinc-500">No scans yet.</div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Repository</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Severity</TableHead>
                <TableHead>Issues</TableHead>
                <TableHead>Score</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {scans.map((scan) => (
                <TableRow
                  key={`${scan.repo}-${scan.created_at}`}
                  className="cursor-pointer hover:bg-zinc-950/60"
                  onClick={() => {
                    window.location.href = `/reports/${encodeURIComponent(scan.repo)}`;
                  }}
                >
                  <TableCell className="font-medium text-zinc-100">
                    <div className="space-y-1">
                      <div>{scan.repo}</div>
                      {scan.summary ? (
                        <div className="text-xs text-zinc-500">
                          {scan.summary}
                        </div>
                      ) : null}
                    </div>
                  </TableCell>
                  <TableCell>
                    {new Date(scan.created_at).toLocaleDateString()}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{scan.severity}</Badge>
                  </TableCell>
                  <TableCell>{scan.issues}</TableCell>
                  <TableCell>{scan.score}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
