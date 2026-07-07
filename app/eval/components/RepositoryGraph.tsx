"use client";

import React, { useCallback, useMemo, useState } from "react";
import {
  ReactFlow,
  Node,
  Edge,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  addEdge,
  Connection,
  MarkerType,
  NodeTypes,
} from "reactflow";
import "reactflow/dist/style.css";
import {
  File,
  Folder,
  Database,
  Lock,
  Shield,
  Code,
  Cpu,
  Globe,
  Server,
  TestTube,
  FileText,
  Settings,
  ChevronRight,
  ChevronDown,
  Search,
  Filter,
  ZoomIn,
  ZoomOut,
  Maximize2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";

type NodeType =
  | "folder"
  | "file"
  | "config"
  | "secret"
  | "api"
  | "component"
  | "database"
  | "infrastructure"
  | "ai"
  | "test"
  | "documentation";

interface RepositoryNode extends Node {
  type: NodeType;
  data: {
    label: string;
    path: string;
    language?: string;
    size?: number;
    complexity?: number;
    securityIssues?: number;
    children?: RepositoryNode[];
    collapsed?: boolean;
  };
}

const nodeColors: Record<NodeType, { bg: string; border: string; icon: any }> =
  {
    folder: {
      bg: "bg-blue-50 dark:bg-blue-950/30",
      border: "border-blue-200 dark:border-blue-800",
      icon: Folder,
    },
    file: {
      bg: "bg-green-50 dark:bg-green-950/30",
      border: "border-green-200 dark:border-green-800",
      icon: File,
    },
    config: {
      bg: "bg-yellow-50 dark:bg-yellow-950/30",
      border: "border-yellow-200 dark:border-yellow-800",
      icon: Settings,
    },
    secret: {
      bg: "bg-red-50 dark:bg-red-950/30",
      border: "border-red-200 dark:border-red-800",
      icon: Lock,
    },
    api: {
      bg: "bg-purple-50 dark:bg-purple-950/30",
      border: "border-purple-200 dark:border-purple-800",
      icon: Globe,
    },
    component: {
      bg: "bg-pink-50 dark:bg-pink-950/30",
      border: "border-pink-200 dark:border-pink-800",
      icon: Code,
    },
    database: {
      bg: "bg-orange-50 dark:bg-orange-950/30",
      border: "border-orange-200 dark:border-orange-800",
      icon: Database,
    },
    infrastructure: {
      bg: "bg-gray-50 dark:bg-gray-950/30",
      border: "border-gray-200 dark:border-gray-800",
      icon: Server,
    },
    ai: {
      bg: "bg-cyan-50 dark:bg-cyan-950/30",
      border: "border-cyan-200 dark:border-cyan-800",
      icon: Cpu,
    },
    test: {
      bg: "bg-indigo-50 dark:bg-indigo-950/30",
      border: "border-indigo-200 dark:border-indigo-800",
      icon: TestTube,
    },
    documentation: {
      bg: "bg-teal-50 dark:bg-teal-950/30",
      border: "border-teal-200 dark:border-teal-800",
      icon: FileText,
    },
  };

function CustomNode({
  data,
  selected,
}: {
  data: RepositoryNode["data"];
  selected: boolean;
}) {
  const [collapsed, setCollapsed] = useState(data.collapsed || false);
  // Default to 'file' type since data doesn't have type property
  const colors = nodeColors.file;
  const Icon = colors.icon;

  const toggleCollapse = useCallback(() => {
    setCollapsed(!collapsed);
    data.collapsed = !collapsed;
  }, [collapsed, data]);

  return (
    <div
      className={`px-4 py-3 rounded-lg border-2 ${colors.bg} ${colors.border} ${selected ? "ring-2 ring-primary ring-offset-2" : ""} shadow-sm transition-all duration-200 hover:shadow-md min-w-[200px]`}
    >
      <div className="flex items-center gap-2">
        <Icon className="h-4 w-4 text-foreground/70" />
        <span className="text-sm font-medium text-foreground truncate flex-1">
          {data.label}
        </span>
        {data.children && data.children.length > 0 && (
          <button
            onClick={toggleCollapse}
            className="p-1 hover:bg-foreground/10 rounded transition-colors"
          >
            {collapsed ? (
              <ChevronRight className="h-3 w-3" />
            ) : (
              <ChevronDown className="h-3 w-3" />
            )}
          </button>
        )}
      </div>
      {(data.complexity !== undefined || data.securityIssues !== undefined) && (
        <div className="flex gap-2 mt-2">
          {data.complexity !== undefined && (
            <Badge variant="outline" className="text-xs h-5">
              C: {data.complexity}
            </Badge>
          )}
          {data.securityIssues !== undefined && data.securityIssues > 0 && (
            <Badge variant="outline" className="text-xs h-5">
              {data.securityIssues} issues
            </Badge>
          )}
        </div>
      )}
    </div>
  );
}

const nodeTypes: NodeTypes = {
  custom: CustomNode,
};

interface RepositoryGraphProps {
  data: {
    nodes: RepositoryNode[];
    edges: Edge[];
  };
  onNodeClick?: (node: RepositoryNode) => void;
}

export function RepositoryGraph({ data, onNodeClick }: RepositoryGraphProps) {
  const [nodes, setNodes, onNodesChange] = useNodesState(data.nodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(data.edges);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState<NodeType | "all">("all");
  const [selectedNode, setSelectedNode] = useState<RepositoryNode | null>(null);

  const onConnect = useCallback(
    (params: Connection) => setEdges((eds) => addEdge(params, eds)),
    [setEdges],
  );

  const filteredNodes = useMemo(() => {
    return nodes.filter((node) => {
      const matchesSearch =
        node.data.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
        node.data.path.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesFilter = filterType === "all"; // Type filtering disabled due to missing type property
      return matchesSearch && matchesFilter;
    });
  }, [nodes, searchQuery, filterType]);

  const filteredEdges = useMemo(() => {
    const nodeIds = new Set(filteredNodes.map((n) => n.id));
    return edges.filter(
      (edge) => nodeIds.has(edge.source) && nodeIds.has(edge.target),
    );
  }, [edges, filteredNodes]);

  const handleNodeClick = useCallback(
    (_: React.MouseEvent, node: RepositoryNode) => {
      setSelectedNode(node);
      onNodeClick?.(node);
    },
    [onNodeClick],
  );

  return (
    <div className="w-full h-[600px] relative">
      {/* Controls Bar */}
      <div className="absolute top-4 left-4 right-4 z-10 flex gap-2">
        <div className="flex-1 flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search files, folders, functions..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 h-10 bg-card/80 backdrop-blur border-border/60"
            />
          </div>
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value as NodeType | "all")}
            className="h-10 px-3 rounded-md border border-border/60 bg-card/80 backdrop-blur text-sm"
          >
            <option value="all">All Types</option>
            <option value="folder">Folders</option>
            <option value="file">Files</option>
            <option value="config">Configs</option>
            <option value="secret">Secrets</option>
            <option value="api">API Routes</option>
            <option value="component">Components</option>
            <option value="database">Database</option>
            <option value="infrastructure">Infrastructure</option>
            <option value="ai">AI Models</option>
            <option value="test">Tests</option>
            <option value="documentation">Documentation</option>
          </select>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="icon"
            className="h-10 w-10 bg-card/80 backdrop-blur border-border/60"
          >
            <ZoomIn className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            className="h-10 w-10 bg-card/80 backdrop-blur border-border/60"
          >
            <ZoomOut className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            className="h-10 w-10 bg-card/80 backdrop-blur border-border/60"
          >
            <Maximize2 className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Node Details Panel */}
      {selectedNode && (
        <Card className="absolute top-20 right-4 z-10 w-80 bg-card/95 backdrop-blur border-border/60 shadow-lg">
          <CardContent className="p-4">
            <div className="flex items-start justify-between mb-3">
              <div>
                <h3 className="font-semibold text-sm">
                  {selectedNode.data.label}
                </h3>
                <p className="text-xs text-muted-foreground mt-1">
                  {selectedNode.data.path}
                </p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                onClick={() => setSelectedNode(null)}
              >
                ×
              </Button>
            </div>
            <div className="space-y-2 text-xs">
              {selectedNode.data.language && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Language:</span>
                  <span className="font-medium">
                    {selectedNode.data.language}
                  </span>
                </div>
              )}
              {selectedNode.data.size && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Size:</span>
                  <span className="font-medium">
                    {selectedNode.data.size} bytes
                  </span>
                </div>
              )}
              {selectedNode.data.complexity !== undefined && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Complexity:</span>
                  <span className="font-medium">
                    {selectedNode.data.complexity}
                  </span>
                </div>
              )}
              {selectedNode.data.securityIssues !== undefined && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">
                    Security Issues:
                  </span>
                  <span
                    className={`font-medium ${selectedNode.data.securityIssues > 0 ? "text-destructive" : "text-success"}`}
                  >
                    {selectedNode.data.securityIssues}
                  </span>
                </div>
              )}
            </div>
            <Button className="w-full mt-4" size="sm">
              View Details
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Graph */}
      <ReactFlow
        nodes={filteredNodes.map((n) => ({ ...n, type: "custom" }))}
        edges={filteredEdges.map((e) => ({
          ...e,
          animated: true,
          style: { stroke: "hsl(var(--border))", strokeWidth: 1 },
          markerEnd: {
            type: MarkerType.ArrowClosed,
            color: "hsl(var(--border))",
          },
        }))}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onNodeClick={handleNodeClick}
        nodeTypes={nodeTypes}
        fitView
        className="bg-background"
      >
        <Background color="hsl(var(--border))" gap={16} />
        <Controls className="bg-card/80 backdrop-blur border-border/60" />
        <MiniMap
          className="bg-card/80 backdrop-blur border-border/60"
          nodeColor={(node) => {
            const colors =
              nodeColors[
                (node.data as RepositoryNode["data"]).type as NodeType
              ] || nodeColors.file;
            return colors.bg;
          }}
        />
      </ReactFlow>
    </div>
  );
}
