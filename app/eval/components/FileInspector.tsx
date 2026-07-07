"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  FileText,
  Code,
  GitBranch,
  Clock,
  Shield,
  AlertTriangle,
  Copy,
  ExternalLink,
  User,
  Calendar,
  Activity,
  ChevronRight,
  FolderOpen,
} from "lucide-react";

interface FileInspectorProps {
  file: {
    path: string;
    language: string;
    size: number;
    lines: number;
    complexity: number;
    securityFindings: number;
    lastModified: string;
    author: string;
    functions: Array<{ name: string; line: number; complexity: number }>;
    classes: Array<{ name: string; line: number; methods: number }>;
    imports: string[];
    exports: string[];
    dependencies: string[];
    importedBy: string[];
    relatedFiles: Array<{ path: string; similarity: number }>;
    securityIssues: Array<{
      type: string;
      line: number;
      severity: "low" | "medium" | "high" | "critical";
    }>;
    aiExplanation?: string;
  };
  onClose?: () => void;
}

export function FileInspector({ file, onClose }: FileInspectorProps) {
  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case "critical":
        return "bg-red-500 text-white";
      case "high":
        return "bg-orange-500 text-white";
      case "medium":
        return "bg-yellow-500 text-white";
      case "low":
        return "bg-blue-500 text-white";
      default:
        return "bg-gray-500 text-white";
    }
  };

  return (
    <Card className="subtle-border bg-card h-full overflow-hidden flex flex-col">
      <CardHeader className="border-b border-border/50">
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <CardTitle className="flex items-center gap-2 text-base">
              <FileText className="h-5 w-5" />
              <span className="truncate">{file.path.split("/").pop()}</span>
            </CardTitle>
            <p className="text-sm text-muted-foreground mt-1 truncate">
              {file.path}
            </p>
          </div>
          {onClose && (
            <Button variant="ghost" size="icon" onClick={onClose}>
              ×
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* File Metadata */}
        <div className="space-y-3">
          <h3 className="text-sm font-semibold flex items-center gap-2">
            <FileText className="h-4 w-4" />
            File Metadata
          </h3>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Language:</span>
              <Badge variant="outline" className="text-xs">
                {file.language}
              </Badge>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Size:</span>
              <span className="font-medium">{formatFileSize(file.size)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Lines:</span>
              <span className="font-medium">{file.lines}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Complexity:</span>
              <span
                className={`font-medium ${file.complexity > 10 ? "text-destructive" : "text-success"}`}
              >
                {file.complexity}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Author:</span>
              <span className="font-medium flex items-center gap-1">
                <User className="h-3 w-3" />
                {file.author}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Modified:</span>
              <span className="font-medium flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                {new Date(file.lastModified).toLocaleDateString()}
              </span>
            </div>
          </div>
        </div>

        <Separator />

        {/* Security Findings */}
        {file.securityFindings > 0 && (
          <div className="space-y-3">
            <h3 className="text-sm font-semibold flex items-center gap-2">
              <Shield className="h-4 w-4" />
              Security Findings
              <Badge variant="outline" className="text-xs">
                {file.securityFindings}
              </Badge>
            </h3>
            <div className="space-y-2">
              {file.securityIssues.map((issue, index) => (
                <div
                  key={index}
                  className="flex items-start gap-2 p-2 rounded bg-destructive/10 border border-destructive/20"
                >
                  <AlertTriangle className="h-4 w-4 text-destructive mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">{issue.type}</span>
                      <Badge
                        className={`text-xs ${getSeverityColor(issue.severity)}`}
                      >
                        {issue.severity}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Line {issue.line}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <Separator />

        {/* Functions */}
        {file.functions.length > 0 && (
          <div className="space-y-3">
            <h3 className="text-sm font-semibold flex items-center gap-2">
              <Code className="h-4 w-4" />
              Functions ({file.functions.length})
            </h3>
            <div className="space-y-1">
              {file.functions.map((func, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-2 rounded bg-muted/40 text-sm"
                >
                  <span className="font-medium">{func.name}</span>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span>Line {func.line}</span>
                    <Badge
                      variant="outline"
                      className={
                        func.complexity > 5
                          ? "border-destructive/50 text-destructive"
                          : ""
                      }
                    >
                      C: {func.complexity}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Classes */}
        {file.classes.length > 0 && (
          <div className="space-y-3">
            <h3 className="text-sm font-semibold flex items-center gap-2">
              <Code className="h-4 w-4" />
              Classes ({file.classes.length})
            </h3>
            <div className="space-y-1">
              {file.classes.map((cls, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-2 rounded bg-muted/40 text-sm"
                >
                  <span className="font-medium">{cls.name}</span>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span>Line {cls.line}</span>
                    <Badge variant="outline">{cls.methods} methods</Badge>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <Separator />

        {/* Dependencies */}
        <div className="space-y-3">
          <h3 className="text-sm font-semibold flex items-center gap-2">
            <GitBranch className="h-4 w-4" />
            Dependencies
          </h3>
          <div className="space-y-2">
            <div>
              <p className="text-xs text-muted-foreground mb-1">
                Imports ({file.imports.length})
              </p>
              <div className="flex flex-wrap gap-1">
                {file.imports.slice(0, 5).map((imp, index) => (
                  <Badge key={index} variant="outline" className="text-xs">
                    {imp}
                  </Badge>
                ))}
                {file.imports.length > 5 && (
                  <Badge variant="outline" className="text-xs">
                    +{file.imports.length - 5} more
                  </Badge>
                )}
              </div>
            </div>
            {file.exports.length > 0 && (
              <div>
                <p className="text-xs text-muted-foreground mb-1">
                  Exports ({file.exports.length})
                </p>
                <div className="flex flex-wrap gap-1">
                  {file.exports.slice(0, 5).map((exp, index) => (
                    <Badge key={index} variant="outline" className="text-xs">
                      {exp}
                    </Badge>
                  ))}
                  {file.exports.length > 5 && (
                    <Badge variant="outline" className="text-xs">
                      +{file.exports.length - 5} more
                    </Badge>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Imported By */}
        {file.importedBy.length > 0 && (
          <div className="space-y-3">
            <h3 className="text-sm font-semibold flex items-center gap-2">
              <Activity className="h-4 w-4" />
              Imported By ({file.importedBy.length})
            </h3>
            <div className="space-y-1">
              {file.importedBy.slice(0, 3).map((path, index) => (
                <div
                  key={index}
                  className="flex items-center gap-2 p-2 rounded bg-muted/40 text-sm"
                >
                  <FolderOpen className="h-4 w-4 text-muted-foreground" />
                  <span className="truncate">{path}</span>
                </div>
              ))}
              {file.importedBy.length > 3 && (
                <Button variant="ghost" size="sm" className="w-full text-xs">
                  View all {file.importedBy.length} files
                </Button>
              )}
            </div>
          </div>
        )}

        {/* Related Files */}
        {file.relatedFiles.length > 0 && (
          <div className="space-y-3">
            <h3 className="text-sm font-semibold flex items-center gap-2">
              <Copy className="h-4 w-4" />
              Similar Code
            </h3>
            <div className="space-y-1">
              {file.relatedFiles.map((related, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-2 rounded bg-muted/40 text-sm"
                >
                  <span className="truncate flex-1">{related.path}</span>
                  <Badge variant="outline" className="text-xs ml-2">
                    {Math.round(related.similarity * 100)}% similar
                  </Badge>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* AI Explanation */}
        {file.aiExplanation && (
          <div className="space-y-3">
            <h3 className="text-sm font-semibold flex items-center gap-2">
              <Activity className="h-4 w-4" />
              AI Analysis
            </h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              {file.aiExplanation}
            </p>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-2 pt-4">
          <Button variant="outline" size="sm" className="flex-1">
            <ExternalLink className="h-4 w-4 mr-2" />
            View Source
          </Button>
          <Button variant="outline" size="sm" className="flex-1">
            <Copy className="h-4 w-4 mr-2" />
            Copy Path
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
