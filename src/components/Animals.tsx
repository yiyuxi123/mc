import { useFrame } from '@react-three/fiber';
import { useRef, useState, useMemo } from 'react';
import * as THREE from 'three';
import { textures } from '../utils/textures';
import { useStore } from '../store/useStore';

interface AnimalData {
  id: string;
  type: 'pig' | 'cow';
  initialPos: [number, number, number];
}

const AnimalComponent = ({ data, removeAnimal }: { data: AnimalData, removeAnimal: (id: string) => void }) => {
  const groupRef = useRef<THREE.Group>(null);
  const legsRef = useRef<THREE.Group[]>([]);
  const headRef = useRef<THREE.Group>(null);

  // Local state for animation and physics
  const stateRef = useRef({
    pos: new THREE.Vector3(...data.initialPos),
    targetPos: new THREE.Vector3(),
    velocity: new THREE.Vector3(),
    state: 'idle' as 'idle' | 'walking',
    stateTimer: Math.random() * 5
  });

  useFrame((state, delta) => {
    if (!groupRef.current) return;
    
    const dt = Math.min(delta, 0.1);
    const animalState = stateRef.current;
    const blocks = useStore.getState().blocks;

    animalState.stateTimer -= dt;

    // State machine
    if (animalState.stateTimer <= 0) {
      if (animalState.state === 'idle') {
        animalState.state = 'walking';
        animalState.stateTimer = 2 + Math.random() * 3;
        const angle = Math.random() * Math.PI * 2;
        const dist = 2 + Math.random() * 5;
        animalState.targetPos.set(
          animalState.pos.x + Math.cos(angle) * dist,
          animalState.pos.y,
          animalState.pos.z + Math.sin(angle) * dist
        );
      } else {
        animalState.state = 'idle';
        animalState.stateTimer = 1 + Math.random() * 4;
        animalState.velocity.set(0, animalState.velocity.y, 0);
      }
    }

    // Movement
    if (animalState.state === 'walking') {
      const dir = new THREE.Vector3().subVectors(animalState.targetPos, animalState.pos);
      dir.y = 0;
      if (dir.lengthSq() > 0.1) {
        dir.normalize().multiplyScalar(1.5); // Speed
        animalState.velocity.x = dir.x;
        animalState.velocity.z = dir.z;
      } else {
        animalState.state = 'idle';
        animalState.stateTimer = 1 + Math.random() * 2;
        animalState.velocity.x = 0;
        animalState.velocity.z = 0;
      }
    }

    // Gravity
    animalState.velocity.y -= 20 * dt;

    // Collision detection
    const nextPos = animalState.pos.clone();
    
    // Y collision
    nextPos.y += animalState.velocity.y * dt;
    const currentYBlock = blocks[`${Math.round(nextPos.x)},${Math.floor(animalState.pos.y)},${Math.round(nextPos.z)}`];
    const nextYBlock = blocks[`${Math.round(nextPos.x)},${Math.floor(nextPos.y)},${Math.round(nextPos.z)}`];
    
    if ((currentYBlock && currentYBlock.type === 'water') || (nextYBlock && nextYBlock.type === 'water')) {
      animalState.velocity.y += 30 * dt; // Float up stronger
      animalState.velocity.y *= 0.9; // Dampen vertical movement in water
      animalState.pos.y = nextPos.y;
      animalState.velocity.x *= 0.9; // Water resistance
      animalState.velocity.z *= 0.9;
    } else if (nextYBlock && nextYBlock.type !== 'flower' && nextYBlock.type !== 'torch') {
      animalState.pos.y = Math.floor(nextPos.y) + 1;
      animalState.velocity.y = 0;
      
      // Jump if stuck while walking
      if (animalState.state === 'walking') {
        const blockForward = blocks[`${Math.round(nextPos.x + animalState.velocity.x * dt * 5)},${Math.floor(animalState.pos.y)},${Math.round(nextPos.z + animalState.velocity.z * dt * 5)}`];
        if (blockForward && blockForward.type !== 'water' && blockForward.type !== 'flower' && blockForward.type !== 'torch') {
          animalState.velocity.y = 6; // Jump force
        }
      }
    } else {
      animalState.pos.y = nextPos.y;
    }

    // X collision
    nextPos.copy(animalState.pos);
    nextPos.x += animalState.velocity.x * dt;
    const blockX = blocks[`${Math.round(nextPos.x)},${Math.floor(nextPos.y)},${Math.round(nextPos.z)}`];
    if (blockX && blockX.type !== 'water' && blockX.type !== 'flower' && blockX.type !== 'torch') {
      animalState.velocity.x = 0;
    } else {
      animalState.pos.x = nextPos.x;
    }

    // Z collision
    nextPos.copy(animalState.pos);
    nextPos.z += animalState.velocity.z * dt;
    const blockZ = blocks[`${Math.round(nextPos.x)},${Math.floor(nextPos.y)},${Math.round(nextPos.z)}`];
    if (blockZ && blockZ.type !== 'water' && blockZ.type !== 'flower' && blockZ.type !== 'torch') {
      animalState.velocity.z = 0;
    } else {
      animalState.pos.z = nextPos.z;
    }

    // Keep in bounds
    if (animalState.pos.y < -10) {
      animalState.pos.y = 20;
      animalState.velocity.y = 0;
    }

    // Update group position
    groupRef.current.position.set(
      animalState.pos.x,
      animalState.pos.y + legSize[1] + bodySize[1]/2,
      animalState.pos.z
    );

    // Animate legs when walking
    if (animalState.state === 'walking') {
      const time = state.clock.getElapsedTime();
      const speed = 10;
      const angle = Math.sin(time * speed) * 0.5;
      
      if (legsRef.current[0]) legsRef.current[0].rotation.x = angle; // Front left
      if (legsRef.current[1]) legsRef.current[1].rotation.x = -angle; // Front right
      if (legsRef.current[2]) legsRef.current[2].rotation.x = -angle; // Back left
      if (legsRef.current[3]) legsRef.current[3].rotation.x = angle; // Back right
      
      // Bobbing head
      if (headRef.current) {
        headRef.current.rotation.x = Math.sin(time * speed * 0.5) * 0.1;
      }
    } else {
      // Idle
      legsRef.current.forEach(leg => {
        if (leg) leg.rotation.x = 0;
      });
      if (headRef.current) {
        headRef.current.rotation.x = 0;
        // Look around occasionally
        const time = state.clock.getElapsedTime();
        headRef.current.rotation.y = Math.sin(time * 0.5) * 0.3;
      }
    }

    // Rotate body to face movement direction
    if (animalState.velocity.x !== 0 || animalState.velocity.z !== 0) {
      const angle = Math.atan2(animalState.velocity.x, animalState.velocity.z);
      groupRef.current.rotation.y = angle;
    }
  });

  const isCow = data.type === 'cow';
  const bodySize: [number, number, number] = isCow ? [0.8, 0.6, 1.2] : [0.6, 0.5, 0.9];
  const headSize: [number, number, number] = isCow ? [0.5, 0.5, 0.5] : [0.4, 0.4, 0.4];
  const legSize: [number, number, number] = isCow ? [0.2, 0.4, 0.2] : [0.15, 0.3, 0.15];
  
  const headY = bodySize[1]/2 - headSize[1]/2 + 0.1;
  const headZ = bodySize[2]/2 + headSize[2]/2 - 0.1;

  const legY = -bodySize[1]/2 - legSize[1]/2 + 0.1;
  const legZ = bodySize[2]/2 - legSize[2]/2 - 0.1;
  const legX = bodySize[0]/2 - legSize[0]/2 - 0.05;

  return (
    <group 
      ref={groupRef}
      position={[data.initialPos[0], data.initialPos[1] + legSize[1] + bodySize[1]/2, data.initialPos[2]]}
      onClick={(e) => {
        e.stopPropagation();
        const storeState = useStore.getState();
        const activeItem = storeState.inventory[storeState.activeItemIndex];
        if (activeItem && activeItem.type === 'laser') {
          import('../utils/sounds').then(m => m.playSound('laser'));
          removeAnimal(data.id);
          storeState.addDrop(isCow ? 'bread' : 'wood', [stateRef.current.pos.x, stateRef.current.pos.y, stateRef.current.pos.z]); 
        } else {
          stateRef.current.velocity.y = 5;
          stateRef.current.velocity.x += (Math.random() - 0.5) * 10;
          stateRef.current.velocity.z += (Math.random() - 0.5) * 10;
          import('../utils/sounds').then(m => m.playSound('break'));
        }
      }}
    >
      {/* Body */}
      <mesh castShadow receiveShadow>
        <boxGeometry args={bodySize} />
        <meshStandardMaterial map={textures[`${data.type}_body` as keyof typeof textures]} />
      </mesh>
      
      {/* Head Group */}
      <group ref={headRef} position={[0, headY, headZ - headSize[2]/2]}>
        <mesh castShadow receiveShadow position={[0, 0, headSize[2]/2]}>
          <boxGeometry args={headSize} />
          <meshStandardMaterial attach="material-0" map={textures[`${data.type}_body` as keyof typeof textures]} />
          <meshStandardMaterial attach="material-1" map={textures[`${data.type}_body` as keyof typeof textures]} />
          <meshStandardMaterial attach="material-2" map={textures[`${data.type}_body` as keyof typeof textures]} />
          <meshStandardMaterial attach="material-3" map={textures[`${data.type}_body` as keyof typeof textures]} />
          <meshStandardMaterial attach="material-4" map={textures[data.type]} />
          <meshStandardMaterial attach="material-5" map={textures[`${data.type}_body` as keyof typeof textures]} />
        </mesh>
        {/* Snout */}
        <mesh castShadow receiveShadow position={[0, -0.1, headSize[2] + 0.05]}>
          <boxGeometry args={isCow ? [0.3, 0.2, 0.1] : [0.2, 0.15, 0.1]} />
          <meshStandardMaterial attach="material-0" color={isCow ? '#e8b4b8' : '#d68a9f'} />
          <meshStandardMaterial attach="material-1" color={isCow ? '#e8b4b8' : '#d68a9f'} />
          <meshStandardMaterial attach="material-2" color={isCow ? '#e8b4b8' : '#d68a9f'} />
          <meshStandardMaterial attach="material-3" color={isCow ? '#e8b4b8' : '#d68a9f'} />
          <meshStandardMaterial attach="material-4" map={textures[`${data.type}_snout` as keyof typeof textures]} />
          <meshStandardMaterial attach="material-5" color={isCow ? '#e8b4b8' : '#d68a9f'} />
        </mesh>
      </group>

      {/* Legs */}
      {[
        [legX, legY, legZ], // Front Left
        [-legX, legY, legZ], // Front Right
        [legX, legY, -legZ], // Back Left
        [-legX, legY, -legZ] // Back Right
      ].map((pos, i) => (
        <group key={i} position={[pos[0], legY + legSize[1]/2, pos[2]]} ref={el => { if (el) legsRef.current[i] = el; }}>
          <mesh castShadow receiveShadow position={[0, -legSize[1]/2, 0]}>
            <boxGeometry args={legSize} />
            <meshStandardMaterial map={textures[`${data.type}_body` as keyof typeof textures]} />
          </mesh>
        </group>
      ))}
    </group>
  );
};

export const Animals = () => {
  const [animals, setAnimals] = useState<AnimalData[]>([]);
  const initialized = useRef(false);

  // Initialize animals
  useMemo(() => {
    if (initialized.current) return;
    initialized.current = true;
    
    const newAnimals: AnimalData[] = [];
    for (let i = 0; i < 5; i++) {
      newAnimals.push({
        id: `pig_${i}`,
        type: 'pig',
        initialPos: [Math.random() * 40 - 20, 10, Math.random() * 40 - 20]
      });
    }
    for (let i = 0; i < 3; i++) {
      newAnimals.push({
        id: `cow_${i}`,
        type: 'cow',
        initialPos: [Math.random() * 40 - 20, 10, Math.random() * 40 - 20]
      });
    }
    setAnimals(newAnimals);
  }, []);

  const removeAnimal = (id: string) => {
    setAnimals(prev => prev.filter(a => a.id !== id));
  };

  return (
    <>
      {animals.map(animal => (
        <AnimalComponent key={animal.id} data={animal} removeAnimal={removeAnimal} />
      ))}
    </>
  );
};
