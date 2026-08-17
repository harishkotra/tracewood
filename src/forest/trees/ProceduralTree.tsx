import React, { useRef, useMemo, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import * as THREE from 'three';
import { Project, Topic, Session } from '../../database/types.js';

interface ProceduralTreeProps {
  project: Project;
  topics: Topic[];
  sessions: Session[];
  isSelected: boolean;
  onSelect: () => void;
  onSelectTopic: (topicId: string) => void;
  onSelectSession: (sessionId: string) => void;
  selectedTopicId: string | null;
  selectedSessionId: string | null;
  isTodayMode: boolean;
}

function seedRandom(seedStr: string) {
  let hash = 0;
  for (let i = 0; i < seedStr.length; i++) {
    hash = seedStr.charCodeAt(i) + ((hash << 5) - hash);
  }
  return () => {
    const x = Math.sin(hash++) * 10000;
    return x - Math.floor(x);
  };
}

export const ProceduralTree: React.FC<ProceduralTreeProps> = ({
  project,
  topics,
  sessions,
  isSelected,
  onSelect,
  onSelectTopic,
  onSelectSession,
  selectedTopicId,
  selectedSessionId,
  isTodayMode
}) => {
  const treeRef = useRef<THREE.Group>(null);
  const rand = useMemo(() => seedRandom(project.id), [project.id]);
  const [hovered, setHovered] = useState(false);
  const [hoveredTopicId, setHoveredTopicId] = useState<string | null>(null);

  const stats = useMemo(() => {
    const totalSessions = sessions.length;
    const totalTools = sessions.reduce((acc, s) => acc + s.toolCallCount, 0);
    
    const today = new Date().toISOString().split('T')[0];
    const activeToday = sessions.some(s => s.startedAt.startsWith(today));

    const height = Math.min(8.0, 3.2 + totalSessions * 0.18);
    const thickness = Math.min(0.7, 0.2 + totalTools * 0.006);

    return { height, thickness, activeToday, totalSessions };
  }, [sessions]);

  // Curved trunk segments
  const trunkSegments = useMemo(() => {
    const segments = 6;
    const points: [number, number, number][] = [];
    const radii: number[] = [];
    
    let currentX = 0;
    let currentZ = 0;
    const curveIntensity = 0.2 + rand() * 0.3;

    for (let i = 0; i <= segments; i++) {
      const h = (i / segments) * stats.height;
      
      if (i > 0) {
        currentX += Math.sin(h * 0.8 + rand()) * curveIntensity;
        currentZ += Math.cos(h * 0.8 + rand()) * curveIntensity;
      }
      
      points.push([currentX, h, currentZ]);
      const taper = 1.0 - (i / segments) * 0.6;
      radii.push(stats.thickness * taper);
    }
    
    return { points, radii, topPoint: points[points.length - 1] };
  }, [stats, rand]);

  // Branch and leaf structures
  const treeStructure = useMemo(() => {
    const branchCount = Math.max(3, topics.length);
    const branches = [];

    for (let i = 0; i < branchCount; i++) {
      const topic = topics[i % topics.length] || { id: `gen_${i}`, name: 'General' };
      
      const vRatio = 0.4 + (i / branchCount) * 0.5; 
      const segmentIdx = Math.floor(vRatio * (trunkSegments.points.length - 1));
      const trunkPt = trunkSegments.points[segmentIdx] || [0, 0, 0];
      
      const angle = (i / branchCount) * Math.PI * 2 + rand() * 0.6;
      const length = Math.max(1.6, 1.1 + stats.height * 0.25 + rand() * 0.6);
      const startRadius = trunkSegments.radii[segmentIdx] * 0.6;

      const topicSessions = sessions.filter(s => s.topicId === topic.id || (!s.topicId && topic.name === 'General'));

      let leafClouds = [];

      if (topicSessions.length === 0) {
        const leafAngle = angle;
        const dist = length * 0.9;
        const lx = trunkPt[0] + Math.cos(leafAngle) * dist;
        const ly = trunkPt[1] + (dist * 0.3);
        const lz = trunkPt[2] + Math.sin(leafAngle) * dist;

        const subLeaves = [];
        for (let j = 0; j < 3; j++) {
          subLeaves.push({
            pos: [(rand() - 0.5) * 0.25, (rand() - 0.5) * 0.25, (rand() - 0.5) * 0.25] as [number, number, number],
            scale: 0.28 + rand() * 0.15
          });
        }

        leafClouds.push({
          id: `dummy_${topic.id}`,
          pos: [lx, ly, lz] as [number, number, number],
          color: '#388e3c',
          glowColor: '#1b5e20',
          subLeaves,
          importance: 0.1,
          outcome: 'success' as const,
          isToday: false,
          isDummy: true
        });
      } else {
        leafClouds = topicSessions.map((session, sIdx) => {
          const leafRatio = 0.6 + (sIdx / Math.max(1, topicSessions.length)) * 0.4;
          const leafAngle = angle + (rand() - 0.5) * 0.7;
          const dist = length * leafRatio;

          const lx = trunkPt[0] + Math.cos(leafAngle) * dist;
          const ly = trunkPt[1] + (dist * 0.3) + (rand() - 0.5) * 0.4;
          const lz = trunkPt[2] + Math.sin(leafAngle) * dist;

          let primaryColor = '#43a047'; // Vibrant emerald foliage
          let glowColor = '#1b5e20';
          const todayStr = new Date().toISOString().split('T')[0];
          const isNew = session.startedAt.startsWith(todayStr);

          if (session.outcome === 'failed') {
            primaryColor = '#bf360c'; // Warm rust autumn tone
            glowColor = '#3e2723';
          } else if (isNew) {
            primaryColor = '#66bb6a'; // Fresh active green
            glowColor = '#81c784';
          } else if (session.importance && session.importance > 0.7) {
            primaryColor = '#ffd54f'; // Golden milestone bloom
            glowColor = '#ffe082';
          }

          const subLeaves = [];
          const numSubLeaves = 4;
          for (let j = 0; j < numSubLeaves; j++) {
            const offsetX = (rand() - 0.5) * 0.45;
            const offsetY = (rand() - 0.5) * 0.45;
            const offsetZ = (rand() - 0.5) * 0.45;
            const scale = 0.32 + rand() * 0.35 + (session.toolCallCount * 0.002);
            
            subLeaves.push({
              pos: [offsetX, offsetY, offsetZ] as [number, number, number],
              scale
            });
          }

          return {
            id: session.id,
            title: session.title || 'Session',
            pos: [lx, ly, lz] as [number, number, number],
            color: primaryColor,
            glowColor,
            subLeaves,
            importance: session.importance || 0.1,
            outcome: session.outcome,
            isToday: isNew,
            isDummy: false
          };
        });
      }

      // Branch midpoint for topic label pin
      const branchMid = [
        trunkPt[0] + (Math.cos(angle) * length * 0.6),
        trunkPt[1] + (length * 0.2),
        trunkPt[2] + (Math.sin(angle) * length * 0.6)
      ] as [number, number, number];

      branches.push({
        id: topic.id,
        name: topic.name,
        trunkPt,
        angle,
        length,
        startRadius,
        branchMid,
        leafClouds
      });
    }

    return branches;
  }, [topics, sessions, stats, rand, trunkSegments]);

  useFrame((state) => {
    if (!treeRef.current) return;
    const time = state.clock.getElapsedTime();
    const windSpeed = stats.activeToday ? 1.3 : 0.7;
    const windForce = 0.012 * (1 + stats.height * 0.1);

    treeRef.current.rotation.z = Math.sin(time * windSpeed + project.name.charCodeAt(0)) * windForce;
    treeRef.current.rotation.x = Math.cos(time * windSpeed * 0.9 + project.name.charCodeAt(1)) * windForce * 0.5;
  });

  const treeOpacity = isTodayMode && !stats.activeToday ? 0.2 : 1.0;

  return (
    <group 
      ref={treeRef} 
      onClick={(e) => { 
        e.stopPropagation(); 
        onSelect(); 
      }}
      onPointerOver={(e) => {
        e.stopPropagation();
        setHovered(true);
        document.body.style.cursor = 'pointer';
      }}
      onPointerOut={() => {
        setHovered(false);
        document.body.style.cursor = 'auto';
      }}
    >
      
      {/* 1. Floating 3D Project Badge above tree */}
      <Html
        position={[0, stats.height + 1.2, 0]}
        center
        distanceFactor={22}
        style={{
          transition: 'all 0.2s ease',
          transform: `scale(${hovered || isSelected ? 1.15 : 0.9})`,
          pointerEvents: 'none'
        }}
      >
        <div className={`px-2.5 py-1 rounded-md text-[11px] font-mono whitespace-nowrap shadow-lg flex items-center gap-1.5 transition-all ${
          isSelected 
            ? 'bg-forest-moss border-2 border-forest-fern text-forest-glow font-bold' 
            : hovered 
              ? 'bg-black/85 border border-forest-leaf text-forest-glow' 
              : 'bg-black/60 border border-forest-moss/30 text-forest-sage/80'
        }`}>
          <span>{project.name}</span>
          <span className="text-[9px] text-forest-leaf opacity-80">({stats.totalSessions})</span>
        </div>
      </Html>

      {/* 2. Curved Trunk segments */}
      {trunkSegments.points.slice(1).map((pt, idx) => {
        const prevPt = trunkSegments.points[idx];
        const midpoint = [
          (pt[0] + prevPt[0]) / 2,
          (pt[1] + prevPt[1]) / 2,
          (pt[2] + prevPt[2]) / 2
        ] as [number, number, number];

        const direction = new THREE.Vector3(pt[0] - prevPt[0], pt[1] - prevPt[1], pt[2] - prevPt[2]);
        const length = direction.length();
        
        const up = new THREE.Vector3(0, 1, 0);
        const quaternion = new THREE.Quaternion().setFromUnitVectors(up, direction.clone().normalize());
        const rotation = new THREE.Euler().setFromRotationMatrix(
          new THREE.Matrix4().makeRotationFromQuaternion(quaternion)
        );

        return (
          <mesh 
            key={idx} 
            castShadow 
            receiveShadow 
            position={midpoint}
            rotation={[rotation.x, rotation.y, rotation.z]}
          >
            <cylinderGeometry args={[trunkSegments.radii[idx + 1], trunkSegments.radii[idx], length, 8]} />
            <meshStandardMaterial
              color={isSelected ? "#8d6e63" : hovered ? "#6d4c41" : "#5d4037"}
              roughness={0.8}
              transparent
              opacity={treeOpacity}
            />
          </mesh>
        );
      })}

      {/* 3. Branches (Themes / Topics) */}
      {treeStructure.map((branch) => {
        const isBranchSelected = selectedTopicId === branch.id;
        const isBranchHovered = hoveredTopicId === branch.id;
        const branchOpacity = isTodayMode && !stats.activeToday ? 0.2 : 1.0;

        const branchDirection = new THREE.Vector3(
          Math.cos(branch.angle) * branch.length,
          branch.length * 0.3,
          Math.sin(branch.angle) * branch.length
        );

        const midpoint = [
          branch.trunkPt[0] + branchDirection.x / 2,
          branch.trunkPt[1] + branchDirection.y / 2,
          branch.trunkPt[2] + branchDirection.z / 2
        ] as [number, number, number];

        const up = new THREE.Vector3(0, 1, 0);
        const quaternion = new THREE.Quaternion().setFromUnitVectors(up, branchDirection.clone().normalize());
        const rotation = new THREE.Euler().setFromRotationMatrix(
          new THREE.Matrix4().makeRotationFromQuaternion(quaternion)
        );

        return (
          <group key={branch.id}>
            {/* Branch wood */}
            <mesh
              castShadow
              position={midpoint}
              rotation={[rotation.x, rotation.y, rotation.z]}
              onClick={(e) => {
                e.stopPropagation();
                onSelectTopic(branch.id);
              }}
              onPointerOver={(e) => {
                e.stopPropagation();
                setHoveredTopicId(branch.id);
                document.body.style.cursor = 'pointer';
              }}
              onPointerOut={() => {
                setHoveredTopicId(null);
                document.body.style.cursor = 'auto';
              }}
            >
              <cylinderGeometry args={[branch.startRadius * 0.4, branch.startRadius, branchDirection.length(), 6]} />
              <meshStandardMaterial
                color={isBranchSelected ? "#a1887f" : isBranchHovered ? "#8d6e63" : "#6d4c41"}
                roughness={0.85}
                transparent
                opacity={branchOpacity}
              />
            </mesh>

            {/* 3D Floating Branch Topic Pin (Shows when tree or branch is selected/hovered) */}
            {(isSelected || hovered || isBranchHovered) && (
              <Html position={branch.branchMid} center distanceFactor={14}>
                <div 
                  onClick={(e) => {
                    e.stopPropagation();
                    onSelectTopic(branch.id);
                  }}
                  className={`px-2 py-0.5 rounded text-[9px] font-mono cursor-pointer transition-all ${
                    isBranchSelected
                      ? 'bg-forest-fern text-forest-glow font-bold scale-110 shadow-md'
                      : 'bg-black/75 hover:bg-forest-moss text-forest-sage border border-forest-moss/40'
                  }`}
                >
                  {branch.name}
                </div>
              </Html>
            )}

            {/* 4. Soft Overlapping Leaf Clouds (Sessions) */}
            {branch.leafClouds.map((cloud) => {
              const isLeafSelected = selectedSessionId === cloud.id;
              
              if (isTodayMode && !cloud.isToday) return null;

              return (
                <group 
                  key={cloud.id} 
                  position={cloud.pos}
                  onClick={(e) => {
                    e.stopPropagation();
                    if (!cloud.isDummy) {
                      onSelectSession(cloud.id);
                    }
                  }}
                  onPointerOver={(e) => {
                    e.stopPropagation();
                    document.body.style.cursor = 'pointer';
                  }}
                  onPointerOut={() => {
                    document.body.style.cursor = 'auto';
                  }}
                >
                  {cloud.subLeaves.map((sub, sIdx) => (
                    <mesh key={sIdx} position={sub.pos} castShadow>
                      <sphereGeometry args={[sub.scale * (isLeafSelected ? 1.4 : hovered ? 1.15 : 1.0), 8, 8]} />
                      <meshStandardMaterial
                        color={isLeafSelected ? "#ffffff" : cloud.color}
                        emissive={isLeafSelected ? "#f0e6d2" : hovered ? cloud.color : cloud.glowColor}
                        emissiveIntensity={isLeafSelected ? 0.8 : hovered ? 0.5 : 0.3}
                        roughness={0.65}
                        metalness={0.0}
                        transparent
                        opacity={isTodayMode && !cloud.isToday ? 0.2 : 0.92}
                      />
                    </mesh>
                  ))}

                  {/* Milestone flower indicators */}
                  {cloud.importance > 0.7 && cloud.outcome === 'success' && !cloud.isDummy && (
                    <mesh position={[0, 0.45, 0]}>
                      <octahedronGeometry args={[0.18]} />
                      <meshStandardMaterial 
                        color="#ffd54f" 
                        emissive="#ffca28" 
                        emissiveIntensity={0.9} 
                      />
                    </mesh>
                  )}
                </group>
              );
            })}
          </group>
        );
      })}

      {/* Bioluminescent Point Light around active trees */}
      {stats.activeToday && (
        <pointLight
          position={[0, 0.4, 0]}
          color="#81c784"
          intensity={2.0}
          distance={6}
          decay={2}
        />
      )}
    </group>
  );
};
