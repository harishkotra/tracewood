import React, { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useForestStore } from '../../store/forestStore.js';

interface BlastRadiusPulseProps {
  projectPositions: Record<string, [number, number, number]>;
}

export const BlastRadiusPulse: React.FC<BlastRadiusPulseProps> = ({ projectPositions }) => {
  const { activeBlastRadius } = useForestStore();
  const groupRef = useRef<THREE.Group>(null);

  useFrame((state) => {
    if (!groupRef.current) return;
    const time = state.clock.getElapsedTime();
    const scale = 1.0 + (Math.sin(time * 4) * 0.25);
    groupRef.current.children.forEach((child: any) => {
      child.scale.set(scale, scale, scale);
      if (child.material) {
        child.material.opacity = 0.6 + Math.sin(time * 4) * 0.3;
      }
    });
  });

  if (!activeBlastRadius || activeBlastRadius.affectedProjectIds.length === 0) {
    return null;
  }

  return (
    <group ref={groupRef}>
      {activeBlastRadius.affectedProjectIds.map((projId) => {
        const pos = projectPositions[projId];
        if (!pos) return null;

        return (
          <group key={projId} position={[pos[0], 0.2, pos[2]]}>
            {/* 1. Pulsing Shockwave Ring */}
            <mesh rotation={[-Math.PI / 2, 0, 0]}>
              <ringGeometry args={[1.8, 2.3, 32]} />
              <meshBasicMaterial
                color="#ff5722"
                transparent
                opacity={0.8}
                side={THREE.DoubleSide}
              />
            </mesh>

            {/* 2. Vertical Warning Beacon */}
            <mesh position={[0, 4, 0]}>
              <cylinderGeometry args={[0.04, 0.04, 8, 8]} />
              <meshBasicMaterial
                color="#ff7043"
                transparent
                opacity={0.5}
              />
            </mesh>

            {/* 3. Point Light */}
            <pointLight color="#ff5722" intensity={3.0} distance={8} />
          </group>
        );
      })}
    </group>
  );
};
