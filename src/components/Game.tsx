import { Canvas, useFrame } from '@react-three/fiber';
import { Physics } from '@react-three/cannon';
import { PointerLockControls, Sky, Stars } from '@react-three/drei';
import { World } from './World';
import { Player } from './Player';
import { UI } from './UI';
import { useEffect, useRef, useState } from 'react';
import { useStore } from '../store/useStore';
import * as THREE from 'three';

const DayNightCycle = () => {
  const sunRef = useRef<THREE.DirectionalLight>(null);
  const skyRef = useRef<THREE.Mesh>(null);
  
  useFrame(({ clock }) => {
    const t = clock.getElapsedTime() * 0.05; // Speed of day/night cycle
    const x = Math.cos(t) * 100;
    const y = Math.sin(t) * 100;
    const z = Math.sin(t) * 100;
    
    if (sunRef.current) {
      sunRef.current.position.set(x, y, z);
    }
    if (skyRef.current && (skyRef.current.material as any).uniforms) {
      (skyRef.current.material as any).uniforms.sunPosition.value.set(x, y, z);
    }
  });

  return (
    <>
      <Sky ref={skyRef as any} sunPosition={[100, 20, 100]} />
      <Stars radius={100} depth={50} count={5000} factor={4} saturation={0} fade speed={1} />
      <ambientLight intensity={0.3} />
      <directionalLight ref={sunRef} castShadow intensity={1.5} position={[100, 20, 100]} />
    </>
  );
};

export const Game = () => {
  const generateWorld = useStore((state) => state.generateWorld);
  const blocks = useStore((state) => state.blocks);

  useEffect(() => {
    generateWorld();
  }, [generateWorld]);

  const isWorldGenerated = Object.keys(blocks).length > 0;

  return (
    <div id="game-container" className="w-full h-screen bg-black overflow-hidden relative font-sans">
      {isWorldGenerated && (
        <Canvas shadows camera={{ fov: 75 }}>
          <DayNightCycle />
          
          <Physics gravity={[0, -20, 0]}>
            <Player />
            <World />
          </Physics>
          
          <PointerLockControls />
        </Canvas>
      )}
      <UI />
    </div>
  );
};
