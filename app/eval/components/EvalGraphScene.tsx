"use client";

import { useEffect, useMemo, useRef } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Expand, Minimize, ScanLine } from "lucide-react";
import type { EvalCommandId, EvalNode, EvalPayload } from "../lib/types";

function SceneControls() {
  const { camera, gl } = useThree();
  const controlsRef = useRef<OrbitControls | null>(null);

  useEffect(() => {
    const controls = new OrbitControls(camera, gl.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controls.minDistance = 80;
    controls.maxDistance = 480;
    controlsRef.current = controls;

    return () => {
      controls.dispose();
      controlsRef.current = null;
    };
  }, [camera, gl]);

  useFrame(() => {
    controlsRef.current?.update();
  });

  return null;
}

function GraphEdges({
  graph,
  nodeMap,
  highlightedIds,
}: {
  graph: EvalPayload;
  nodeMap: Map<string, EvalNode>;
  highlightedIds: Set<string>;
}) {
  return (
    <>
      {graph.edges.slice(0, 140).map((edge, index) => {
        const source = nodeMap.get(edge.source);
        const target = nodeMap.get(edge.target);
        if (!source || !target) return null;

        const positions = new Float32Array([
          source.x,
          source.y,
          source.z * 18,
          target.x,
          target.y,
          target.z * 18,
        ]);

        const isHot =
          highlightedIds.has(edge.source) && highlightedIds.has(edge.target);

        return (
          <line key={`${edge.source}-${edge.target}-${index}`}>
            <bufferGeometry>
              <bufferAttribute
                attach="attributes-position"
                args={[positions, 3]}
              />
            </bufferGeometry>
            <lineBasicMaterial
              color={isHot ? "#ff5b5b" : "#475569"}
              transparent
              opacity={isHot ? 0.85 : 0.28}
            />
          </line>
        );
      })}
    </>
  );
}

function GraphNodes({
  graph,
  activeCommand,
  highlightedIds,
  selectedNodeId,
  onSelectNode,
}: {
  graph: EvalPayload;
  activeCommand: EvalCommandId | null;
  highlightedIds: Set<string>;
  selectedNodeId: string | null;
  onSelectNode: (nodeId: string) => void;
}) {
  return (
    <>
      {graph.nodes.map((node) => {
        const isHighlighted = highlightedIds.has(node.id);
        const isPatched = activeCommand === "fix" && !highlightedIds.has(node.id);
        const isSelected = selectedNodeId === node.id;
        const scale = 1 + node.risk * 0.85 + (isSelected ? 0.35 : 0);

        return (
          <mesh
            key={node.id}
            position={[node.x, node.y, node.z * 18]}
            scale={scale}
            onClick={() => onSelectNode(node.id)}
          >
            <sphereGeometry args={[4.4, 18, 18]} />
            <meshStandardMaterial
              color={isPatched ? "#36d399" : node.color}
              emissive={new THREE.Color(isPatched ? "#36d399" : node.color)}
              emissiveIntensity={isHighlighted ? 1.6 : isSelected ? 1.05 : 0.45}
              roughness={0.28}
              metalness={0.32}
            />
          </mesh>
        );
      })}
    </>
  );
}

function Scene({
  graph,
  activeCommand,
  highlightedIds,
  selectedNodeId,
  onSelectNode,
}: {
  graph: EvalPayload;
  activeCommand: EvalCommandId | null;
  highlightedIds: Set<string>;
  selectedNodeId: string | null;
  onSelectNode: (nodeId: string) => void;
}) {
  const nodeMap = useMemo(
    () => new Map(graph.nodes.map((node) => [node.id, node])),
    [graph.nodes],
  );

  return (
    <>
      <color attach="background" args={["#05070d"]} />
      <fog attach="fog" args={["#05070d", 180, 700]} />
      <ambientLight intensity={0.7} />
      <pointLight position={[120, 140, 120]} intensity={1.4} color="#7dd3fc" />
      <pointLight position={[-140, -40, 120]} intensity={1.2} color="#f97316" />
      <pointLight position={[0, 0, -180]} intensity={0.9} color="#63f3a6" />
      <SceneControls />
      <GraphEdges
        graph={graph}
        nodeMap={nodeMap}
        highlightedIds={highlightedIds}
      />
      <GraphNodes
        graph={graph}
        activeCommand={activeCommand}
        highlightedIds={highlightedIds}
        selectedNodeId={selectedNodeId}
        onSelectNode={onSelectNode}
      />
    </>
  );
}

export function EvalGraphScene({
  graph,
  activeCommand,
  highlightedIds,
  selectedNodeId,
  onSelectNode,
  fullscreen,
  onToggleFullscreen,
}: {
  graph: EvalPayload | null;
  activeCommand: EvalCommandId | null;
  highlightedIds: Set<string>;
  selectedNodeId: string | null;
  onSelectNode: (nodeId: string) => void;
  fullscreen: boolean;
  onToggleFullscreen: () => void;
}) {
  const selectedNode =
    graph?.nodes.find((node) => node.id === selectedNodeId) ?? graph?.nodes[0] ?? null;

  const sceneBody = (
    <div
      className={`relative overflow-hidden bg-[radial-gradient(circle_at_center,rgba(99,243,166,0.06),transparent_32%),linear-gradient(180deg,#09111f_0%,#05070d_100%)] ${fullscreen ? "h-screen" : "h-[780px]"}`}
    >
      {graph ? (
        <>
          <Canvas camera={{ position: [0, 0, 240], fov: 50 }}>
            <Scene
              graph={graph}
              activeCommand={activeCommand}
              highlightedIds={highlightedIds}
              selectedNodeId={selectedNodeId}
              onSelectNode={onSelectNode}
            />
          </Canvas>

          <div className="pointer-events-none absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-black/40 to-transparent" />
          <div className="absolute left-5 top-5 max-w-sm rounded-2xl border border-white/10 bg-black/45 p-4 backdrop-blur">
            <p className="text-xs uppercase tracking-[0.24em] text-slate-300">
              Navigation
            </p>
            <p className="mt-2 text-sm text-slate-100">
              Drag to orbit, scroll to zoom, and click any node to inspect it.
            </p>
            {selectedNode ? (
              <div className="mt-4 rounded-xl border border-white/10 bg-white/5 p-3">
                <p className="text-sm font-semibold text-white">
                  {selectedNode.path}
                </p>
                <p className="mt-1 text-xs uppercase tracking-[0.18em] text-slate-400">
                  {selectedNode.role} · risk {Math.round(selectedNode.risk * 100)}
                </p>
              </div>
            ) : null}
          </div>

          <div className="absolute right-5 top-5">
            <Button
              variant="outline"
              onClick={onToggleFullscreen}
              className="border-white/10 bg-black/45 text-white backdrop-blur hover:bg-black/60 hover:text-white"
            >
              {fullscreen ? (
                <>
                  <Minimize className="h-4 w-4" />
                  Exit full view
                </>
              ) : (
                <>
                  <Expand className="h-4 w-4" />
                  Open full view
                </>
              )}
            </Button>
          </div>

          <div className="absolute bottom-5 left-5 flex flex-wrap gap-2">
            <Badge className="border-0 bg-[#ff5b5b] text-white">
              critical path
            </Badge>
            <Badge className="border-0 bg-[#ffd166] text-black">
              ingress
            </Badge>
            <Badge className="border-0 bg-[#ff8a3d] text-white">
              data sink
            </Badge>
            <Badge className="border-0 bg-[#7dd3fc] text-black">
              bridge
            </Badge>
          </div>
        </>
      ) : (
        <div className="flex h-full items-center justify-center p-8 text-center text-sm text-muted-foreground">
          Choose a connected repository to generate the 3D map.
        </div>
      )}
    </div>
  );

  if (fullscreen) {
    return (
      <div className="fixed inset-0 z-50 bg-black">
        {sceneBody}
      </div>
    );
  }

  return (
    <Card className="overflow-hidden border-border bg-card">
      <CardHeader className="border-b border-border">
        <CardTitle className="flex items-center gap-2 text-lg">
          <ScanLine className="h-5 w-5" />
          Spatial Repository Graph
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">{sceneBody}</CardContent>
    </Card>
  );
}
