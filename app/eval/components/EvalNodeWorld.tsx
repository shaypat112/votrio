"use client";

import { useEffect, useMemo, useRef } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Layers3 } from "lucide-react";
import type { EvalNode, EvalWorkspaceGraph } from "../lib/types";
import { buildNodeWorld } from "../lib/workspace";

function useEvalSceneTokens() {
  return useMemo(() => {
    if (typeof window === "undefined") {
      return {
        fog: "#05070d",
        accent: "#7dd3fc",
        accentStrong: "#38bdf8",
        line: "#334155",
      };
    }

    const root = document.documentElement;
    const styles = getComputedStyle(root);
    const read = (name: string, fallback: string) =>
      styles.getPropertyValue(name).trim() || fallback;

    return {
      fog: read("--eval-fog", "#05070d"),
      accent: read("--eval-accent-strong", "#7dd3fc"),
      accentStrong: read("--eval-accent", "#38bdf8"),
      line: read("--eval-line", "#334155"),
    };
  }, []);
}

function NodeWorldControls() {
  const { camera, gl } = useThree();
  const controlsRef = useRef<OrbitControls | null>(null);

  useEffect(() => {
    const controls = new OrbitControls(camera, gl.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controls.minDistance = 35;
    controls.maxDistance = 180;
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

function NodeWorldScene({
  centerNode,
  nodes,
  onSelectNode,
  tokens,
}: {
  centerNode: EvalNode;
  nodes: EvalNode[];
  onSelectNode: (nodeId: string) => void;
  tokens: ReturnType<typeof useEvalSceneTokens>;
}) {
  return (
    <>
      <color attach="background" args={[tokens.fog]} />
      <ambientLight intensity={0.7} />
      <pointLight position={[40, 40, 60]} intensity={1.6} color={tokens.accent} />
      <pointLight position={[-60, -20, 40]} intensity={0.9} color={tokens.accentStrong} />
      <NodeWorldControls />
      <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, -18, 0]}>
        <ringGeometry args={[10, 22, 64]} />
        <meshBasicMaterial
          color={tokens.accentStrong}
          transparent
          opacity={0.25}
          side={THREE.DoubleSide}
        />
      </mesh>

      {nodes.map((node, index) => {
        const isCenter = node.id === centerNode.id;
        const angle = (index / Math.max(nodes.length, 1)) * Math.PI * 2;
        const radius = isCenter ? 0 : 24 + (index % 3) * 8;
        const x = isCenter ? 0 : Math.cos(angle) * radius;
        const y = isCenter ? 0 : Math.sin(angle) * radius * 0.35;
        const z = isCenter ? 0 : Math.sin(angle) * 8;

        return (
          <group
            key={node.id}
            position={[x, y, z]}
            onClick={() => onSelectNode(node.id)}
          >
            {!isCenter ? (
              <line>
                <bufferGeometry>
                <bufferAttribute
                  attach="attributes-position"
                  args={[new Float32Array([0, 0, 0, -x, -y, -z]), 3]}
                />
              </bufferGeometry>
                <lineBasicMaterial color={tokens.line} transparent opacity={0.5} />
              </line>
            ) : null}
            <mesh>
              <sphereGeometry args={[isCenter ? 4.8 : 2.8, 18, 18]} />
              <meshStandardMaterial
                color={node.color}
                emissive={new THREE.Color(node.color)}
                emissiveIntensity={isCenter ? 1.5 : 0.8}
                roughness={0.3}
                metalness={0.42}
              />
            </mesh>
            <mesh rotation={[Math.PI / 2, 0, 0]}>
              <torusGeometry args={[isCenter ? 8 : 4.5, 0.14, 8, 48]} />
              <meshBasicMaterial
                color={node.color}
                transparent
                opacity={isCenter ? 0.8 : 0.45}
              />
            </mesh>
          </group>
        );
      })}
    </>
  );
}

export function EvalNodeWorld({
  graph,
  nodeId,
  onClose,
  onSelectNode,
}: {
  graph: EvalWorkspaceGraph;
  nodeId: string | null;
  onClose: () => void;
  onSelectNode: (nodeId: string) => void;
}) {
  const tokens = useEvalSceneTokens();
  const world = nodeId ? buildNodeWorld(graph, nodeId) : null;

  if (!world) {
    return null;
  }

  return (
    <div className="absolute inset-0 z-20 bg-[radial-gradient(circle_at_top,color-mix(in_oklab,var(--eval-accent)_20%,transparent),transparent_30%),linear-gradient(180deg,color-mix(in_oklab,var(--eval-bg)_70%,transparent),color-mix(in_oklab,var(--eval-bg-elevated)_94%,transparent))]">
      <div className="absolute inset-0">
        <Canvas camera={{ position: [0, 0, 68], fov: 42 }}>
          <NodeWorldScene
            centerNode={world.centerNode}
            nodes={world.nodes}
            onSelectNode={onSelectNode}
            tokens={tokens}
          />
        </Canvas>
      </div>

      <div className="absolute inset-x-6 top-6 flex items-start justify-between gap-4">
        <div className="max-w-xl rounded-3xl border border-[color:var(--eval-border)] bg-[color:color-mix(in_oklab,var(--eval-panel)_84%,transparent)] p-5 text-[color:var(--eval-text)] shadow-[0_0_40px_color-mix(in_oklab,var(--eval-accent)_14%,transparent)] backdrop-blur">
          <p className="text-xs uppercase tracking-[0.3em] text-[color:var(--eval-accent-strong)]">
            Node World
          </p>
          <h3 className="mt-2 text-xl font-semibold">
            {world.centerNode.path}
          </h3>
          <p className="mt-2 text-sm text-[color:var(--eval-text-muted)]">
            {world.centerNode.originRepo} · {world.centerNode.directory} ·{" "}
            {world.centerNode.extension}
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            {world.centerNode.signals.map((signal) => (
              <span
                key={signal}
                className="rounded-full border border-[color:var(--eval-border)] bg-[color:var(--eval-accent-soft)] px-2 py-1 text-[10px] uppercase tracking-[0.2em] text-[color:var(--eval-accent-strong)]"
              >
                {signal}
              </span>
            ))}
            {world.centerNode.signals.length === 0 ? (
              <span className="rounded-full border border-[color:var(--eval-border)] bg-[color:var(--eval-panel)] px-2 py-1 text-[10px] uppercase tracking-[0.2em] text-[color:var(--eval-text-muted)]">
                general file
              </span>
            ) : null}
          </div>
        </div>

        <Button
          type="button"
          variant="outline"
          onClick={onClose}
          className="border-[color:var(--eval-border)] bg-[color:var(--eval-panel)] text-[color:var(--eval-text)] hover:bg-[color:var(--eval-panel-soft)]"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to graph
        </Button>
      </div>

      <div className="absolute bottom-6 left-6 w-full max-w-md rounded-3xl border border-[color:var(--eval-border)] bg-[color:color-mix(in_oklab,var(--eval-panel)_84%,transparent)] p-5 text-[color:var(--eval-text)] shadow-[0_0_40px_color-mix(in_oklab,var(--eval-accent)_14%,transparent)] backdrop-blur">
        <div className="flex items-center gap-2 text-xs uppercase tracking-[0.28em] text-[color:var(--eval-accent-strong)]">
          <Layers3 className="h-4 w-4" />
          Connected sector
        </div>
        <div className="mt-4 space-y-2">
          {world.nodes.map((node) => (
            <button
              key={node.id}
              type="button"
              onClick={() => onSelectNode(node.id)}
              className={`flex w-full items-center justify-between rounded-2xl border px-3 py-2 text-left ${
                node.id === world.centerNode.id
                  ? "border-[color:var(--eval-accent)] bg-[color:var(--eval-accent-soft)]"
                  : "border-[color:var(--eval-border)] bg-[color:var(--eval-panel)] hover:border-[color:var(--eval-accent)]"
              }`}
            >
              <div className="min-w-0">
                <p className="truncate text-sm text-[color:var(--eval-text)]">{node.path}</p>
                <p className="text-[11px] uppercase tracking-[0.18em] text-[color:var(--eval-text-muted)]">
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
  );
}
