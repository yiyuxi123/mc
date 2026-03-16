import { useBox } from '@react-three/cannon';
import { useFrame, useThree } from '@react-three/fiber';
import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { useStore } from '../store/useStore';

const SPEED = 5;
const JUMP_FORCE = 4;

export const Player = () => {
  const { camera } = useThree();
  const [ref, api] = useBox(() => ({
    mass: 1,
    type: 'Dynamic',
    position: [0, 20, 0],
    args: [0.8, 1.8, 0.8],
    fixedRotation: true,
  }));

  const velocity = useRef([0, 0, 0]);
  useEffect(() => {
    api.velocity.subscribe((v) => (velocity.current = v));
  }, [api.velocity]);

  const pos = useRef([0, 0, 0]);
  useEffect(() => {
    api.position.subscribe((p) => (pos.current = p));
  }, [api.position]);

  const keys = useRef({
    w: false,
    a: false,
    s: false,
    d: false,
    space: false,
  });

  const isChatOpen = useStore((state) => state.isChatOpen);
  const isImageAnalyzerOpen = useStore((state) => state.isImageAnalyzerOpen);
  const isCraftingOpen = useStore((state) => state.isCraftingOpen);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (isChatOpen || isImageAnalyzerOpen || isCraftingOpen) return;
      if (e.code === 'KeyW') keys.current.w = true;
      if (e.code === 'KeyA') keys.current.a = true;
      if (e.code === 'KeyS') keys.current.s = true;
      if (e.code === 'KeyD') keys.current.d = true;
      if (e.code === 'Space') keys.current.space = true;
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'KeyW') keys.current.w = false;
      if (e.code === 'KeyA') keys.current.a = false;
      if (e.code === 'KeyS') keys.current.s = false;
      if (e.code === 'KeyD') keys.current.d = false;
      if (e.code === 'Space') keys.current.space = false;
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [isChatOpen, isImageAnalyzerOpen, isCraftingOpen]);

  useFrame(() => {
    camera.position.copy(new THREE.Vector3(pos.current[0], pos.current[1] + 0.6, pos.current[2]));

    const direction = new THREE.Vector3();
    const frontVector = new THREE.Vector3(0, 0, (keys.current.s ? 1 : 0) - (keys.current.w ? 1 : 0));
    const sideVector = new THREE.Vector3((keys.current.a ? 1 : 0) - (keys.current.d ? 1 : 0), 0, 0);

    direction.subVectors(frontVector, sideVector);
    
    if (direction.lengthSq() > 0) {
      direction.normalize().multiplyScalar(SPEED).applyEuler(new THREE.Euler(0, camera.rotation.y, 0));
    }

    api.velocity.set(
      direction.x,
      (keys.current.space && Math.abs(velocity.current[1]) < 0.1) ? JUMP_FORCE : velocity.current[1],
      direction.z
    );

    // Track biomes for quest
    const y = pos.current[1];
    let currentBiome = 'plains';
    if (y > 4) currentBiome = 'mountains';
    else if (y < -2) currentBiome = 'valley';
    
    useStore.getState().updateQuest('find_biomes', currentBiome);

    // Teleport back if falling off the world
    if (y < -20) {
      api.position.set(0, 20, 0);
      api.velocity.set(0, 0, 0);
    }
  });

  return <mesh ref={ref as any} />;
};
