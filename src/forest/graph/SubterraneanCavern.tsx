import React, { useMemo, useState } from 'react';
import { Html } from '@react-three/drei';
import * as THREE from 'three';
import { useForestStore } from '../../store/forestStore.js';

export const SubterraneanCavern: React.FC = () => {
  const { isSubterraneanMode, projects, topics, myceliumLinks, decisionConflicts } = useForestStore();
  const [hoveredNode, setHoveredNode] = useState<{ id: string; label: string; type: string; details: string } | null>(null);

  // Generate 3D graph layout coordinates in the subterranean cavern below y: -6
  const graphData = useMemo(() => {
    if (!isSubterraneanMode) return { nodes: [], links: [] };

    const nodes: Array<{ id: string; label: string; type: 'Project' | 'Topic' | 'Decision'; pos: [number, number, number]; color: string; size: number }> = [];
    const links: Array<{ id: string; source: [number, number, number]; target: [number, number, number]; color: string }> = [];

    const goldenAngle = 137.5 * (Math.PI / 180);
    const spacing = 3.0;

    // 1. Project Root Hubs
    projects.forEach((p, idx) => {
      const r = Math.sqrt(idx + 1) * spacing;
      const theta = idx * goldenAngle;
      const x = Math.cos(theta) * r;
      const z = Math.sin(theta) * r;
      const y = -10 - (idx % 3) * 1.5;

      nodes.push({
        id: p.id,
        label: p.name,
        type: 'Project',
        pos: [x, y, z],
        color: '#43a047',
        size: 0.35
      });

      // 2. Topic Nodes branching from project hub
      const projTopics = topics[p.id] || [];
      projTopics.forEach((t, tIdx) => {
        const tAngle = (tIdx / Math.max(1, projTopics.length)) * Math.PI * 2;
        const tx = x + Math.cos(tAngle) * 1.8;
        const tz = z + Math.sin(tAngle) * 1.8;
        const ty = y - 1.2 - (tIdx * 0.4);

        nodes.push({
          id: t.id,
          label: t.name,
          type: 'Topic',
          pos: [tx, ty, tz],
          color: '#81c784',
          size: 0.2
        });

        links.push({
          id: `link_${p.id}_${t.id}`,
          source: [x, y, z],
          target: [tx, ty, tz],
          color: '#388e3c'
        });
      });
    });

    // 3. Cross-project Mycelium Link filaments
    myceliumLinks.forEach((m) => {
      const srcNode = nodes.find(n => n.id === m.sourceProjectId);
      const tgtNode = nodes.find(n => n.id === m.targetProjectId);
      if (srcNode && tgtNode) {
        links.push({
          id: m.id,
          source: srcNode.pos,
          target: tgtNode.pos,
          color: '#ffd54f'
        });
      }
    });

    return { nodes, links };
  }, [isSubterraneanMode, projects, topics, myceliumLinks]);

  if (!isSubterraneanMode) return null;

  return (
    <group>
      {/* Cavern ambient light and mood */}
      <pointLight position={[0, -10, 0]} color="#4caf50" intensity={2.0} distance={40} />
      <pointLight position={[0, -15, 0]} color="#ffd54f" intensity={1.5} distance={30} />

      {/* Root Filaments / Edges */}
      {graphData.links.map((link) => {
        const p1 = new THREE.Vector3(...link.source);
        const p2 = new THREE.Vector3(...link.target);
        const mid = new THREE.Vector3().addVectors(p1, p2).multiplyScalar(0.5);
        mid.y -= 0.5;

        const curve = new THREE.QuadraticBezierCurve3(p1, mid, p2);

        return (
          <mesh key={link.id}>
            <tubeGeometry args={[curve, 16, 0.04, 6, false]} />
            <meshBasicMaterial color={link.color} transparent opacity={0.6} />
          </mesh>
        );
      })}

      {/* 3D Graph Nodes */}
      {graphData.nodes.map((node) => {
        const isHovered = hoveredNode?.id === node.id;

        return (
          <group key={node.id} position={node.pos}>
            <mesh
              onPointerOver={(e) => {
                e.stopPropagation();
                setHoveredNode({
                  id: node.id,
                  label: node.label,
                  type: node.type,
                  details: node.type === 'Project' ? 'Project Root Hub' : 'Development Theme'
                });
                document.body.style.cursor = 'pointer';
              }}
              onPointerOut={() => {
                setHoveredNode(null);
                document.body.style.cursor = 'auto';
              }}
            >
              <sphereGeometry args={[node.size * (isHovered ? 1.4 : 1.0), 12, 12]} />
              <meshStandardMaterial
                color={isHovered ? '#ffffff' : node.color}
                emissive={node.color}
                emissiveIntensity={isHovered ? 1.5 : 0.8}
                roughness={0.3}
              />
            </mesh>

            {/* Label Pin on hover */}
            {isHovered && (
              <Html position={[0, node.size + 0.4, 0]} center distanceFactor={12} zIndexRange={[10, 0]}>
                <div className="glass-panel px-2.5 py-1 rounded-md text-[10px] font-mono text-forest-glow border border-forest-leaf/40 shadow-xl pointer-events-none whitespace-nowrap">
                  <span className="font-bold text-forest-gold uppercase">[{node.type}]</span> {node.label}
                </div>
              </Html>
            )}
          </group>
        );
      })}
    </group>
  );
};
