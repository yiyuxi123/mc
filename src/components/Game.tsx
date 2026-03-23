import { Canvas, useFrame, useThree, events } from '@react-three/fiber';
import { PointerLockControls, Sky, Stars } from '@react-three/drei';
import { World, BreakingEffect } from './World';
import { Player } from './Player';
import { Drops } from './Drops';
import { UI } from './UI';
import { BGM } from './BGM';
import { MiniMap } from './MiniMap';
import { Weather } from './Weather';
import { useEffect, useRef } from 'react';
import { useStore } from '../store/useStore';
import * as THREE from 'three';

const DayNightCycle = () => {
  const sunRef = useRef<THREE.DirectionalLight>(null);
  const skyRef = useRef<any>(null);
  const ambientRef = useRef<THREE.AmbientLight>(null);
  const hemiRef = useRef<THREE.HemisphereLight>(null);
  
  useFrame(({ clock, camera }) => {
    const t = clock.getElapsedTime() * 0.01; // Slower day/night cycle
    
    // Randomly toggle rain every few minutes
    if (Math.random() < 0.0001) {
      const state = useStore.getState();
      state.setRaining(!state.isRaining);
    }
    
    const sunDistance = 100;
    const x = Math.cos(t) * sunDistance;
    const y = Math.sin(t) * sunDistance;
    const z = Math.sin(t) * sunDistance;
    
    if (sunRef.current) {
      // Center the sun around the player to optimize shadows and reduce flickering
      sunRef.current.position.set(camera.position.x + x, y, camera.position.z + z);
      sunRef.current.target.position.set(camera.position.x, 0, camera.position.z);
      sunRef.current.target.updateMatrixWorld();

      // Adjust intensity based on height (day/night)
      const intensity = Math.max(0, y / sunDistance);
      sunRef.current.intensity = intensity * 1.5;
    }
    
    if (skyRef.current) {
      skyRef.current.material.uniforms.sunPosition.value.set(x, y, z);
    }

    if (ambientRef.current && hemiRef.current) {
      const isDay = y > 0;
      
      // Check if player is inside
      let isInside = false;
      const px = Math.round(camera.position.x);
      const py = Math.round(camera.position.y);
      const pz = Math.round(camera.position.z);
      const blocks = useStore.getState().blocks;
      for (let cy = py; cy < py + 20; cy++) {
        const block = blocks[`${px},${cy},${pz}`];
        if (block && block.type !== 'glass' && block.type !== 'water' && block.type !== 'torch' && block.type !== 'flower') {
          isInside = true;
          break;
        }
      }

      const targetAmbient = isInside ? 0.05 : (isDay ? 0.6 : 0.2);
      const targetHemi = isInside ? 0.05 : (isDay ? 0.4 : 0.1);
      
      // Smooth transition
      ambientRef.current.intensity += (targetAmbient - ambientRef.current.intensity) * 0.1;
      hemiRef.current.intensity += (targetHemi - hemiRef.current.intensity) * 0.1;
    }
  });

  return (
    <>
      <Sky ref={skyRef} sunPosition={[100, 20, 100]} />
      <Stars radius={100} depth={50} count={5000} factor={4} saturation={0} fade speed={1} />
      <ambientLight ref={ambientRef} intensity={0.6} />
      <hemisphereLight ref={hemiRef} args={['#ffffff', '#444444', 0.4]} />
      <directionalLight 
        ref={sunRef} 
        castShadow 
        intensity={1.5} 
        position={[100, 100, 100]} 
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-camera-near={0.5}
        shadow-camera-far={500}
        shadow-camera-left={-50}
        shadow-camera-right={50}
        shadow-camera-top={50}
        shadow-camera-bottom={-50}
        shadow-bias={-0.001}
      />
    </>
  );
};

export const Game = () => {
  const generateWorld = useStore((state) => state.generateWorld);
  const isWorldGenerated = useStore((state) => Object.keys(state.blocks).length > 0);

  useEffect(() => {
    generateWorld();
  }, [generateWorld]);

  return (
    <div 
      id="game-container" 
      className="w-full h-screen bg-black overflow-hidden relative font-sans"
      onContextMenu={(e) => e.preventDefault()}
    >
      {isWorldGenerated && (
        <Canvas 
          shadows={{ type: THREE.PCFShadowMap }} 
          camera={{ fov: 75 }} 
          events={(store) => ({
            ...events(store),
            compute: (event, state) => {
              if (document.pointerLockElement) {
                state.pointer.set(0, 0);
                state.raycaster.setFromCamera(state.pointer, state.camera);
              } else {
                const clientX = (event as any).clientX ?? (event as any).touches?.[0]?.clientX;
                const clientY = (event as any).clientY ?? (event as any).touches?.[0]?.clientY;
                if (clientX !== undefined && clientY !== undefined) {
                  const x = (clientX / state.size.width) * 2 - 1;
                  const y = -(clientY / state.size.height) * 2 + 1;
                  state.pointer.set(x, y);
                }
                state.raycaster.setFromCamera(state.pointer, state.camera);
              }
            }
          })}
          onPointerMissed={(e) => { 
            (window as any).currentHoveredBlock = null; 
            if (e.button === 2) {
              const state = useStore.getState();
              const activeItem = state.inventory[state.activeItemIndex];
              if (activeItem && activeItem.type === 'bread' && activeItem.count > 0) {
                state.eatFood();
                import('../utils/sounds').then(m => m.playSound('break'));
              }
            }
          }}
          onPointerUp={() => { (window as any).currentBreakingBlock = null; }}
        >
          <DayNightCycle />
          <Weather />
          <Player />
          <World />
          <Drops />
          <BreakingEffect />
          <PointerLockControls />
        </Canvas>
      )}
      <UI />
      <MiniMap />
      <BGM />
    </div>
  );
};
