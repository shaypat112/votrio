"use client";

import { useState, useCallback, useMemo } from "react";
import {
  Search,
  X,
  File,
  Folder,
  Code,
  Shield,
  Database,
  Globe,
  ChevronRight,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";

interface SearchResult {
  id: string;
  type:
    | "file"
    | "folder"
    | "function"
    | "class"
    | "package"
    | "vulnerability"
    | "endpoint"
    | "import"
    | "dependency"
    | "framework";
  label: string;
  path: string;
  description?: string;
  metadata?: {
    line?: number;
    severity?: "low" | "medium" | "high" | "critical";
    language?: string;
    complexity?: number;
  };
}

interface GlobalSearchProps {
  data: {
    files: SearchResult[];
    folders: SearchResult[];
    functions: SearchResult[];
    classes: SearchResult[];
    packages: SearchResult[];
    vulnerabilities: SearchResult[];
    endpoints: SearchResult[];
    imports: SearchResult[];
    dependencies: SearchResult[];
    frameworks: SearchResult[];
  };
  onResultClick?: (result: SearchResult) => void;
}

export function GlobalSearch({ data, onResultClick }: GlobalSearchProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [selectedType, setSelectedType] = useState<string>("all");
  const allResults = useMemo(
    () => [
      ...(data?.files ?? []),
      ...(data?.folders ?? []),
      ...(data?.functions ?? []),
      ...(data?.classes ?? []),
      ...(data?.packages ?? []),
      ...(data?.vulnerabilities ?? []),
      ...(data?.endpoints ?? []),
      ...(data?.imports ?? []),
      ...(data?.dependencies ?? []),
      ...(data?.frameworks ?? []),
    ],
    [data],
  );

  const filteredResults = useMemo(() => {
    if (!query.trim()) return [];

    const searchLower = query.toLowerCase();

    let results = allResults.filter(
      (result) =>
        result.label.toLowerCase().includes(searchLower) ||
        result.path.toLowerCase().includes(searchLower) ||
        result.description?.toLowerCase().includes(searchLower),
    );

    if (selectedType !== "all") {
      results = results.filter((result) => result.type === selectedType);
    }

    // Sort by relevance
    results.sort((a, b) => {
      const aStartsWith = a.label.toLowerCase().startsWith(searchLower);
      const bStartsWith = b.label.toLowerCase().startsWith(searchLower);
      if (aStartsWith && !bStartsWith) return -1;
      if (!aStartsWith && bStartsWith) return 1;
      return a.label.localeCompare(b.label);
    });

    return results.slice(0, 20); // Limit to 20 results
  }, [query, selectedType, allResults]);

  const getIcon = (type: SearchResult["type"]) => {
    switch (type) {
      case "file":
        return File;
      case "folder":
        return Folder;
      case "function":
      case "class":
        return Code;
      case "vulnerability":
        return Shield;
      case "endpoint":
        return Globe;
      case "package":
      case "dependency":
        return Database;
      default:
        return File;
    }
  };

  const getTypeColor = (type: SearchResult["type"]) => {
    switch (type) {
      case "file":
        return "text-blue-500";
      case "folder":
        return "text-yellow-500";
      case "function":
      case "class":
        return "text-green-500";
      case "vulnerability":
        return "text-red-500";
      case "endpoint":
        return "text-purple-500";
      case "package":
      case "dependency":
        return "text-orange-500";
      case "framework":
        return "text-cyan-500";
      default:
        return "text-gray-500";
    }
  };

  const handleResultClick = useCallback(
    (result: SearchResult) => {
      onResultClick?.(result);
      setIsOpen(false);
      setQuery("");
    },
    [onResultClick],
  );

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if ((e.metaKey || e.ctrlKey) && e.key === "k") {
      e.preventDefault();
      setIsOpen((prev) => !prev);
    }
    if (e.key === "Escape") {
      setIsOpen(false);
    }
  }, []);

  useState(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  });

  const resultCounts = useMemo(
    () => ({
      all: allResults.length,
      file: data?.files?.length ?? 0,
      folder: data?.folders?.length ?? 0,
      function: data?.functions?.length ?? 0,
      class: data?.classes?.length ?? 0,
      vulnerability: data?.vulnerabilities?.length ?? 0,
      endpoint: data?.endpoints?.length ?? 0,
      package: data?.packages?.length ?? 0,
      dependency: data?.dependencies?.length ?? 0,
      framework: data?.frameworks?.length ?? 0,
    }),
    [allResults, data],
  );

  if (!isOpen) {
    return (
      <Button
        variant="outline"
        onClick={() => setIsOpen(true)}
        className="w-full justify-start text-muted-foreground"
      >
        <Search className="h-4 w-4 mr-2" />
        Search repository...
        <kbd className="ml-auto pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium opacity-100">
          <span className="text-xs">⌘</span>K
        </kbd>
      </Button>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-[20vh] bg-background/80 backdrop-blur-sm">
      <Card className="w-full max-w-2xl mx-4 shadow-2xl">
        <div className="flex items-center border-b border-border/50 p-4">
          <Search className="h-5 w-5 text-muted-foreground mr-3" />
          <Input
            placeholder="Search files, functions, vulnerabilities..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="flex-1 border-0 focus-visible:ring-0 text-base"
            autoFocus
          />
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsOpen(false)}
            className="ml-2"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Type Filters */}
        <div className="flex gap-2 p-4 border-b border-border/50 overflow-x-auto">
          <Button
            variant={selectedType === "all" ? "default" : "ghost"}
            size="sm"
            onClick={() => setSelectedType("all")}
          >
            All ({resultCounts.all})
          </Button>
          <Button
            variant={selectedType === "file" ? "default" : "ghost"}
            size="sm"
            onClick={() => setSelectedType("file")}
          >
            Files ({resultCounts.file})
          </Button>
          <Button
            variant={selectedType === "folder" ? "default" : "ghost"}
            size="sm"
            onClick={() => setSelectedType("folder")}
          >
            Folders ({resultCounts.folder})
          </Button>
          <Button
            variant={selectedType === "function" ? "default" : "ghost"}
            size="sm"
            onClick={() => setSelectedType("function")}
          >
            Functions ({resultCounts.function})
          </Button>
          <Button
            variant={selectedType === "vulnerability" ? "default" : "ghost"}
            size="sm"
            onClick={() => setSelectedType("vulnerability")}
          >
            Vulnerabilities ({resultCounts.vulnerability})
          </Button>
        </div>

        {/* Results */}
        <div className="max-h-[400px] overflow-y-auto">
          {query && filteredResults.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">
              <Search className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p className="text-lg font-medium">No results found</p>
              <p className="text-sm mt-1">Try adjusting your search terms</p>
            </div>
          ) : !query ? (
            <div className="p-8 text-center text-muted-foreground">
              <Search className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p className="text-lg font-medium">Search your repository</p>
              <p className="text-sm mt-1">
                Search for files, functions, classes, vulnerabilities, and more
              </p>
            </div>
          ) : (
            <div className="divide-y divide-border/50">
              {filteredResults.map((result) => {
                const Icon = getIcon(result.type);
                return (
                  <button
                    key={result.id}
                    onClick={() => handleResultClick(result)}
                    className="w-full flex items-start gap-3 p-4 hover:bg-muted/50 transition-colors text-left"
                  >
                    <Icon
                      className={`h-5 w-5 mt-0.5 ${getTypeColor(result.type)}`}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{result.label}</span>
                        {result.metadata?.severity && (
                          <Badge
                            variant="outline"
                            className={`text-xs ${
                              result.metadata.severity === "critical" ||
                              result.metadata.severity === "high"
                                ? "border-red-500 text-red-500"
                                : ""
                            }`}
                          >
                            {result.metadata.severity}
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground mt-0.5 truncate">
                        {result.path}
                      </p>
                      {result.description && (
                        <p className="text-xs text-muted-foreground mt-1">
                          {result.description}
                        </p>
                      )}
                      {result.metadata && (
                        <div className="flex gap-2 mt-2">
                          {result.metadata.line && (
                            <Badge variant="outline" className="text-xs">
                              Line {result.metadata.line}
                            </Badge>
                          )}
                          {result.metadata.language && (
                            <Badge variant="outline" className="text-xs">
                              {result.metadata.language}
                            </Badge>
                          )}
                          {result.metadata.complexity && (
                            <Badge variant="outline" className="text-xs">
                              Complexity: {result.metadata.complexity}
                            </Badge>
                          )}
                        </div>
                      )}
                    </div>
                    <ChevronRight className="h-4 w-4 text-muted-foreground mt-1" />
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-4 border-t border-border/50 text-xs text-muted-foreground">
          <div className="flex items-center gap-4">
            <span>
              <kbd className="px-1.5 py-0.5 rounded bg-muted">↑↓</kbd> Navigate
            </span>
            <span>
              <kbd className="px-1.5 py-0.5 rounded bg-muted">↵</kbd> Select
            </span>
            <span>
              <kbd className="px-1.5 py-0.5 rounded bg-muted">esc</kbd> Close
            </span>
          </div>
          <span>{filteredResults.length} results</span>
        </div>
      </Card>
    </div>
  );
}
