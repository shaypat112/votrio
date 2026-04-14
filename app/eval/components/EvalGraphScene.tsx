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
  Focus,
  GitCompareArrows,
  Minimize,
  Radar,
  ScanLine,
  Sparkles,
} from "lucide-react";
import type {
  EvalCommandId,
  EvalEdge,
  EvalNode,
  EvalWorkspaceGraph,
} from "../lib/types";
import { buildEvalSceneGraph, type EvalSceneCommit } from "../lib/scene-graph";

import { EvalTimelineControls } from "./EvalTimelineControls";

type Selection =
  | { kind: "node"; id: string }
  | { kind: "commit"; id: string }
  | { kind: "contributor"; id: string }
  | null;

type HoverCard =
  | {
      kind: "node";
      title: string;
      subtitle: string;
      meta: string;
    }
  | {
      kind: "commit";
      title: string;
      subtitle: string;
      meta: string;
    }
  | null;

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
        panel: "#08111f",
        glow: "#93c5fd",
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
      panel: read("--eval-panel", "#08111f"),
      glow: read("--eval-text", "#dbeafe"),
    };
  }, []);
}

function smoothStep(value: number, edge0: number, edge1: number) {
  if (edge0 === edge1) return value >= edge1 ? 1 : 0;
  const next = Math.min(1, Math.max(0, (value - edge0) / (edge1 - edge0)));
  return next * next * (3 - 2 * next);
}

function getNodeColor(
  node: EvalNode,
  tokens: ReturnType<typeof useEvalSceneTokens>,
) {
  const ext = node.extension.toLowerCase();
  if (node.risk > 0.74 || node.role === "sink") return tokens.danger;
  if (ext === "ts" || ext === "tsx") return tokens.accent;
  if (ext === "sql" || ext === "yaml" || ext === "yml") return tokens.compare;
  if (ext === "json" || ext === "md") return tokens.success;
  return node.color || tokens.line;
}

function buildFocusNodeSet(
  selection: Selection,
  graph: EvalWorkspaceGraph,
  sceneGraph: ReturnType<typeof buildEvalSceneGraph>,
) {
  if (!selection) return null;
  const ids = new Set<string>();

  if (selection.kind === "node") {
    for (const value of sceneGraph.focusMap[selection.id] ?? []) {
      if (graph.nodes.some((node) => node.id === value)) ids.add(value);
    }
    ids.add(selection.id);
  }

  if (selection.kind === "commit") {
    for (const value of sceneGraph.focusMap[selection.id] ?? []) ids.add(value);
  }

  if (selection.kind === "contributor") {
    for (const value of sceneGraph.focusMap[selection.id] ?? []) ids.add(value);
  }

  return ids;
}

function SceneCameraRig({
  focusPoint,
  compareMode,
}: {
  focusPoint: THREE.Vector3;
  compareMode: boolean;
}) {
  const { camera, gl } = useThree();
  const controlsRef = useRef<OrbitControls | null>(null);
  const targetRef = useRef(new THREE.Vector3());
  const desiredPosition = useRef(
    new THREE.Vector3(0, 0, compareMode ? 320 : 250),
  );
  const offset = useMemo(
    () => new THREE.Vector3(compareMode ? 42 : 18, 52, compareMode ? 220 : 180),
    [compareMode],
  );

  useEffect(() => {
    const controls = new OrbitControls(camera, gl.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controls.minDistance = 60;
    controls.maxDistance = 540;
    controlsRef.current = controls;

    return () => {
      controls.dispose();
      controlsRef.current = null;
    };
  }, [camera, gl]);

  useFrame((_, delta) => {
    const controls = controlsRef.current;
    if (!controls) return;

    const targetAlpha = 1 - Math.exp(-delta * 4.5);
    targetRef.current.lerp(focusPoint, targetAlpha);
    controls.target.lerp(targetRef.current, targetAlpha);

    desiredPosition.current.copy(targetRef.current).add(offset);
    camera.position.lerp(desiredPosition.current, 1 - Math.exp(-delta * 2.8));
    controls.update();
  });

  return null;
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
        args={[680, 34, tokens.grid, tokens.border]}
        position={[0, -120, 0]}
      />
      <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, -118, 0]}>
        <ringGeometry args={[58, 62, 64]} />
        <meshBasicMaterial
          color={tokens.accentStrong}
          transparent
          opacity={0.28}
          side={THREE.DoubleSide}
        />
      </mesh>
      <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, -118, 0]}>
        <ringGeometry args={[118, 122, 64]} />
        <meshBasicMaterial
          color={tokens.accent}
          transparent
          opacity={0.14}
          side={THREE.DoubleSide}
        />
      </mesh>
      {hasCompare ? (
        <>
          <mesh rotation={[Math.PI / 2, 0, 0]} position={[-142, -117.5, 0]}>
            <ringGeometry args={[40, 42, 64]} />
            <meshBasicMaterial
              color={tokens.accentStrong}
              transparent
              opacity={0.2}
              side={THREE.DoubleSide}
            />
          </mesh>
          <mesh rotation={[Math.PI / 2, 0, 0]} position={[142, -117.5, 0]}>
            <ringGeometry args={[40, 42, 64]} />
            <meshBasicMaterial
              color={tokens.compare}
              transparent
              opacity={0.2}
              side={THREE.DoubleSide}
            />
          </mesh>
        </>
      ) : null}
    </>
  );
}

function ClusterHalos({
  graph,
  sceneGraph,
  focusNodeIds,
  tokens,
}: {
  graph: EvalWorkspaceGraph;
  sceneGraph: ReturnType<typeof buildEvalSceneGraph>;
  focusNodeIds: Set<string> | null;
  tokens: ReturnType<typeof useEvalSceneTokens>;
}) {
  return (
    <>
      {sceneGraph.clusters.slice(0, 10).map((cluster) => {
        const containsFocus = focusNodeIds
          ? cluster.nodeIds.some((id) => focusNodeIds.has(id))
          : false;
        const radius = 22 + cluster.density * 2.8;
        return (
          <mesh
            key={cluster.id}
            rotation={[Math.PI / 2, 0, 0]}
            position={[
              cluster.centroid[0],
              -118 + cluster.avgRisk * 18,
              cluster.centroid[2],
            ]}
          >
            <ringGeometry args={[radius, radius + 1.8, 48]} />
            <meshBasicMaterial
              color={
                cluster.layer === "compare"
                  ? tokens.compare
                  : tokens.accentStrong
              }
              transparent
              opacity={containsFocus ? 0.42 : 0.14}
              side={THREE.DoubleSide}
            />
          </mesh>
        );
      })}
      {graph.compareTarget ? null : (
        <mesh position={[0, 0, -180]}>
          <sphereGeometry args={[10, 16, 16]} />
          <meshBasicMaterial color={tokens.accent} transparent opacity={0.4} />
        </mesh>
      )}
    </>
  );
}

function TimelineRails({
  sceneGraph,
  progress,
  tokens,
}: {
  sceneGraph: ReturnType<typeof buildEvalSceneGraph>;
  progress: number;
  tokens: ReturnType<typeof useEvalSceneTokens>;
}) {
  const axis = useMemo(
    () => new Float32Array([-220, -96, -170, -220, -96, 170]),
    [],
  );
  const scrubberZ = -170 + progress * 340;

  return (
    <>
      <line>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[axis, 3]} />
        </bufferGeometry>
        <lineBasicMaterial
          color={tokens.accentStrong}
          transparent
          opacity={0.4}
        />
      </line>
      {sceneGraph.commits.map((commit) => (
        <mesh
          key={`tick:${commit.id}`}
          position={[-220, -96, commit.position[2]]}
        >
          <sphereGeometry args={[0.85, 10, 10]} />
          <meshBasicMaterial
            color={commit.kind === "merge" ? tokens.compare : tokens.accent}
            transparent
            opacity={
              commit.sequence / Math.max(sceneGraph.commits.length - 1, 1) <=
              progress
                ? 0.9
                : 0.25
            }
          />
        </mesh>
      ))}
      <mesh position={[-220, -96, scrubberZ]}>
        <sphereGeometry args={[2.6, 16, 16]} />
        <meshBasicMaterial color={tokens.glow} transparent opacity={0.95} />
      </mesh>
    </>
  );
}

function EdgeField({
  edges,
  nodeMap,
  visibleNodeIds,
  highlightedIds,
  focusNodeIds,
  tokens,
}: {
  edges: EvalEdge[];
  nodeMap: Map<string, EvalNode>;
  visibleNodeIds: Set<string>;
  highlightedIds: Set<string>;
  focusNodeIds: Set<string> | null;
  tokens: ReturnType<typeof useEvalSceneTokens>;
}) {
  const renderedEdges = useMemo(
    () =>
      edges
        .filter(
          (edge) =>
            visibleNodeIds.has(edge.source) && visibleNodeIds.has(edge.target),
        )
        .slice(0, 380),
    [edges, visibleNodeIds],
  );

  return (
    <>
      {renderedEdges.map((edge, index) => {
        const source = nodeMap.get(edge.source);
        const target = nodeMap.get(edge.target);
        if (!source || !target) return null;

        const isHot =
          highlightedIds.has(edge.source) && highlightedIds.has(edge.target);
        const isFocused =
          focusNodeIds &&
          focusNodeIds.has(edge.source) &&
          focusNodeIds.has(edge.target);
        const crossRepo = source.layer !== target.layer;
        const midpoint = new THREE.Vector3(
          (source.x + target.x) / 2,
          (source.y + target.y) / 2 + (crossRepo ? 24 : 10),
          (source.z * 18 + target.z * 18) / 2,
        );
        const curve = new THREE.CatmullRomCurve3([
          new THREE.Vector3(source.x, source.y, source.z * 18),
          midpoint,
          new THREE.Vector3(target.x, target.y, target.z * 18),
        ]);
        const points = curve.getPoints(14);
        const positions = new Float32Array(
          points.flatMap((point) => [point.x, point.y, point.z]),
        );

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
                isHot ? tokens.danger : crossRepo ? tokens.compare : tokens.line
              }
              transparent
              opacity={isHot ? 0.8 : isFocused ? 0.52 : crossRepo ? 0.22 : 0.14}
            />
          </line>
        );
      })}
    </>
  );
}

function NodeParticle({
  node,
  metric,
  timelineDivisor,
  selected,
  highlighted,
  dimmed,
  progress,
  tokens,
  onSelect,
  onHover,
}: {
  node: EvalNode;
  metric: ReturnType<typeof buildEvalSceneGraph>["nodeMetrics"][string];
  timelineDivisor: number;
  selected: boolean;
  highlighted: boolean;
  dimmed: boolean;
  progress: number;
  tokens: ReturnType<typeof useEvalSceneTokens>;
  onSelect: (nodeId: string) => void;
  onHover: (next: HoverCard) => void;
}) {
  const meshRef = useRef<THREE.Mesh | null>(null);
  const ringRef = useRef<THREE.Mesh | null>(null);
  const glowRef = useRef<THREE.Mesh | null>(null);
  const visibleStrength = smoothStep(
    progress,
    metric.firstCommitIndex / timelineDivisor - 0.05,
    Math.min(1, metric.firstCommitIndex / timelineDivisor + 0.08),
  );
  const activityGlow = smoothStep(
    progress,
    metric.lastCommitIndex / timelineDivisor - 0.16,
    Math.min(1, metric.lastCommitIndex / timelineDivisor + 0.1),
  );

  useFrame((state) => {
    const pulse =
      1 +
      Math.sin(state.clock.elapsedTime * 1.4 + metric.changeFrequency) * 0.04;
    const baseScale =
      (0.72 + metric.importance * 0.95 + activityGlow * 0.25) *
      (selected ? 1.18 : highlighted ? 1.07 : 1);

    if (meshRef.current) {
      meshRef.current.scale.setScalar(baseScale * pulse);
    }

    if (ringRef.current) {
      ringRef.current.rotation.z += 0.0035;
      ringRef.current.scale.setScalar(0.92 + pulse * 0.18);
    }

    if (glowRef.current) {
      glowRef.current.scale.setScalar(
        0.98 + pulse * 0.12 + activityGlow * 0.18,
      );
    }
  });

  const color = getNodeColor(node, tokens);
  const opacity = dimmed ? 0.14 : 0.96 * visibleStrength;
  const emissiveIntensity = dimmed
    ? 0.08
    : highlighted
      ? 1.55
      : selected
        ? 1.2
        : 0.4 + activityGlow * 0.8;

  return (
    <group
      position={[node.x, node.y, node.z * 18]}
      onClick={() => onSelect(node.id)}
      onPointerOver={() =>
        onHover({
          kind: "node",
          title: node.path,
          subtitle: `${node.originRepo ?? "repo"} · ${node.role}`,
          meta: `${Math.round(metric.importance * 100)} importance · ${metric.changeFrequency} edits`,
        })
      }
      onPointerOut={() => onHover(null)}
    >
      <mesh ref={glowRef}>
        <sphereGeometry args={[7.6, 18, 18]} />
        <meshBasicMaterial color={color} transparent opacity={opacity * 0.12} />
      </mesh>
      <mesh ref={meshRef} castShadow receiveShadow>
        <icosahedronGeometry args={[4.4, 1]} />
        <meshStandardMaterial
          color={color}
          emissive={new THREE.Color(color)}
          emissiveIntensity={emissiveIntensity}
          transparent
          opacity={opacity}
          roughness={0.22}
          metalness={0.4}
        />
      </mesh>
      <mesh ref={ringRef} rotation={[Math.PI / 2, Math.PI / 4, 0]}>
        <torusGeometry args={[8.4, 0.18, 8, 42]} />
        <meshBasicMaterial
          color={node.layer === "compare" ? tokens.compare : color}
          transparent
          opacity={dimmed ? 0.12 : selected ? 0.85 : 0.32 + activityGlow * 0.2}
        />
      </mesh>
      <mesh rotation={[Math.PI / 2, Math.PI / 4, 0]}>
        <ringGeometry args={[9.8, 10.5, 36]} />
        <meshBasicMaterial
          color={selected ? tokens.glow : color}
          transparent
          opacity={dimmed ? 0.08 : selected ? 0.48 : 0.16}
          side={THREE.DoubleSide}
        />
      </mesh>
    </group>
  );
}

function NodeField({
  nodes,
  nodeMetrics,
  timelineDivisor,
  selectedNodeId,
  highlightedIds,
  focusNodeIds,
  progress,
  tokens,
  onSelectNode,
  onHover,
}: {
  nodes: EvalNode[];
  nodeMetrics: ReturnType<typeof buildEvalSceneGraph>["nodeMetrics"];
  timelineDivisor: number;
  selectedNodeId: string | null;
  highlightedIds: Set<string>;
  focusNodeIds: Set<string> | null;
  progress: number;
  tokens: ReturnType<typeof useEvalSceneTokens>;
  onSelectNode: (nodeId: string) => void;
  onHover: (next: HoverCard) => void;
}) {
  return (
    <>
      {nodes.map((node) => {
        const metric = nodeMetrics[node.id];
        if (!metric) return null;
        return (
          <NodeParticle
            key={node.id}
            node={node}
            metric={metric}
            timelineDivisor={timelineDivisor}
            selected={selectedNodeId === node.id}
            highlighted={highlightedIds.has(node.id)}
            dimmed={Boolean(focusNodeIds && !focusNodeIds.has(node.id))}
            progress={progress}
            tokens={tokens}
            onSelect={onSelectNode}
            onHover={onHover}
          />
        );
      })}
    </>
  );
}

function CommitEvent({
  commit,
  selected,
  dimmed,
  visible,
  tokens,
  onSelect,
  onHover,
}: {
  commit: EvalSceneCommit;
  selected: boolean;
  dimmed: boolean;
  visible: boolean;
  tokens: ReturnType<typeof useEvalSceneTokens>;
  onSelect: (commitId: string) => void;
  onHover: (next: HoverCard) => void;
}) {
  const eventRef = useRef<THREE.Mesh | null>(null);
  const haloRef = useRef<THREE.Mesh | null>(null);

  useFrame((state) => {
    const pulse =
      1 + Math.sin(state.clock.elapsedTime * 2 + commit.sequence) * 0.08;
    if (eventRef.current) {
      eventRef.current.scale.setScalar((selected ? 1.34 : 1) * pulse);
    }
    if (haloRef.current) {
      haloRef.current.scale.setScalar(
        1 + pulse * 0.14 + commit.importance * 0.22,
      );
      haloRef.current.rotation.z += 0.004;
    }
  });

  if (!visible) return null;

  const color =
    commit.kind === "merge"
      ? tokens.compare
      : commit.kind === "milestone"
        ? tokens.success
        : tokens.accentStrong;

  return (
    <group
      position={commit.position}
      onClick={() => onSelect(commit.id)}
      onPointerOver={() =>
        onHover({
          kind: "commit",
          title: commit.message,
          subtitle: `${commit.authorName} · ${new Date(commit.timestamp).toLocaleString()}`,
          meta: `${commit.branch} · ${commit.kind} · ${commit.touchedNodeIds.length} files`,
        })
      }
      onPointerOut={() => onHover(null)}
    >
      <mesh ref={haloRef} rotation={[Math.PI / 2, 0, 0]}>
        <ringGeometry
          args={[6 + commit.importance * 6, 7 + commit.importance * 6, 32]}
        />
        <meshBasicMaterial
          color={color}
          transparent
          opacity={dimmed ? 0.08 : selected ? 0.72 : 0.28}
          side={THREE.DoubleSide}
        />
      </mesh>
      <mesh ref={eventRef}>
        <sphereGeometry args={[2.6 + commit.importance * 2.4, 18, 18]} />
        <meshStandardMaterial
          color={color}
          emissive={new THREE.Color(color)}
          emissiveIntensity={dimmed ? 0.08 : selected ? 1.6 : 0.82}
          transparent
          opacity={dimmed ? 0.18 : 0.94}
          roughness={0.16}
          metalness={0.46}
        />
      </mesh>
      {commit.kind !== "commit"
        ? Array.from({ length: 5 }).map((_, index) => {
            const angle = (index / 5) * Math.PI * 2;
            return (
              <mesh
                key={`${commit.id}-particle-${index}`}
                position={[
                  Math.cos(angle) * (7 + commit.importance * 5),
                  Math.sin(angle) * 2,
                  Math.sin(angle) * (7 + commit.importance * 5),
                ]}
              >
                <sphereGeometry args={[0.6, 8, 8]} />
                <meshBasicMaterial
                  color={color}
                  transparent
                  opacity={dimmed ? 0.08 : 0.55}
                />
              </mesh>
            );
          })
        : null}
    </group>
  );
}

function CommitFlow({
  sceneGraph,
  selectedCommitId,
  selectedContributorId,
  focusNodeIds,
  progress,
  tokens,
  onSelectCommit,
  onHover,
}: {
  sceneGraph: ReturnType<typeof buildEvalSceneGraph>;
  selectedCommitId: string | null;
  selectedContributorId: string | null;
  focusNodeIds: Set<string> | null;
  progress: number;
  tokens: ReturnType<typeof useEvalSceneTokens>;
  onSelectCommit: (commitId: string) => void;
  onHover: (next: HoverCard) => void;
}) {
  return (
    <>
      {sceneGraph.branchPaths.map((branchPath) => {
        const points = branchPath.points.map(
          (point) => new THREE.Vector3(point[0], point[1], point[2]),
        );
        if (points.length < 2) return null;
        const curve = new THREE.CatmullRomCurve3(points);
        const sampled = curve.getPoints(40);
        const positions = new Float32Array(
          sampled.flatMap((point) => [point.x, point.y, point.z]),
        );

        return (
          <line key={branchPath.branch}>
            <bufferGeometry>
              <bufferAttribute
                attach="attributes-position"
                args={[positions, 3]}
              />
            </bufferGeometry>
            <lineBasicMaterial
              color={
                branchPath.branch === "main"
                  ? tokens.accentStrong
                  : tokens.compare
              }
              transparent
              opacity={branchPath.branch === "main" ? 0.34 : 0.22}
            />
          </line>
        );
      })}
      {sceneGraph.commits.map((commit) => {
        const visible =
          commit.sequence / Math.max(sceneGraph.commits.length - 1, 1) <=
          progress;
        const contributorSelected =
          selectedContributorId &&
          sceneGraph.contributors
            .find((item) => item.id === selectedContributorId)
            ?.commitIds.includes(commit.id);
        const dimmed =
          Boolean(focusNodeIds) &&
          !commit.touchedNodeIds.some((nodeId) => focusNodeIds?.has(nodeId));

        return (
          <CommitEvent
            key={commit.id}
            commit={commit}
            selected={
              selectedCommitId === commit.id || Boolean(contributorSelected)
            }
            dimmed={dimmed}
            visible={visible}
            tokens={tokens}
            onSelect={onSelectCommit}
            onHover={onHover}
          />
        );
      })}
    </>
  );
}

function Scene({
  graph,
  sceneGraph,
  renderedNodes,
  renderedEdges,
  highlightedIds,
  selectedNodeId,
  selectedCommitId,
  selectedContributorId,
  focusNodeIds,
  progress,
  focusPoint,
  tokens,
  onSelectNode,
  onSelectCommit,
  onHover,
}: {
  graph: EvalWorkspaceGraph;
  sceneGraph: ReturnType<typeof buildEvalSceneGraph>;
  renderedNodes: EvalNode[];
  renderedEdges: EvalEdge[];
  highlightedIds: Set<string>;
  selectedNodeId: string | null;
  selectedCommitId: string | null;
  selectedContributorId: string | null;
  focusNodeIds: Set<string> | null;
  progress: number;
  focusPoint: THREE.Vector3;
  tokens: ReturnType<typeof useEvalSceneTokens>;
  onSelectNode: (nodeId: string) => void;
  onSelectCommit: (commitId: string) => void;
  onHover: (next: HoverCard) => void;
}) {
  const nodeMap = useMemo(
    () => new Map(graph.nodes.map((node) => [node.id, node])),
    [graph.nodes],
  );
  const visibleNodeIds = useMemo(
    () => new Set(renderedNodes.map((node) => node.id)),
    [renderedNodes],
  );

  return (
    <>
      <color attach="background" args={[tokens.fog]} />
      <fog attach="fog" args={[tokens.fog, 180, 820]} />
      <ambientLight intensity={0.7} />
      <hemisphereLight
        intensity={0.52}
        color={tokens.glow}
        groundColor={tokens.panel}
      />
      <directionalLight
        position={[80, 140, 80]}
        intensity={1.2}
        color={tokens.accent}
        castShadow
      />
      <pointLight
        position={[-140, 30, 160]}
        intensity={0.85}
        color={tokens.compare}
      />
      <pointLight
        position={[0, -40, -180]}
        intensity={0.54}
        color={tokens.accentStrong}
      />

      <SceneCameraRig
        focusPoint={focusPoint}
        compareMode={Boolean(graph.compareTarget)}
      />
      <JarvisFrame hasCompare={Boolean(graph.compareTarget)} tokens={tokens} />
      <ClusterHalos
        graph={graph}
        sceneGraph={sceneGraph}
        focusNodeIds={focusNodeIds}
        tokens={tokens}
      />
      <TimelineRails
        sceneGraph={sceneGraph}
        progress={progress}
        tokens={tokens}
      />
      <EdgeField
        edges={renderedEdges}
        nodeMap={nodeMap}
        visibleNodeIds={visibleNodeIds}
        highlightedIds={highlightedIds}
        focusNodeIds={focusNodeIds}
        tokens={tokens}
      />
      <CommitFlow
        sceneGraph={sceneGraph}
        selectedCommitId={selectedCommitId}
        selectedContributorId={selectedContributorId}
        focusNodeIds={focusNodeIds}
        progress={progress}
        tokens={tokens}
        onSelectCommit={onSelectCommit}
        onHover={onHover}
      />
      <NodeField
        nodes={renderedNodes}
        nodeMetrics={sceneGraph.nodeMetrics}
        timelineDivisor={Math.max(sceneGraph.commits.length - 1, 1)}
        selectedNodeId={selectedNodeId}
        highlightedIds={highlightedIds}
        focusNodeIds={focusNodeIds}
        progress={progress}
        tokens={tokens}
        onSelectNode={onSelectNode}
        onHover={onHover}
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
  onSelectNode: (nodeId: string | null) => void;
  onCommandChange: (command: EvalCommandId) => void;
  fullscreen: boolean;
  onToggleFullscreen: () => void;
}) {
  const tokens = useEvalSceneTokens();
  const [feedMinimized, setFeedMinimized] = useState(false);
  const [telemetryMinimized, setTelemetryMinimized] = useState(false);
  const [nodeWorldId, setNodeWorldId] = useState<string | null>(null);
  const [timelineProgress, setTimelineProgress] = useState(1);
  const [timelinePlaying, setTimelinePlaying] = useState(false);
  const [focusMode, setFocusMode] = useState(false);
  const [selectedCommitId, setSelectedCommitId] = useState<string | null>(null);
  const [selectedContributorId, setSelectedContributorId] = useState<
    string | null
  >(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [hoverCard, setHoverCard] = useState<HoverCard>(null);

  const sceneGraph = useMemo(
    () => (graph ? buildEvalSceneGraph(graph) : null),
    [graph],
  );

  useEffect(() => {
    if (!graph) return;
    setTimelineProgress(1);
    setTimelinePlaying(false);
    setSelectedCommitId(null);
    setSelectedContributorId(null);
    setSearchQuery("");
  }, [graph]);

  useEffect(() => {
    if (!selectedNodeId) return;
    setSelectedCommitId(null);
    setSelectedContributorId(null);
  }, [selectedNodeId]);

  useEffect(() => {
    if (!timelinePlaying) return;
    const timer = window.setInterval(() => {
      setTimelineProgress((current) => {
        const next = Math.min(1, current + 0.012);
        if (next >= 1) {
          window.clearInterval(timer);
          setTimelinePlaying(false);
        }
        return next;
      });
    }, 90);

    return () => window.clearInterval(timer);
  }, [timelinePlaying]);

  const summaryTone =
    activeCommand === "trace"
      ? "PATH TRACE"
      : activeCommand === "sinks"
        ? "SINK SWEEP"
        : activeCommand === "fix"
          ? "PATCH PREVIEW"
          : "GRAPH READY";

  const selection: Selection = selectedNodeId
    ? { kind: "node", id: selectedNodeId }
    : selectedCommitId
      ? { kind: "commit", id: selectedCommitId }
      : selectedContributorId
        ? { kind: "contributor", id: selectedContributorId }
        : null;

  const focusNodeIds = useMemo(() => {
    if (!graph || !sceneGraph || !focusMode) return null;
    return buildFocusNodeSet(selection, graph, sceneGraph);
  }, [focusMode, graph, sceneGraph, selection]);

  const commandButtons: Array<{ id: EvalCommandId; label: string }> = [
    { id: "trace", label: "Trace path" },
    { id: "sinks", label: "Show sinks" },
    { id: "fix", label: "Patch view" },
  ];

  const lodLabel = graph
    ? graph.nodes.length > 260
      ? "LOD-3"
      : graph.nodes.length > 160
        ? "LOD-2"
        : "LOD-1"
    : "LOD-0";

  const timelineLabel = sceneGraph
    ? sceneGraph.commits[
        Math.min(
          sceneGraph.commits.length - 1,
          Math.max(
            0,
            Math.round(timelineProgress * (sceneGraph.commits.length - 1)),
          ),
        )
      ]
    : null;

  const enrichedHighlightIds = useMemo(() => {
    if (!sceneGraph) return highlightedIds;
    const next = new Set<string>(highlightedIds);
    const commit = selectedCommitId
      ? sceneGraph.commits.find((item) => item.id === selectedCommitId)
      : null;
    const contributor = selectedContributorId
      ? sceneGraph.contributors.find(
          (item) => item.id === selectedContributorId,
        )
      : null;

    for (const id of commit?.touchedNodeIds ?? []) next.add(id);
    for (const id of contributor?.touchedNodeIds ?? []) next.add(id);

    if (activeCommand === "fix") {
      for (const id of sceneGraph.hotspotIds.slice(0, 5)) next.add(id);
    }
    return next;
  }, [
    activeCommand,
    highlightedIds,
    sceneGraph,
    selectedCommitId,
    selectedContributorId,
  ]);

  const renderedNodes = useMemo(() => {
    if (!graph || !sceneGraph) return [];
    const importantIds = new Set(
      [...graph.nodes]
        .sort((left, right) => {
          const leftMetric = sceneGraph.nodeMetrics[left.id];
          const rightMetric = sceneGraph.nodeMetrics[right.id];
          return (rightMetric?.importance ?? 0) - (leftMetric?.importance ?? 0);
        })
        .slice(0, graph.nodes.length > 260 ? 220 : 320)
        .map((node) => node.id),
    );

    if (selectedNodeId) importantIds.add(selectedNodeId);
    for (const id of enrichedHighlightIds) importantIds.add(id);
    for (const id of focusNodeIds ?? []) importantIds.add(id);

    return graph.nodes.filter((node) => importantIds.has(node.id));
  }, [enrichedHighlightIds, focusNodeIds, graph, sceneGraph, selectedNodeId]);

  const renderedEdges = useMemo(() => {
    if (!graph) return [];
    const visibleIds = new Set(renderedNodes.map((node) => node.id));
    return graph.edges.filter(
      (edge) => visibleIds.has(edge.source) && visibleIds.has(edge.target),
    );
  }, [graph, renderedNodes]);

  const directoryHotspots = useMemo(() => {
    if (!graph || !sceneGraph) return [];
    return sceneGraph.clusters.slice(0, 7).map((cluster) => ({
      directory: cluster.label,
      count: cluster.nodeIds.length,
      score: cluster.avgRisk,
      layer: cluster.layer,
    }));
  }, [graph, sceneGraph]);

  const sortedNodes = useMemo(() => {
    if (!graph || !sceneGraph) return [];
    return [...graph.nodes]
      .sort(
        (left, right) =>
          (sceneGraph.nodeMetrics[right.id]?.importance ?? right.risk) -
          (sceneGraph.nodeMetrics[left.id]?.importance ?? left.risk),
      )
      .slice(0, 16);
  }, [graph, sceneGraph]);

  const focusPoint = useMemo(() => {
    if (!graph || !sceneGraph) return new THREE.Vector3(0, 0, 0);

    if (selectedNodeId) {
      const node = graph.nodes.find((item) => item.id === selectedNodeId);
      if (node) return new THREE.Vector3(node.x, node.y, node.z * 18);
    }

    if (selectedCommitId) {
      const commit = sceneGraph.commits.find(
        (item) => item.id === selectedCommitId,
      );
      if (commit) {
        return new THREE.Vector3(
          commit.position[0],
          commit.position[1],
          commit.position[2],
        );
      }
    }

    if (selectedContributorId) {
      const contributor = sceneGraph.contributors.find(
        (item) => item.id === selectedContributorId,
      );
      if (contributor?.touchedNodeIds.length) {
        const touchedNodes = contributor.touchedNodeIds
          .map((id) => graph.nodes.find((node) => node.id === id))
          .filter((node): node is EvalNode => Boolean(node));
        if (touchedNodes.length) {
          const centroid = touchedNodes.reduce(
            (accumulator, node) => {
              accumulator.x += node.x;
              accumulator.y += node.y;
              accumulator.z += node.z * 18;
              return accumulator;
            },
            { x: 0, y: 0, z: 0 },
          );
          return new THREE.Vector3(
            centroid.x / touchedNodes.length,
            centroid.y / touchedNodes.length,
            centroid.z / touchedNodes.length,
          );
        }
      }
    }

    return new THREE.Vector3(0, 0, graph.compareTarget ? 10 : 0);
  }, [
    graph,
    sceneGraph,
    selectedCommitId,
    selectedContributorId,
    selectedNodeId,
  ]);

  const handleSelectNode = (nodeId: string) => {
    onSelectNode(nodeId);
    setNodeWorldId(nodeId);
    setSelectedCommitId(null);
    setSelectedContributorId(null);
  };

  const handleSelectCommit = (commitId: string) => {
    setSelectedCommitId(commitId);
    setSelectedContributorId(null);
    setNodeWorldId(null);
    if (selectedNodeId) {
      onSelectNode(null);
    }
  };

  const handleSelectContributor = (contributorId: string) => {
    setSelectedContributorId(contributorId);
    setSelectedCommitId(null);
    setNodeWorldId(null);
    if (selectedNodeId) {
      onSelectNode(null);
    }
  };

  const currentTimelineLabel = timelineLabel
    ? `${new Date(timelineLabel.timestamp).toLocaleDateString()} · ${timelineLabel.authorName} · ${timelineLabel.message}`
    : "Scrub through repository evolution";

  const sceneBody = (
    <div
      className={`relative overflow-hidden bg-[radial-gradient(circle_at_top,color-mix(in_oklab,var(--eval-accent)_18%,transparent),transparent_28%),radial-gradient(circle_at_center,color-mix(in_oklab,var(--eval-compare)_10%,transparent),transparent_32%),linear-gradient(180deg,var(--eval-bg)_0%,var(--eval-bg-elevated)_56%,var(--eval-bg)_100%)] ${fullscreen ? "h-screen" : "h-[980px]"}`}
    >
      {graph && sceneGraph ? (
        <>
          <Canvas
            shadows
            camera={{
              position: [0, 18, graph.compareTarget ? 320 : 250],
              fov: 48,
            }}
          >
            <Scene
              graph={graph}
              sceneGraph={sceneGraph}
              renderedNodes={renderedNodes}
              renderedEdges={renderedEdges}
              highlightedIds={enrichedHighlightIds}
              selectedNodeId={selectedNodeId}
              selectedCommitId={selectedCommitId}
              selectedContributorId={selectedContributorId}
              focusNodeIds={focusNodeIds}
              progress={timelineProgress}
              focusPoint={focusPoint}
              tokens={tokens}
              onSelectNode={handleSelectNode}
              onSelectCommit={handleSelectCommit}
              onHover={setHoverCard}
            />
          </Canvas>

          <div className="pointer-events-none absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-[color:var(--eval-accent-soft)] via-black/20 to-transparent" />

          <div className="absolute left-5 top-5 flex w-[min(560px,calc(100%-2.5rem))] flex-col gap-4">
            <div className="rounded-3xl border border-[color:var(--eval-border)] bg-[color:color-mix(in_oklab,var(--eval-panel)_84%,transparent)] p-4 shadow-[0_0_40px_color-mix(in_oklab,var(--eval-accent)_10%,transparent)] backdrop-blur">
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
                  <div className="inline-flex items-center gap-2 rounded-full border border-[color:var(--eval-border)] bg-[color:var(--eval-panel-soft)] px-3 py-1 text-[11px] uppercase tracking-[0.18em] text-[color:var(--eval-text-muted)]">
                    <Focus className="h-3.5 w-3.5" />
                    {lodLabel}
                  </div>
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
                        Commit events
                      </p>
                      <p className="mt-1 text-lg font-semibold text-[color:var(--eval-text)]">
                        {sceneGraph.commits.length}
                      </p>
                    </div>
                    <div className="rounded-2xl border border-[color:var(--eval-border)] bg-[color:var(--eval-panel-soft)] p-3">
                      <p className="text-[10px] uppercase tracking-[0.2em] text-[color:var(--eval-text-muted)]">
                        Contributors
                      </p>
                      <p className="mt-1 text-lg font-semibold text-[color:var(--eval-text)]">
                        {sceneGraph.contributors.length}
                      </p>
                    </div>
                    <div className="rounded-2xl border border-[color:var(--eval-border)] bg-[color:var(--eval-panel-soft)] p-3">
                      <p className="text-[10px] uppercase tracking-[0.2em] text-[color:var(--eval-text-muted)]">
                        Rendered nodes
                      </p>
                      <p className="mt-1 text-lg font-semibold text-[color:var(--eval-text)]">
                        {renderedNodes.length}
                      </p>
                    </div>
                  </div>
                </>
              ) : null}
            </div>

            <EvalTimelineControls
              progress={timelineProgress}
              playing={timelinePlaying}
              currentLabel={currentTimelineLabel}
              onProgressChange={(next) => {
                setTimelineProgress(next);
                if (next < 1) setTimelinePlaying(false);
              }}
              onPlayToggle={() => {
                if (timelineProgress >= 1) {
                  setTimelineProgress(0);
                }
                setTimelinePlaying((value) => !value);
              }}
              onReset={() => {
                setTimelineProgress(0);
                setTimelinePlaying(false);
              }}
            />
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

          {hoverCard ? (
            <div className="pointer-events-none absolute right-5 top-24 z-10 max-w-sm rounded-2xl border border-[color:var(--eval-border)] bg-[color:color-mix(in_oklab,var(--eval-panel)_90%,transparent)] p-4 shadow-[0_0_30px_color-mix(in_oklab,var(--eval-accent)_10%,transparent)] backdrop-blur">
              <p className="text-[11px] uppercase tracking-[0.22em] text-[color:var(--eval-accent-strong)]">
                {hoverCard.kind}
              </p>
              <p className="mt-2 text-sm font-semibold text-[color:var(--eval-text)]">
                {hoverCard.title}
              </p>
              <p className="mt-1 text-xs text-[color:var(--eval-text-muted)]">
                {hoverCard.subtitle}
              </p>
              <p className="mt-3 text-xs uppercase tracking-[0.18em] text-[color:var(--eval-accent)]">
                {hoverCard.meta}
              </p>
            </div>
          ) : null}

          <div className="absolute bottom-5 left-5 top-[284px] w-[min(380px,calc(100%-2.5rem))]"></div>

          <div className="absolute bottom-5 right-5 w-full max-w-md rounded-3xl border border-[color:var(--eval-border)] bg-[color:color-mix(in_oklab,var(--eval-panel)_84%,transparent)] shadow-[0_0_40px_color-mix(in_oklab,var(--eval-accent)_10%,transparent)] backdrop-blur">
            <div className="flex items-center justify-between border-b border-[color:var(--eval-border)] px-4 py-3">
              <div>
                <p className="text-xs uppercase tracking-[0.24em] text-[color:var(--eval-accent-strong)]">
                  Repository feed
                </p>
                <p className="mt-1 text-xs text-[color:var(--eval-text-muted)]">
                  Hotspots, contributors, and module activity clusters.
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
                    <p>Sources</p>
                    <p className="mt-1 text-sm font-medium text-[color:var(--eval-text)]">
                      {graph.summary.sources}
                    </p>
                  </div>
                  <div className="rounded-xl border border-[color:var(--eval-border)] bg-[color:var(--eval-panel-soft)] p-3">
                    <p>Sinks</p>
                    <p className="mt-1 text-sm font-medium text-[color:var(--eval-text)]">
                      {graph.summary.sinks}
                    </p>
                  </div>
                  <div className="rounded-xl border border-[color:var(--eval-border)] bg-[color:var(--eval-panel-soft)] p-3">
                    <p>Branches</p>
                    <p className="mt-1 text-sm font-medium text-[color:var(--eval-text)]">
                      {sceneGraph.branchPaths.length}
                    </p>
                  </div>
                  <div className="rounded-xl border border-[color:var(--eval-border)] bg-[color:var(--eval-panel-soft)] p-3">
                    <p>High-risk queue</p>
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
                          if (match) handleSelectNode(match.id);
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
                    Contributor influence
                  </p>
                  <div className="mt-3 space-y-2">
                    {sceneGraph.contributors.map((contributor) => (
                      <button
                        key={contributor.id}
                        type="button"
                        onClick={() => handleSelectContributor(contributor.id)}
                        className={`flex w-full items-center justify-between rounded-xl border px-3 py-2 text-left transition ${
                          selectedContributorId === contributor.id
                            ? "border-[color:var(--eval-accent)] bg-[color:var(--eval-accent-soft)]"
                            : "border-[color:var(--eval-border)] bg-[color:var(--eval-panel)] hover:border-[color:var(--eval-accent)]"
                        }`}
                      >
                        <div>
                          <p className="text-sm text-[color:var(--eval-text)]">
                            {contributor.name}
                          </p>
                          <p className="text-[11px] uppercase tracking-[0.18em] text-[color:var(--eval-text-muted)]">
                            {contributor.commitIds.length} commits ·{" "}
                            {contributor.touchedNodeIds.length} files
                          </p>
                        </div>
                        <p className="text-sm font-medium text-[color:var(--eval-accent-strong)]">
                          {Math.round(contributor.influence * 100)}%
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
                        onClick={() => handleSelectNode(node.id)}
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
