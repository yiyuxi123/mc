import { useFrame } from '@react-three/fiber';
import { useStore } from '../store/useStore';
import { textures } from '../utils/textures';
import { useRef } from 'react';
import * as THREE from 'three';

export const Drops = () => {
  const drops = useStore(s => s.drops);
  const groupRef = useRef<THREE.Group>(null);
  
  useFrame((state, delta) => {
    if (groupRef.current) {
      groupRef.current.children.forEach((child, i) => {
        child.rotation.y += delta;
        child.rotation.x += delta * 0.5;
        const drop = drops[i];
        if (drop) {
           child.position.y = drop.pos[1] + Math.sin(state.clock.elapsedTime * 3 + i) * 0.1;
        }
      });
    }
  });

  return (
    <group ref={groupRef}>
      {drops.map(drop => (
        <mesh key={drop.id} position={drop.pos} scale={0.3}>
          <boxGeometry args={[1, 1, 1]} />
          <meshStandardMaterial map={textures[drop.type as keyof typeof textures]} />
        </mesh>
      ))}
    </group>
  );
};
