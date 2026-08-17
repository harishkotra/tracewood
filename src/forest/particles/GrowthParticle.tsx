import React, { useRef, useState, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

interface GrowthParticleProps {
  treePos: [number, number, number];
  leafPos: [number, number, number];
  onComplete: () => void;
}

export const GrowthParticle: React.FC<GrowthParticleProps> = ({
  treePos,
  leafPos,
  onComplete
}) => {
  const meshRef = useRef<THREE.Mesh>(null);
  const lightRef = useRef<THREE.PointLight>(null);
  
  const [startTime] = useState(() => Date.now());
  const duration = 2400; // Total animation length in milliseconds (Section 18)

  useFrame(() => {
    if (!meshRef.current) return;

    const elapsed = Date.now() - startTime;
    const progress = Math.min(1.0, elapsed / duration);

    if (progress >= 1.0) {
      onComplete();
      return;
    }

    // Path segments
    const startPos = new THREE.Vector3(treePos[0], 12, treePos[2] + 4); // Fly down from sky
    const rootPos = new THREE.Vector3(treePos[0], 0.1, treePos[2]);    // Tree base
    const branchStart = new THREE.Vector3(treePos[0], leafPos[1] * 0.7, treePos[2]); // Branch fork height
    const endPos = new THREE.Vector3(leafPos[0], leafPos[1], leafPos[2]); // Leaf destination

    const currentPos = new THREE.Vector3();

    if (progress < 0.4) {
      // Stage 1: Fly to tree root (0.0 to 0.4)
      const t = progress / 0.4;
      currentPos.lerpVectors(startPos, rootPos, t);
    } else if (progress < 0.7) {
      // Stage 2: Climb trunk (0.4 to 0.7)
      const t = (progress - 0.4) / 0.3;
      currentPos.lerpVectors(rootPos, branchStart, t);
    } else {
      // Stage 3: Extend along branch to leaf (0.7 to 1.0)
      const t = (progress - 0.7) / 0.3;
      currentPos.lerpVectors(branchStart, endPos, t);
    }

    meshRef.current.position.copy(currentPos);
    if (lightRef.current) {
      lightRef.current.position.copy(currentPos);
    }

    // Pulse size and intensity
    const pulse = 0.15 + Math.sin(Date.now() * 0.02) * 0.05;
    meshRef.current.scale.setScalar(pulse);
  });

  return (
    <group>
      {/* Glow Mesh */}
      <mesh ref={meshRef}>
        <sphereGeometry args={[1, 8, 8]} />
        <meshBasicMaterial color="#f0e6d2" transparent opacity={0.9} />
      </mesh>
      
      {/* Point Light Casting Glow */}
      <pointLight 
        ref={lightRef} 
        color="#f0e6d2" 
        intensity={2.5} 
        distance={6} 
        decay={2} 
      />
    </group>
  );
};
