import React, { useEffect, useMemo, useState } from 'react';
import { Canvas } from '@react-three/fiber';
import { useForestStore } from './store/forestStore.js';
import { ForestEnvironment } from './forest/environment/ForestEnvironment.js';
import { ProceduralTree } from './forest/trees/ProceduralTree.js';
import { SmoothCamera } from './forest/camera/SmoothCamera.js';
import { GrowthParticle } from './forest/particles/GrowthParticle.js';
import { MyceliumConduits } from './forest/graph/MyceliumConduits.js';
import { SubterraneanCavern } from './forest/graph/SubterraneanCavern.js';
import { BlastRadiusPulse } from './forest/particles/BlastRadiusPulse.js';
import { HUD } from './components/HUD.js';
import { Onboarding } from './components/Onboarding.js';
import { BlastRadiusModal } from './components/BlastRadiusModal.js';
import { SearchPalette } from './components/SearchPalette.js';
import { GardenTenderModal } from './components/GardenTenderModal.js';
import { ProjectSelectorModal } from './components/ProjectSelectorModal.js';
import { GraphExplorerModal } from './components/GraphExplorerModal.js';

export default function App() {
  const {
    projects,
    selectedProjectIds,
    isProjectSelectorOpen,
    setProjectSelectorOpen,
    topics,
    sessions,
    myceliumLinks,
    isMyceliumVisible,
    selectedProjectId,
    selectedTopicId,
    selectedSessionId,
    selectProject,
    selectTopic,
    selectSession,
    
    isLive,
    isTodayMode,
    isCinematicMode,
    isOnboarded,
    growthEvent,
    triggerGrowthEvent,
    clearGrowthEvent,
    fetchProjects,
    fetchSettings
  } = useForestStore();

  const visibleProjects = useMemo(() => {
    return projects.filter(p => selectedProjectIds.includes(p.id));
  }, [projects, selectedProjectIds]);

  const [_wsError, setWsError] = useState(false);

  useEffect(() => {
    fetchProjects();
    fetchSettings();
  }, [fetchProjects, fetchSettings]);

  useEffect(() => {
    if (!isLive) return;

    let ws: WebSocket;
    const connect = () => {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${protocol}//${window.location.host}/ws`;
      try {
        ws = new WebSocket(wsUrl);
      } catch (e) {
        ws = new WebSocket('ws://localhost:3001');
      }

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === 'growth') {
            triggerGrowthEvent(data.session);
            fetchProjects();
          }
        } catch (e) {}
      };

      ws.onerror = () => setWsError(true);
      ws.onclose = () => {
        setTimeout(connect, 3000);
      };
    };

    connect();
    return () => {
      if (ws) ws.close();
    };
  }, [isLive, triggerGrowthEvent, fetchProjects]);

  // Organic phyllotaxis layout
  const projectPositions = useMemo(() => {
    const positions: Record<string, [number, number, number]> = {};
    const goldenAngle = 137.5 * (Math.PI / 180);
    const spacing = 3.6;

    visibleProjects.forEach((p, idx) => {
      const r = Math.sqrt(idx + 1) * spacing;
      const theta = idx * goldenAngle;
      
      const x = Math.cos(theta) * r;
      const z = Math.sin(theta) * r;
      positions[p.id] = [x, 0, z];
    });

    return positions;
  }, [visibleProjects]);

  const selectedProjectPos = selectedProjectId ? projectPositions[selectedProjectId] : null;

  const selectedLeafPos = useMemo(() => {
    if (!selectedProjectId || !selectedSessionId) return null;
    const projSess = sessions[selectedProjectId] || [];
    const projTopics = topics[selectedProjectId] || [];
    const sess = projSess.find(s => s.id === selectedSessionId);
    if (!sess) return null;

    const treePos = projectPositions[selectedProjectId];
    if (!treePos) return null;

    let hash = 0;
    for (let i = 0; i < selectedProjectId.length; i++) {
      hash = selectedProjectId.charCodeAt(i) + ((hash << 5) - hash);
    }
    const rand = () => {
      const x = Math.sin(hash++) * 10000;
      return x - Math.floor(x);
    };

    const branchCount = Math.max(3, projTopics.length);
    const totalSessions = projSess.length;
    const treeHeight = Math.min(7.5, 3.0 + totalSessions * 0.18);

    let foundPos: [number, number, number] | null = null;

    for (let i = 0; i < branchCount; i++) {
      const topic = projTopics[i % projTopics.length] || { id: `gen_${i}`, name: 'General' };
      const verticalRatio = 0.4 + (i / branchCount) * 0.5;
      const branchHeight = treeHeight * verticalRatio;
      const angle = (i / branchCount) * Math.PI * 2 + rand() * 0.6;
      const length = Math.max(1.5, 1.0 + treeHeight * 0.25 + rand() * 0.6);

      const topicSessions = projSess.filter(s => s.topicId === topic.id || (!s.topicId && topic.name === 'General'));
      
      topicSessions.forEach((s, sIdx) => {
        const leafRatio = 0.6 + (sIdx / Math.max(1, topicSessions.length)) * 0.4;
        const leafAngle = angle + (rand() - 0.5) * 0.7;
        const dist = length * leafRatio;

        if (s.id === selectedSessionId) {
          foundPos = [
            treePos[0] + Math.cos(leafAngle) * dist,
            branchHeight + (dist * 0.3) + (rand() - 0.5) * 0.4,
            treePos[2] + Math.sin(leafAngle) * dist
          ];
        }
      });
    }

    return foundPos;
  }, [selectedProjectId, selectedSessionId, sessions, topics, projectPositions]);

  const animatedGrowthDetails = useMemo(() => {
    if (!growthEvent) return null;
    const treePos = projectPositions[growthEvent.projectId];
    if (!treePos) return null;

    const leafPos: [number, number, number] = [
      treePos[0] + (Math.random() - 0.5) * 3,
      2 + Math.random() * 3,
      treePos[2] + (Math.random() - 0.5) * 3
    ];

    return { treePos, leafPos };
  }, [growthEvent, projectPositions]);

  const isEmpty = projects.length === 0;

  return (
    <div className="w-full h-full bg-[#06110a] relative flex flex-col justify-between">
      
      {/* 3D WebGL Canvas */}
      <Canvas shadows camera={{ position: [0, 24, 38], fov: 50 }}>
        {/* Lights & Volumetrics */}
        <ForestEnvironment />

        {/* Smooth Orbiting & Flying Camera */}
        <SmoothCamera
          selectedProjectPos={selectedProjectPos}
          selectedLeafPos={selectedLeafPos}
          isCinematicMode={isCinematicMode}
          forestRadius={Math.sqrt(visibleProjects.length) * 3.6}
        />

        {/* 1. 3D Underground Mycelium Network (HydraDB) */}
        {!isEmpty && (
          <MyceliumConduits
            links={myceliumLinks}
            projectPositions={projectPositions}
            visible={isMyceliumVisible}
          />
        )}

        {/* 2. Subterranean Root Cavern View (HydraDB Graph) */}
        <SubterraneanCavern />

        {/* 3. Dependency Blast Radius Shockwave */}
        <BlastRadiusPulse projectPositions={projectPositions} />

        {/* 4. Render Forest Trees */}
        {!isEmpty && visibleProjects.map((p) => {
          const projTopics = topics[p.id] || [];
          const projSessions = sessions[p.id] || [];
          const pos = projectPositions[p.id] || [0, 0, 0];

          return (
            <group key={p.id} position={pos}>
              <ProceduralTree
                project={p}
                topics={projTopics}
                sessions={projSessions}
                isSelected={p.id === selectedProjectId}
                onSelect={() => selectProject(p.id)}
                onSelectTopic={(tId) => selectTopic(tId)}
                onSelectSession={(sId) => selectSession(sId)}
                selectedTopicId={selectedTopicId}
                selectedSessionId={selectedSessionId}
                isTodayMode={isTodayMode}
              />
            </group>
          );
        })}

        {/* Empty State Sapling */}
        {isEmpty && (
          <group position={[0, 0, 0]}>
            <mesh position={[0, 0.8, 0]} castShadow>
              <cylinderGeometry args={[0.06, 0.12, 1.6, 8]} />
              <meshStandardMaterial color="#5d4037" roughness={0.9} />
            </mesh>
            <mesh position={[0, 1.7, 0]} castShadow>
              <sphereGeometry args={[0.5, 8, 8]} />
              <meshStandardMaterial 
                color="#43a047" 
                emissive="#2e7d32"
                emissiveIntensity={0.5} 
                roughness={0.6}
              />
            </mesh>
            <mesh position={[0, 2.3, 0]}>
              <octahedronGeometry args={[0.15]} />
              <meshStandardMaterial 
                color="#ffd54f" 
                emissive="#ffd54f" 
                emissiveIntensity={1.0} 
              />
            </mesh>
            <pointLight position={[0, 2.5, 0]} color="#ffd54f" intensity={2.5} distance={8} />
          </group>
        )}

        {/* Live Growth Seed Particle Animation */}
        {animatedGrowthDetails && (
          <GrowthParticle
            treePos={animatedGrowthDetails.treePos}
            leafPos={animatedGrowthDetails.leafPos}
            onComplete={() => {
              clearGrowthEvent();
              fetchProjects();
            }}
          />
        )}
      </Canvas>

      {/* Main HUD Chrome */}
      {!isEmpty && <HUD />}

      {/* Modals for the 4 Superpowers & Project Filter */}
      <BlastRadiusModal />
      <SearchPalette />
      <GardenTenderModal />
      <ProjectSelectorModal isOpen={isProjectSelectorOpen} onClose={() => setProjectSelectorOpen(false)} />
      <GraphExplorerModal 
        isOpen={useForestStore.getState().isGraphExplorerOpen} 
        onClose={() => useForestStore.getState().setGraphExplorerOpen(false)} 
      />

      {/* Onboarding Wizard */}
      {!isOnboarded && <Onboarding />}

    </div>
  );
}
