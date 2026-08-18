import React, { useRef, useEffect, useState } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import { useForestStore } from '../../store/forestStore.js';

interface SmoothCameraProps {
  selectedProjectPos: [number, number, number] | null;
  selectedLeafPos: [number, number, number] | null;
  isCinematicMode: boolean;
  forestRadius?: number;
}

export const SmoothCamera: React.FC<SmoothCameraProps> = ({
  selectedProjectPos,
  selectedLeafPos,
  isCinematicMode,
  forestRadius = 25
}) => {
  const { camera } = useThree();
  const controlsRef = useRef<any>(null);
  const { isSubterraneanMode } = useForestStore();
  
  const defaultHeight = Math.max(16, forestRadius * 0.6);
  const defaultDist = Math.max(26, forestRadius * 1.15);

  const [isTransitioning, setIsTransitioning] = useState(false);
  const targetCamPos = useRef(new THREE.Vector3(0, defaultHeight, defaultDist));
  const targetLookAt = useRef(new THREE.Vector3(0, 2, 0));

  // Trigger camera flight when target selection or mode changes
  useEffect(() => {
    if (isSubterraneanMode) {
      targetCamPos.current.set(0, -6, 16);
      targetLookAt.current.set(0, -11, 0);
      setIsTransitioning(true);
    } else if (selectedLeafPos) {
      const [lx, ly, lz] = selectedLeafPos;
      targetCamPos.current.set(lx + 1.2, ly + 0.6, lz + 1.8);
      targetLookAt.current.set(lx, ly, lz);
      setIsTransitioning(true);
    } else if (selectedProjectPos) {
      const [tx, ty, tz] = selectedProjectPos;
      targetCamPos.current.set(tx, ty + 3.5, tz + 8.5);
      targetLookAt.current.set(tx, ty + 1.8, tz);
      setIsTransitioning(true);
    } else {
      targetCamPos.current.set(0, defaultHeight, defaultDist);
      targetLookAt.current.set(0, 2, 0);
      setIsTransitioning(true);
    }
  }, [selectedProjectPos, selectedLeafPos, isSubterraneanMode, defaultHeight, defaultDist]);

  useEffect(() => {
    const controls = controlsRef.current;
    if (!controls) return;

    const onStart = () => {
      setIsTransitioning(false);
    };

    controls.addEventListener('start', onStart);
    return () => controls.removeEventListener('start', onStart);
  }, []);

  useFrame((state) => {
    const time = state.clock.getElapsedTime();

    if (isCinematicMode && !selectedProjectPos && !isSubterraneanMode) {
      const radius = defaultDist;
      const speed = 0.035;
      const cx = Math.cos(time * speed) * radius;
      const cz = Math.sin(time * speed) * radius;
      
      camera.position.lerp(new THREE.Vector3(cx, defaultHeight + Math.sin(time * 0.1) * 2, cz), 0.02);
      if (controlsRef.current) {
        controlsRef.current.target.lerp(new THREE.Vector3(0, 2, 0), 0.05);
        controlsRef.current.update();
      }
    } else if (isTransitioning) {
      camera.position.lerp(targetCamPos.current, 0.065);

      if (controlsRef.current) {
        controlsRef.current.target.lerp(targetLookAt.current, 0.065);
        controlsRef.current.update();
      }

      if (camera.position.distanceTo(targetCamPos.current) < 0.15) {
        setIsTransitioning(false);
      }
    }
  });

  return (
    <OrbitControls
      ref={controlsRef}
      enableDamping
      dampingFactor={0.06}
      rotateSpeed={0.8}
      zoomSpeed={1.2}
      panSpeed={0.8}
      minDistance={1.5}
      maxDistance={150}
      maxPolarAngle={isSubterraneanMode ? Math.PI : Math.PI / 2 - 0.03}
    />
  );
};
