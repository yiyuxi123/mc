import { useFrame } from '@react-three/fiber';
import { useRef, useState, useMemo } from 'react';
import * as THREE from 'three';
import { textures } from '../utils/textures';
import { useStore } from '../store/useStore';

interface Animal {
  id: string;
  type: 'pig' | 'cow';
  pos: THREE.Vector3;
  targetPos: THREE.Vector3;
  velocity: THREE.Vector3;
  state: 'idle' | 'walking';
  stateTimer: number;
}

export const Animals = () => {
  const [animals, setAnimals] = useState<Animal[]>([]);
  const initialized = useRef(false);

  // Initialize animals
  useMemo(() => {
    if (initialized.current) return;
    initialized.current = true;
    
    const newAnimals: Animal[] = [];
    for (let i = 0; i < 5; i++) {
      newAnimals.push({
        id: `pig_${i}`,
        type: 'pig',
        pos: new THREE.Vector3(Math.random() * 40 - 20, 10, Math.random() * 40 - 20),
        targetPos: new THREE.Vector3(),
        velocity: new THREE.Vector3(),
        state: 'idle',
        stateTimer: Math.random() * 5
      });
    }
    for (let i = 0; i < 3; i++) {
      newAnimals.push({
        id: `cow_${i}`,
        type: 'cow',
        pos: new THREE.Vector3(Math.random() * 40 - 20, 10, Math.random() * 40 - 20),
        targetPos: new THREE.Vector3(),
        velocity: new THREE.Vector3(),
        state: 'idle',
        stateTimer: Math.random() * 5
      });
    }
    setAnimals(newAnimals);
  }, []);

  useFrame((state, delta) => {
    const dt = Math.min(delta, 0.1);
    const blocks = useStore.getState().blocks;
    
    setAnimals(prev => prev.map(animal => {
      const newAnimal = { ...animal };
      newAnimal.stateTimer -= dt;

      // State machine
      if (newAnimal.stateTimer <= 0) {
        if (newAnimal.state === 'idle') {
          newAnimal.state = 'walking';
          newAnimal.stateTimer = 2 + Math.random() * 3;
          const angle = Math.random() * Math.PI * 2;
          const dist = 2 + Math.random() * 5;
          newAnimal.targetPos.set(
            newAnimal.pos.x + Math.cos(angle) * dist,
            newAnimal.pos.y,
            newAnimal.pos.z + Math.sin(angle) * dist
          );
        } else {
          newAnimal.state = 'idle';
          newAnimal.stateTimer = 1 + Math.random() * 4;
          newAnimal.velocity.set(0, newAnimal.velocity.y, 0);
        }
      }

      // Movement
      if (newAnimal.state === 'walking') {
        const dir = new THREE.Vector3().subVectors(newAnimal.targetPos, newAnimal.pos);
        dir.y = 0;
        if (dir.lengthSq() > 0.1) {
          dir.normalize().multiplyScalar(1.5); // Speed
          newAnimal.velocity.x = dir.x;
          newAnimal.velocity.z = dir.z;
        } else {
          newAnimal.state = 'idle';
          newAnimal.stateTimer = 1 + Math.random() * 2;
          newAnimal.velocity.x = 0;
          newAnimal.velocity.z = 0;
        }
      }

      // Gravity
      newAnimal.velocity.y -= 20 * dt;

      // Collision detection
      const nextPos = newAnimal.pos.clone();
      
      // Y collision
      nextPos.y += newAnimal.velocity.y * dt;
      const blockY = blocks[`${Math.round(nextPos.x)},${Math.floor(nextPos.y)},${Math.round(nextPos.z)}`];
      if (blockY && blockY.type !== 'water' && blockY.type !== 'flower' && blockY.type !== 'torch') {
        newAnimal.pos.y = Math.floor(nextPos.y) + 1;
        newAnimal.velocity.y = 0;
        
        // Jump if stuck while walking
        if (newAnimal.state === 'walking') {
          const blockForward = blocks[`${Math.round(nextPos.x + newAnimal.velocity.x * dt * 5)},${Math.floor(newAnimal.pos.y)},${Math.round(nextPos.z + newAnimal.velocity.z * dt * 5)}`];
          if (blockForward && blockForward.type !== 'water' && blockForward.type !== 'flower' && blockForward.type !== 'torch') {
            newAnimal.velocity.y = 6; // Jump force
          }
        }
      } else {
        newAnimal.pos.y = nextPos.y;
      }

      // X collision
      nextPos.copy(newAnimal.pos);
      nextPos.x += newAnimal.velocity.x * dt;
      const blockX = blocks[`${Math.round(nextPos.x)},${Math.floor(nextPos.y)},${Math.round(nextPos.z)}`];
      if (blockX && blockX.type !== 'water' && blockX.type !== 'flower' && blockX.type !== 'torch') {
        newAnimal.velocity.x = 0;
      } else {
        newAnimal.pos.x = nextPos.x;
      }

      // Z collision
      nextPos.copy(newAnimal.pos);
      nextPos.z += newAnimal.velocity.z * dt;
      const blockZ = blocks[`${Math.round(nextPos.x)},${Math.floor(nextPos.y)},${Math.round(nextPos.z)}`];
      if (blockZ && blockZ.type !== 'water' && blockZ.type !== 'flower' && blockZ.type !== 'torch') {
        newAnimal.velocity.z = 0;
      } else {
        newAnimal.pos.z = nextPos.z;
      }

      // Keep in bounds
      if (newAnimal.pos.y < -10) {
        newAnimal.pos.y = 20;
        newAnimal.velocity.y = 0;
      }

      return newAnimal;
    }));
  });

  return (
    <>
      {animals.map(animal => (
        <group 
          key={animal.id} 
          position={[animal.pos.x, animal.pos.y + 0.5, animal.pos.z]}
          onClick={(e) => {
            e.stopPropagation();
            const state = useStore.getState();
            const activeItem = state.inventory[state.activeItemIndex];
            if (activeItem && activeItem.type === 'laser') {
              import('../utils/sounds').then(m => m.playSound('laser'));
              // Kill animal and drop meat
              setAnimals(prev => prev.filter(a => a.id !== animal.id));
              state.addDrop('bread', [animal.pos.x, animal.pos.y, animal.pos.z]); // Drop bread as meat for now
            } else {
              // Just knockback
              setAnimals(prev => prev.map(a => {
                if (a.id === animal.id) {
                  const newA = { ...a };
                  newA.velocity.y = 5;
                  newA.velocity.x += (Math.random() - 0.5) * 10;
                  newA.velocity.z += (Math.random() - 0.5) * 10;
                  return newA;
                }
                return a;
              }));
              import('../utils/sounds').then(m => m.playSound('break'));
            }
          }}
        >
          {/* Body */}
          <mesh castShadow receiveShadow>
            <boxGeometry args={animal.type === 'cow' ? [1.2, 1.2, 1.8] : [0.9, 0.9, 1.4]} />
            <meshStandardMaterial map={textures[animal.type]} />
          </mesh>
          {/* Head */}
          <mesh castShadow receiveShadow position={[0, animal.type === 'cow' ? 0.8 : 0.5, animal.type === 'cow' ? 1 : 0.8]}>
            <boxGeometry args={animal.type === 'cow' ? [0.8, 0.8, 0.8] : [0.6, 0.6, 0.6]} />
            <meshStandardMaterial map={textures[animal.type]} />
          </mesh>
        </group>
      ))}
    </>
  );
};
