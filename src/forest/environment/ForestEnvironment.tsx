import React, { useMemo } from 'react';
import { Sparkles } from '@react-three/drei';
import * as THREE from 'three';

export const ForestEnvironment: React.FC = () => {
  // Generate expansive rolling terrain
  const hillyTerrainGeometry = useMemo(() => {
    const geo = new THREE.PlaneGeometry(240, 240, 50, 50);
    const pos = geo.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const y = pos.getY(i);
      
      const zHeight = 
        Math.sin(x * 0.05) * Math.cos(y * 0.05) * 1.0 + 
        Math.sin(x * 0.02) * Math.cos(y * 0.02) * 2.2;
      
      pos.setZ(i, zHeight);
    }
    geo.computeVertexNormals();
    return geo;
  }, []);

  return (
    <>
      {/* 1. Atmospheric fog with generous range to reveal the entire forest */}
      <fog attach="fog" args={["#06110a", 50, 150]} />

      {/* 2. Hemisphere lighting for soft sky/ground gradient */}
      <hemisphereLight
        color="#81c784"
        groundColor="#1b3322"
        intensity={0.7}
      />

      {/* 3. Warm Ambient light */}
      <ambientLight intensity={0.9} color="#4e7d5e" />

      {/* 4. Directional Moonlight */}
      <directionalLight
        position={[25, 35, 20]}
        intensity={2.8}
        color="#fff8e7"
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-bias={-0.0003}
      />

      {/* Fill directional light */}
      <directionalLight
        position={[-25, 20, -15]}
        intensity={1.0}
        color="#66bb6a"
      />

      {/* 5. Rich mossy forest floor */}
      <mesh 
        geometry={hillyTerrainGeometry} 
        rotation={[-Math.PI / 2, 0, 0]} 
        receiveShadow 
        position={[0, -0.4, 0]}
      >
        <meshStandardMaterial 
          color="#1b3322" // Vibrant moss meadow
          roughness={0.88} 
          metalness={0.02}
        />
      </mesh>

      {/* 6. Firefly Sparkles scattered through the forest */}
      <Sparkles
        count={160}
        scale={[80, 20, 80]}
        size={3.5}
        speed={0.6}
        color="#a5d6a7"
        opacity={0.8}
      />

      <Sparkles
        count={70}
        scale={[60, 15, 60]}
        size={4.5}
        speed={0.35}
        color="#ffd54f" // Bioluminescent golden embers
        opacity={0.7}
      />
    </>
  );
};
