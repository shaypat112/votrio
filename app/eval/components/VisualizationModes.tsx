"use client";

import { useState, useCallback, useRef, useMemo } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import {
  OrbitControls,
  PerspectiveCamera,
  Environment,
} from "@react-three/drei";
import * as THREE from "three";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Box,
  Network,
  Layers,
  Globe,
  Activity,
  Zap,
  Maximize2,
  Minimize2,
  RotateCw,
  Settings,
} from "lucide-react";

type VisualizationMode =
  "force-directed" | "layered" | "galaxy" | "neural" | "hierarchy" | "timeline";

interface VisualizationModesProps {
  nodes: Array<{
    id: string;
    label: string;
    type: string;
    x: number;
    y: number;
    z: number;
  }>;
  edges: Array<{ source: string; target: string; strength: number }>;
  onModeChange?: (mode: VisualizationMode) => void;
}

function Node({
  position,
  color,
  size,
  onClick,
}: {
  position: [number, number, number];
  color: string;
  size: number;
  onClick?: () => void;
}) {
  const meshRef = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    if (meshRef.current) {
      meshRef.current.rotation.y += 0.01;
    }
  });

  return (
    <mesh ref={meshRef} position={position} onClick={onClick}>
      <sphereGeometry args={[size, 32, 32]} />
      <meshStandardMaterial color={color} metalness={0.3} roughness={0.4} />
    </mesh>
  );
}

function Edge({
  start,
  end,
  color,
  strength,
}: {
  start: [number, number, number];
  end: [number, number, number];
  color: string;
  strength: number;
}) {
  const points = useMemo(
    () => [new THREE.Vector3(...start), new THREE.Vector3(...end)],
    [start, end],
  );

  return (
    <line>
      <bufferGeometry attach="geometry" setFromPoints={points} />
      <lineBasicMaterial attach="material" color={color} linewidth={strength} />
    </line>
  );
}

export function VisualizationModes({
  nodes,
  edges,
  onModeChange,
}: VisualizationModesProps) {
  const [mode, setMode] = useState<VisualizationMode>("force-directed");
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [autoRotate, setAutoRotate] = useState(true);
  const containerRef = useRef<HTMLDivElement>(null);

  const nodePositions = useMemo(() => {
    const positions: Record<string, [number, number, number]> = {};

    nodes.forEach((node, index) => {
      switch (mode) {
        case "force-directed":
          const angle = (index / nodes.length) * Math.PI * 2;
          const radius = 5 + Math.random() * 3;
          positions[node.id] = [
            Math.cos(angle) * radius,
            (Math.random() - 0.5) * 4,
            Math.sin(angle) * radius,
          ];
          break;
        case "layered":
          const layer = Math.floor(index / (nodes.length / 4));
          const layerAngle =
            ((index % (nodes.length / 4)) / (nodes.length / 4)) * Math.PI * 2;
          positions[node.id] = [
            Math.cos(layerAngle) * 4,
            (layer - 1.5) * 3,
            Math.sin(layerAngle) * 4,
          ];
          break;
        case "galaxy":
          const spiralAngle = index * 0.5;
          const spiralRadius = index * 0.3;
          positions[node.id] = [
            Math.cos(spiralAngle) * spiralRadius,
            (Math.random() - 0.5) * 2,
            Math.sin(spiralAngle) * spiralRadius,
          ];
          break;
        case "neural":
          const layerNeural = Math.floor(index / (nodes.length / 3));
          const xNeural = (layerNeural - 1) * 4;
          const yNeural =
            ((index % (nodes.length / 3)) - nodes.length / 6) * 0.8;
          positions[node.id] = [xNeural, yNeural, 0];
          break;
        case "hierarchy":
          const level = Math.floor(Math.log2(index + 1));
          const posInLevel = index - Math.pow(2, level) + 1;
          const totalInLevel = Math.pow(2, level);
          const xHier = (posInLevel / totalInLevel - 0.5) * 8;
          positions[node.id] = [xHier, -level * 2, 0];
          break;
        case "timeline":
          const time = index * 0.5;
          positions[node.id] = [
            (Math.random() - 0.5) * 6,
            (Math.random() - 0.5) * 4,
            time - 5,
          ];
          break;
        default:
          positions[node.id] = [node.x, node.y, node.z];
      }
    });

    return positions;
  }, [nodes, mode]);

  const getNodeColor = (type: string) => {
    const colors: Record<string, string> = {
      folder: "#3b82f6",
      file: "#22c55e",
      config: "#eab308",
      secret: "#ef4444",
      api: "#a855f7",
      component: "#ec4899",
      database: "#f97316",
      infrastructure: "#6b7280",
      ai: "#06b6d4",
      test: "#6366f1",
      documentation: "#14b8a6",
    };
    return colors[type] || "#94a3b8";
  };

  const handleModeChange = useCallback(
    (newMode: VisualizationMode) => {
      setMode(newMode);
      onModeChange?.(newMode);
    },
    [onModeChange],
  );

  const modeConfigs: Array<{
    id: VisualizationMode;
    label: string;
    icon: any;
    description: string;
  }> = [
    {
      id: "force-directed",
      label: "Force Directed",
      icon: Network,
      description: "Physics-based layout",
    },
    {
      id: "layered",
      label: "Layered",
      icon: Layers,
      description: "Architecture layers",
    },
    {
      id: "galaxy",
      label: "Galaxy",
      icon: Globe,
      description: "Spiral distribution",
    },
    {
      id: "neural",
      label: "Neural",
      icon: Activity,
      description: "Network topology",
    },
    {
      id: "hierarchy",
      label: "Hierarchy",
      icon: Box,
      description: "Tree structure",
    },
    {
      id: "timeline",
      label: "Timeline",
      icon: Zap,
      description: "Time evolution",
    },
  ];

  return (
    <div
      className={`relative ${isFullscreen ? "fixed inset-0 z-50 bg-background" : "h-[500px] rounded-lg overflow-hidden"}`}
    >
      {/* Controls */}
      <div className="absolute top-4 left-4 right-4 z-10 flex gap-2">
        <div className="flex gap-1 bg-card/80 backdrop-blur border border-border/60 rounded-lg p-1">
          {modeConfigs.map((config) => {
            const Icon = config.icon;
            return (
              <Button
                key={config.id}
                variant={mode === config.id ? "default" : "ghost"}
                size="sm"
                onClick={() => handleModeChange(config.id)}
                className="h-8"
                title={config.description}
              >
                <Icon className="h-4 w-4" />
              </Button>
            );
          })}
        </div>
        <div className="flex gap-1 bg-card/80 backdrop-blur border border-border/60 rounded-lg p-1 ml-auto">
          <Button
            variant={autoRotate ? "default" : "ghost"}
            size="sm"
            onClick={() => setAutoRotate(!autoRotate)}
            className="h-8"
            title="Auto Rotate"
          >
            <RotateCw
              className={`h-4 w-4 ${autoRotate ? "animate-spin" : ""}`}
            />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsFullscreen(!isFullscreen)}
            className="h-8"
            title={isFullscreen ? "Exit Fullscreen" : "Fullscreen"}
          >
            {isFullscreen ? (
              <Minimize2 className="h-4 w-4" />
            ) : (
              <Maximize2 className="h-4 w-4" />
            )}
          </Button>
        </div>
      </div>

      {/* Mode Info */}
      <div className="absolute bottom-4 left-4 z-10">
        <Card className="bg-card/80 backdrop-blur border-border/60">
          <CardContent className="p-3">
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-xs">
                {modeConfigs.find((c) => c.id === mode)?.label}
              </Badge>
              <span className="text-xs text-muted-foreground">
                {nodes.length} nodes • {edges.length} connections
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 3D Canvas */}
      <div ref={containerRef} className="w-full h-full">
        <Canvas>
          <PerspectiveCamera makeDefault position={[0, 0, 15]} />
          <OrbitControls
            autoRotate={autoRotate}
            autoRotateSpeed={0.5}
            enableDamping
            dampingFactor={0.05}
          />
          <Environment preset="city" />
          <ambientLight intensity={0.5} />
          <pointLight position={[10, 10, 10]} intensity={1} />
          <pointLight position={[-10, -10, -10]} intensity={0.5} />

          {/* Nodes */}
          {nodes.map((node) => (
            <Node
              key={node.id}
              position={nodePositions[node.id] || [0, 0, 0]}
              color={getNodeColor(node.type)}
              size={0.3}
            />
          ))}

          {/* Edges */}
          {edges.map((edge, index) => {
            const startPos = nodePositions[edge.source];
            const endPos = nodePositions[edge.target];
            if (!startPos || !endPos) return null;

            return (
              <Edge
                key={index}
                start={startPos}
                end={endPos}
                color="#475569"
                strength={Math.min(edge.strength, 2)}
              />
            );
          })}
        </Canvas>
      </div>

      {/* Legend */}
      <div className="absolute bottom-4 right-4 z-10">
        <Card className="bg-card/80 backdrop-blur border-border/60">
          <CardContent className="p-3">
            <div className="text-xs font-medium mb-2">Node Types</div>
            <div className="space-y-1">
              {[
                { type: "folder", label: "Folders", color: "#3b82f6" },
                { type: "file", label: "Files", color: "#22c55e" },
                { type: "api", label: "API Routes", color: "#a855f7" },
                { type: "secret", label: "Secrets", color: "#ef4444" },
                { type: "database", label: "Database", color: "#f97316" },
              ].map((item) => (
                <div
                  key={item.type}
                  className="flex items-center gap-2 text-xs"
                >
                  <div
                    className="w-2 h-2 rounded-full"
                    style={{ backgroundColor: item.color }}
                  />
                  <span className="text-muted-foreground">{item.label}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
