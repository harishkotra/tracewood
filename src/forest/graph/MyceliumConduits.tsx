import React, { useMemo, useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import * as THREE from 'three';
import { MyceliumLink } from '../../database/hydra.js';

interface MyceliumConduitsProps {
  links: MyceliumLink[];
  projectPositions: Record<string, [number, number, number]>;
  visible: boolean;
}

export const MyceliumConduits: React.FC<MyceliumConduitsProps> = ({
  links,
  projectPositions,
  visible
}) => {
  const [hoveredLink, setHoveredLink] = useState<MyceliumLink | null>(null);

  // Compute curved paths for each mycelium conduit
  const conduitCurves = useMemo(() => {
    return links.map(link => {
      const posA = projectPositions[link.sourceProjectId];
      const posB = projectPositions[link.targetProjectId];
      if (!posA || !posB) return null;

      const pA = new THREE.Vector3(posA[0], 0.1, posA[2]);
      const pB = new THREE.Vector3(posB[0], 0.1, posB[2]);
      
      // Control point dipping slightly into the ground and curving out
      const mid = new THREE.Vector3().addVectors(pA, pB).multiplyScalar(0.5);
      mid.y -= 0.15; // Dip into ground

      const curve = new THREE.QuadraticBezierCurve3(pA, mid, pB);
      return {
        link,
        curve,
        points: curve.getPoints(24),
        mid
      };
    }).filter(Boolean);
  }, [links, projectPositions]);

  if (!visible || conduitCurves.length === 0) return null;

  return (
    <group>
      {conduitCurves.map((item, idx) => {
        if (!item) return null;
        const isHovered = hoveredLink?.id === item.link.id;

        return (
          <group key={item.link.id}>
            {/* 1. Glowing Mycelium Conduit Tube */}
            <mesh
              onPointerOver={(e) => {
                e.stopPropagation();
                setHoveredLink(item.link);
                document.body.style.cursor = 'pointer';
              }}
              onPointerOut={() => {
                setHoveredLink(null);
                document.body.style.cursor = 'auto';
              }}
            >
              <tubeGeometry args={[item.curve, 24, 0.08 * (isHovered ? 1.8 : 1.0), 6, false]} />
              <meshStandardMaterial
                color={isHovered ? "#ffd54f" : "#81c784"}
                emissive={isHovered ? "#ffe082" : "#388e3c"}
                emissiveIntensity={isHovered ? 1.2 : 0.6}
                roughness={0.4}
                transparent
                opacity={isHovered ? 0.95 : 0.65}
              />
            </mesh>

            {/* 2. Interactive Floating Mycelium Tooltip */}
            {isHovered && (
              <Html position={[item.mid.x, item.mid.y + 0.8, item.mid.z]} center distanceFactor={16}>
                <div className="glass-panel px-3 py-1.5 rounded-lg text-[10px] font-mono text-forest-glow border border-forest-leaf/40 shadow-xl pointer-events-none whitespace-nowrap flex flex-col gap-0.5">
                  <span className="font-bold text-forest-gold flex items-center gap-1">
                    ◈ Mycelium Conduit (HydraDB)
                  </span>
                  <span className="text-forest-sage">{item.link.reason}</span>
                  <span className="text-[9px] text-forest-leaf opacity-80">
                    Connection Strength: {(item.link.strength * 100).toFixed(0)}%
                  </span>
                </div>
              </Html>
            )}
          </group>
        );
      })}
    </group>
  );
};
