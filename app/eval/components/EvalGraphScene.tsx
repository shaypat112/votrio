"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ChevronDown,
  ChevronUp,
  Expand,
  GitCompareArrows,
  Minimize,
  Radar,
  ScanLine,
  Sparkles,
} from "lucide-react";
import type { EvalCommandId, EvalNode, EvalWorkspaceGraph } from "../lib/types";
import { EvalNodeWorld } from "./EvalNodeWorld";

function useEvalSceneTokens() {
  return useMemo(() => {
    if (typeof window === "undefined") {
      return {
        fog: "#05070d",
        line: "#334155",
        accent: "#7dd3fc",
        accentStrong: "#38bdf8",
        compare: "#f59e0b",
        danger: "#f97316",
        success: "#36d399",
        grid: "#1d4ed8",
        border: "#0f172a",
      };
    }

    const root = document.documentElement;
    const styles = getComputedStyle(root);
    const read = (name: string, fallback: string) =>
      styles.getPropertyValue(name).trim() || fallback;

    return {
      fog: read("--eval-fog", "#05070d"),
      line: read("--eval-line", "#334155"),
      accent: read("--eval-accent-strong", "#7dd3fc"),
      accentStrong: read("--eval-accent", "#38bdf8"),
      compare: read("--eval-compare", "#f59e0b"),
      danger: read("--eval-danger", "#f97316"),
      success: read("--eval-success", "#36d399"),
      grid: read("--eval-grid", "#1d4ed8"),
      border: read("--eval-border", "#0f172a"),
    };
  }, []);
}

function SceneControls() {
  const { camera, gl } = useThree();
  const controlsRef = useRef<OrbitControls | null>(null);

  useEffect(() => {
    const controls = new OrbitControls(camera, gl.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controls.minDistance = 80;
    controls.maxDistance = 540;
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
  tokens,
}: {
  graph: EvalWorkspaceGraph;
  nodeMap: Map<string, EvalNode>;
  highlightedIds: Set<string>;
  tokens: ReturnType<typeof useEvalSceneTokens>;
}) {
  return (
    <>
      {graph.edges.slice(0, 220).map((edge, index) => {
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

        const crossRepo = source.layer !== target.layer;
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
              color={
                isHot ? tokens.danger : crossRepo ? tokens.accent : tokens.line
              }
              transparent
              opacity={isHot ? 0.92 : crossRepo ? 0.4 : 0.24}
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
  tokens,
}: {
  graph: EvalWorkspaceGraph;
  activeCommand: EvalCommandId | null;
  highlightedIds: Set<string>;
  selectedNodeId: string | null;
  onSelectNode: (nodeId: string) => void;
  tokens: ReturnType<typeof useEvalSceneTokens>;
}) {
  return (
    <>
      {graph.nodes.map((node) => {
        const isHighlighted = highlightedIds.has(node.id);
        const isPatched =
          activeCommand === "fix" && !highlightedIds.has(node.id);
        const isSelected = selectedNodeId === node.id;
        const scale = 1 + node.risk * 0.85 + (isSelected ? 0.35 : 0);
        const roleColor =
          node.role === "sink"
            ? tokens.danger
            : node.role === "source"
              ? tokens.accent
              : node.role === "bridge"
                ? tokens.accentStrong
                : tokens.line;
        const wireColor = isPatched ? tokens.success : roleColor;
        const ringColor = node.layer === "compare" ? tokens.compare : wireColor;

        return (
          <group
            key={node.id}
            position={[node.x, node.y, node.z * 18]}
            scale={scale}
            onClick={() => onSelectNode(node.id)}
          >
            <mesh>
              <sphereGeometry args={[3.7, 18, 18]} />
              <meshStandardMaterial
                color={wireColor}
                emissive={new THREE.Color(wireColor)}
                emissiveIntensity={
                  isHighlighted ? 1.8 : isSelected ? 1.15 : 0.58
                }
                roughness={0.24}
                metalness={0.46}
              />
            </mesh>
            <mesh rotation={[Math.PI / 2, 0, 0]}>
              <torusGeometry args={[6.2, 0.18, 8, 48]} />
              <meshBasicMaterial
                color={ringColor}
                transparent
                opacity={isHighlighted ? 0.95 : 0.42}
              />
            </mesh>
            <mesh rotation={[Math.PI / 2, Math.PI / 4, 0]}>
              <ringGeometry args={[7.8, 8.2, 32]} />
              <meshBasicMaterial
                color={ringColor}
                transparent
                opacity={isSelected ? 0.7 : 0.22}
                side={THREE.DoubleSide}
              />
            </mesh>
          </group>
        );
      })}
    </>
  );
}

function JarvisFrame({
  hasCompare,
  tokens,
}: {
  hasCompare: boolean;
  tokens: ReturnType<typeof useEvalSceneTokens>;
}) {
  return (
    <>
      <gridHelper
        args={[620, 34, tokens.grid, tokens.border]}
        position={[0, -120, 0]}
      />
      <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, -118, 0]}>
        <ringGeometry args={[58, 62, 64]} />
        <meshBasicMaterial
          color={tokens.accentStrong}
          transparent
          opacity={0.3}
          side={THREE.DoubleSide}
        />
      </mesh>
      <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, -118, 0]}>
        <ringGeometry args={[108, 110, 64]} />
        <meshBasicMaterial
          color={tokens.accent}
          transparent
          opacity={0.16}
          side={THREE.DoubleSide}
        />
      </mesh>
      {hasCompare ? (
        <>
          <mesh rotation={[Math.PI / 2, 0, 0]} position={[-128, -117.5, 0]}>
            <ringGeometry args={[40, 42, 64]} />
            <meshBasicMaterial
              color={tokens.accentStrong}
              transparent
              opacity={0.22}
              side={THREE.DoubleSide}
            />
          </mesh>
          <mesh rotation={[Math.PI / 2, 0, 0]} position={[128, -117.5, 0]}>
            <ringGeometry args={[40, 42, 64]} />
            <meshBasicMaterial
              color={tokens.compare}
              transparent
              opacity={0.22}
              side={THREE.DoubleSide}
            />
          </mesh>
        </>
      ) : null}
      <mesh position={[0, 0, -140]}>
        <sphereGeometry args={[8, 16, 16]} />
        <meshBasicMaterial color={tokens.accent} transparent opacity={0.45} />
      </mesh>
    </>
  );
}

function Scene({
  graph,
  activeCommand,
  highlightedIds,
  selectedNodeId,
  onSelectNode,
  tokens,
}: {
  graph: EvalWorkspaceGraph;
  activeCommand: EvalCommandId | null;
  highlightedIds: Set<string>;
  selectedNodeId: string | null;
  onSelectNode: (nodeId: string) => void;
  tokens: ReturnType<typeof useEvalSceneTokens>;
}) {
  const nodeMap = useMemo(
    () => new Map(graph.nodes.map((node) => [node.id, node])),
    [graph.nodes],
  );

  return (
    <>
      <color attach="background" args={[tokens.fog]} />
      <fog attach="fog" args={[tokens.fog, 180, 760]} />
      <ambientLight intensity={0.72} />
      <pointLight
        position={[120, 140, 120]}
        intensity={1.45}
        color={tokens.accent}
      />
      <pointLight
        position={[-140, -40, 120]}
        intensity={1.05}
        color={tokens.accentStrong}
      />
      <pointLight
        position={[0, 0, -180]}
        intensity={0.72}
        color={tokens.accentStrong}
      />
      <SceneControls />
      <JarvisFrame hasCompare={Boolean(graph.compareTarget)} tokens={tokens} />
      <GraphEdges
        graph={graph}
        nodeMap={nodeMap}
        highlightedIds={highlightedIds}
        tokens={tokens}
      />
      <GraphNodes
        graph={graph}
        activeCommand={activeCommand}
        highlightedIds={highlightedIds}
        selectedNodeId={selectedNodeId}
        onSelectNode={onSelectNode}
        tokens={tokens}
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
  onCommandChange,
  fullscreen,
  onToggleFullscreen,
}: {
  graph: EvalWorkspaceGraph | null;
  activeCommand: EvalCommandId | null;
  highlightedIds: Set<string>;
  selectedNodeId: string | null;
  onSelectNode: (nodeId: string) => void;
  onCommandChange: (command: EvalCommandId) => void;
  fullscreen: boolean;
  onToggleFullscreen: () => void;
}) {
  const tokens = useEvalSceneTokens();
  const [feedMinimized, setFeedMinimized] = useState(false);
  const [telemetryMinimized, setTelemetryMinimized] = useState(false);
  const [nodeWorldId, setNodeWorldId] = useState<string | null>(null);

  const summaryTone =
    activeCommand === "trace"
      ? "PATH TRACE"
      : activeCommand === "sinks"
        ? "SINK SWEEP"
        : activeCommand === "fix"
          ? "PATCH PREVIEW"
          : "GRAPH READY";

  const sortedNodes = useMemo(
    () =>
      graph
        ? [...graph.nodes]
            .sort((left, right) => right.risk - left.risk)
            .slice(0, 16)
        : [],
    [graph],
  );

  const directoryHotspots = useMemo(() => {
    if (!graph) return [];
    const scores = new Map<
      string,
      { count: number; risk: number; layer: "primary" | "compare" | undefined }
    >();
    for (const node of graph.nodes) {
      const key = `${node.layer ?? "primary"}:${node.directory}`;
      const current = scores.get(key) ?? {
        count: 0,
        risk: 0,
        layer: node.layer,
      };
      current.count += 1;
      current.risk += node.risk;
      scores.set(key, current);
    }

    return [...scores.entries()]
      .map(([compoundKey, value]) => {
        const [, directory] = compoundKey.split(":");
        return {
          directory,
          count: value.count,
          score: Number((value.risk / value.count).toFixed(2)),
          layer: value.layer,
        };
      })
      .sort((left, right) => right.score - left.score)
      .slice(0, 7);
  }, [graph]);

  const commandButtons: Array<{ id: EvalCommandId; label: string }> = [
    { id: "trace", label: "Trace path" },
    { id: "sinks", label: "Show sinks" },
    { id: "fix", label: "Patch view" },
  ];

  const sceneBody = (
    <div
      className={`relative overflow-hidden bg-[radial-gradient(circle_at_top,color-mix(in_oklab,var(--eval-accent)_18%,transparent),transparent_28%),radial-gradient(circle_at_center,color-mix(in_oklab,var(--eval-compare)_10%,transparent),transparent_32%),linear-gradient(180deg,var(--eval-bg)_0%,var(--eval-bg-elevated)_56%,var(--eval-bg)_100%)] ${fullscreen ? "h-screen" : "h-[880px]"}`}
    >
      {graph ? (
        <>
          <Canvas
            camera={{
              position: [0, 0, graph.compareTarget ? 310 : 240],
              fov: 50,
            }}
          >
            <Scene
              graph={graph}
              activeCommand={activeCommand}
              highlightedIds={highlightedIds}
              selectedNodeId={selectedNodeId}
              tokens={tokens}
              onSelectNode={(nodeId) => {
                onSelectNode(nodeId);
                setNodeWorldId(nodeId);
              }}
            />
          </Canvas>

          <div className="pointer-events-none absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-[color:var(--eval-accent-soft)] via-black/20 to-transparent" />

          <div className="absolute left-5 top-5 max-w-md rounded-3xl border border-[color:var(--eval-border)] bg-[color:color-mix(in_oklab,var(--eval-panel)_84%,transparent)] p-4 shadow-[0_0_40px_color-mix(in_oklab,var(--eval-accent)_10%,transparent)] backdrop-blur">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs uppercase tracking-[0.26em] text-[color:var(--eval-accent-strong)]">
                  Spatial Telemetry
                </p>
                <p className="mt-1 text-sm text-[color:var(--eval-text)]">
                  {summaryTone}
                </p>
              </div>
              <div className="flex items-center gap-2">
                {graph.compareTarget ? (
                  <div className="inline-flex items-center gap-2 rounded-full border border-[color:var(--eval-border)] bg-[color:var(--eval-compare-soft)] px-3 py-1 text-[11px] uppercase tracking-[0.18em] text-[color:var(--eval-compare)]">
                    <GitCompareArrows className="h-3.5 w-3.5" />
                    Compare active
                  </div>
                ) : (
                  <div className="inline-flex items-center gap-2 rounded-full border border-[color:var(--eval-border)] bg-[color:var(--eval-accent-soft)] px-3 py-1 text-[11px] uppercase tracking-[0.18em] text-[color:var(--eval-accent-strong)]">
                    <Radar className="h-3.5 w-3.5" />
                    Single repo
                  </div>
                )}
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => setTelemetryMinimized((value) => !value)}
                  className="h-8 w-8 text-[color:var(--eval-accent-strong)] hover:bg-[color:var(--eval-accent-soft)] hover:text-[color:var(--eval-text)]"
                >
                  {telemetryMinimized ? (
                    <ChevronDown className="h-4 w-4" />
                  ) : (
                    <ChevronUp className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>

            {!telemetryMinimized ? (
              <>
                <div className="mt-4 flex flex-wrap gap-2">
                  {commandButtons.map((command) => {
                    const active = activeCommand === command.id;
                    return (
                      <button
                        key={command.id}
                        type="button"
                        onClick={() => onCommandChange(command.id)}
                        className={`rounded-full border px-3 py-1.5 text-[11px] uppercase tracking-[0.22em] transition ${
                          active
                            ? "border-[color:var(--eval-accent-strong)] bg-[color:var(--eval-accent-soft)] text-[color:var(--eval-text)] shadow-[0_0_24px_color-mix(in_oklab,var(--eval-accent)_20%,transparent)]"
                            : "border-[color:var(--eval-border)] bg-[color:var(--eval-panel)] text-[color:var(--eval-text-muted)] hover:border-[color:var(--eval-accent)] hover:text-[color:var(--eval-text)]"
                        }`}
                      >
                        {command.label}
                      </button>
                    );
                  })}
                </div>

                <div className="mt-4 grid grid-cols-2 gap-2">
                  <div className="rounded-2xl border border-[color:var(--eval-border)] bg-[color:var(--eval-panel-soft)] p-3">
                    <p className="text-[10px] uppercase tracking-[0.2em] text-[color:var(--eval-text-muted)]">
                      Files mapped
                    </p>
                    <p className="mt-1 text-lg font-semibold text-[color:var(--eval-text)]">
                      {graph.summary.files}
                    </p>
                  </div>
                  <div className="rounded-2xl border border-[color:var(--eval-border)] bg-[color:var(--eval-panel-soft)] p-3">
                    <p className="text-[10px] uppercase tracking-[0.2em] text-[color:var(--eval-text-muted)]">
                      Connected paths
                    </p>
                    <p className="mt-1 text-lg font-semibold text-[color:var(--eval-text)]">
                      {graph.edges.length}
                    </p>
                  </div>
                </div>
              </>
            ) : null}
          </div>

          <div className="absolute right-5 top-5 flex gap-2">
            <Button
              variant="outline"
              onClick={() =>
                selectedNodeId ? setNodeWorldId(selectedNodeId) : null
              }
              className="border-[color:var(--eval-border)] bg-[color:var(--eval-panel)] text-[color:var(--eval-text)] backdrop-blur hover:bg-[color:var(--eval-panel-soft)]"
              disabled={!selectedNodeId}
            >
              <Sparkles className="h-4 w-4" />
              Open node world
            </Button>
            <Button
              variant="outline"
              onClick={onToggleFullscreen}
              className="border-[color:var(--eval-border)] bg-[color:var(--eval-panel)] text-[color:var(--eval-text)] backdrop-blur hover:bg-[color:var(--eval-panel-soft)]"
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

          <div className="absolute bottom-5 right-5 w-full max-w-md rounded-3xl border border-[color:var(--eval-border)] bg-[color:color-mix(in_oklab,var(--eval-panel)_84%,transparent)] shadow-[0_0_40px_color-mix(in_oklab,var(--eval-accent)_10%,transparent)] backdrop-blur">
            <div className="flex items-center justify-between border-b border-[color:var(--eval-border)] px-4 py-3">
              <div>
                <p className="text-xs uppercase tracking-[0.24em] text-[color:var(--eval-accent-strong)]">
                  Repository feed
                </p>
                <p className="mt-1 text-xs text-[color:var(--eval-text-muted)]">
                  Scroll for hotspots, queue, and cross-repo sectors.
                </p>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => setFeedMinimized((value) => !value)}
                className="h-8 w-8 text-[color:var(--eval-accent-strong)] hover:bg-[color:var(--eval-accent-soft)] hover:text-[color:var(--eval-text)]"
              >
                {feedMinimized ? (
                  <ChevronUp className="h-4 w-4" />
                ) : (
                  <ChevronDown className="h-4 w-4" />
                )}
              </Button>
            </div>

            {!feedMinimized ? (
              <div className="max-h-[440px] space-y-4 overflow-y-auto px-4 py-4">
                <div className="grid gap-3 md:grid-cols-2">
                  <div className="rounded-2xl border border-[color:var(--eval-border)] bg-[color:var(--eval-panel-soft)] p-3">
                    <p className="text-sm font-semibold text-[color:var(--eval-text)]">
                      {graph.compareTarget
                        ? graph.repo.split(" <> ")[0]
                        : graph.repo}
                    </p>
                    <p className="mt-1 text-xs text-[color:var(--eval-text-muted)]">
                      {graph.repoMeta.description ??
                        "No GitHub description available."}
                    </p>
                  </div>
                  {graph.compareTarget ? (
                    <div className="rounded-2xl border border-[color:var(--eval-border)] bg-[color:var(--eval-compare-soft)] p-3">
                      <p className="text-sm font-semibold text-[color:var(--eval-text)]">
                        {graph.compareTarget.repo}
                      </p>
                      <p className="mt-1 text-xs text-[color:var(--eval-text-muted)]">
                        {graph.compareTarget.repoMeta.description ??
                          "No GitHub description available."}
                      </p>
                    </div>
                  ) : null}
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs text-[color:var(--eval-text-muted)]">
                  <div className="rounded-xl border border-[color:var(--eval-border)] bg-[color:var(--eval-panel-soft)] p-3">
                    <p className="text-[color:var(--eval-text-muted)]">
                      Sources
                    </p>
                    <p className="mt-1 text-sm font-medium text-[color:var(--eval-text)]">
                      {graph.summary.sources}
                    </p>
                  </div>
                  <div className="rounded-xl border border-[color:var(--eval-border)] bg-[color:var(--eval-panel-soft)] p-3">
                    <p className="text-[color:var(--eval-text-muted)]">Sinks</p>
                    <p className="mt-1 text-sm font-medium text-[color:var(--eval-text)]">
                      {graph.summary.sinks}
                    </p>
                  </div>
                  <div className="rounded-xl border border-[color:var(--eval-border)] bg-[color:var(--eval-panel-soft)] p-3">
                    <p className="text-[color:var(--eval-text-muted)]">
                      Bridges
                    </p>
                    <p className="mt-1 text-sm font-medium text-[color:var(--eval-text)]">
                      {graph.summary.bridges}
                    </p>
                  </div>
                  <div className="rounded-xl border border-[color:var(--eval-border)] bg-[color:var(--eval-panel-soft)] p-3">
                    <p className="text-[color:var(--eval-text-muted)]">
                      High-risk queue
                    </p>
                    <p className="mt-1 text-sm font-medium text-[color:var(--eval-text)]">
                      {graph.summary.highRisk}
                    </p>
                  </div>
                </div>

                <div className="rounded-2xl border border-[color:var(--eval-border)] bg-[color:var(--eval-panel-soft)] p-3">
                  <p className="text-xs uppercase tracking-[0.22em] text-[color:var(--eval-accent-strong)]">
                    Directory hotspots
                  </p>
                  <div className="mt-3 space-y-2">
                    {directoryHotspots.map((spot) => (
                      <button
                        key={`${spot.layer}:${spot.directory}`}
                        type="button"
                        onClick={() => {
                          const match = graph.nodes.find(
                            (node) =>
                              node.directory === spot.directory &&
                              node.layer === spot.layer,
                          );
                          if (match) {
                            onSelectNode(match.id);
                            setNodeWorldId(match.id);
                          }
                        }}
                        className="flex w-full items-center justify-between rounded-xl border border-[color:var(--eval-border)] bg-[color:var(--eval-panel)] px-3 py-2 text-left hover:border-[color:var(--eval-accent)]"
                      >
                        <div>
                          <p className="text-sm text-[color:var(--eval-text)]">
                            {spot.directory}
                          </p>
                          <p className="text-[11px] uppercase tracking-[0.18em] text-[color:var(--eval-text-muted)]">
                            {spot.layer === "compare" ? "compare" : "primary"} ·{" "}
                            {spot.count} files
                          </p>
                        </div>
                        <p className="text-sm font-medium text-[color:var(--eval-accent-strong)]">
                          {Math.round(spot.score * 100)} heat
                        </p>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="rounded-2xl border border-[color:var(--eval-border)] bg-[color:var(--eval-panel-soft)] p-3">
                  <p className="text-xs uppercase tracking-[0.22em] text-[color:var(--eval-accent-strong)]">
                    Node queue
                  </p>
                  <div className="mt-3 space-y-2">
                    {sortedNodes.map((node) => (
                      <button
                        key={node.id}
                        type="button"
                        onClick={() => {
                          onSelectNode(node.id);
                          setNodeWorldId(node.id);
                        }}
                        className={`flex w-full items-start justify-between rounded-xl border px-3 py-2 text-left transition ${
                          selectedNodeId === node.id
                            ? "border-[color:var(--eval-accent)] bg-[color:var(--eval-accent-soft)]"
                            : "border-[color:var(--eval-border)] bg-[color:var(--eval-panel)] hover:border-[color:var(--eval-accent)]"
                        }`}
                      >
                        <div className="min-w-0">
                          <p className="truncate text-sm text-[color:var(--eval-text)]">
                            {node.path}
                          </p>
                          <p className="mt-1 text-[11px] uppercase tracking-[0.18em] text-[color:var(--eval-text-muted)]">
                            {node.originRepo}
                          </p>
                        </div>
                        <p className="ml-3 shrink-0 text-xs uppercase tracking-[0.18em] text-[color:var(--eval-accent-strong)]">
                          {node.role}
                        </p>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            ) : null}
          </div>

          <EvalNodeWorld
            graph={graph}
            nodeId={nodeWorldId}
            onClose={() => setNodeWorldId(null)}
            onSelectNode={(nodeId) => {
              onSelectNode(nodeId);
              setNodeWorldId(nodeId);
            }}
          />
        </>
      ) : (
        <div className="flex h-full items-center justify-center p-8 text-center text-sm text-muted-foreground">
          Choose one or two repositories to generate the 3D workspace.
        </div>
      )}
    </div>
  );

  if (fullscreen) {
    return <div className="fixed inset-0 z-50 bg-black">{sceneBody}</div>;
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
