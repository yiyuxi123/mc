import { useFrame, useThree } from '@react-three/fiber';
import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { useStore } from '../store/useStore';

const SPEED = 5;
const JUMP_FORCE = 8;
const GRAVITY = 20;

export const Player = () => {
  const { camera } = useThree();
  
  const pos = useRef(new THREE.Vector3(0, 20, 0));
  const velocity = useRef(new THREE.Vector3(0, 0, 0));
  const onGround = useRef(false);
  const bobPhase = useRef(0);

    const keys = useRef({
    w: false,
    a: false,
    s: false,
    d: false,
    space: false,
    shift: false,
  });

  const isChatOpen = useStore((state) => state.isChatOpen);
  const isImageAnalyzerOpen = useStore((state) => state.isImageAnalyzerOpen);
  const isCraftingOpen = useStore((state) => state.isCraftingOpen);
  const isInventoryOpen = useStore((state) => state.isInventoryOpen);
  const explosionEvent = useStore((state) => state.explosionEvent);
  const lastExplosionTime = useRef(0);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'KeyE') {
        const newState = !useStore.getState().isInventoryOpen;
        useStore.getState().setInventoryOpen(newState);
        if (newState) {
          document.exitPointerLock();
        } else {
          document.body.requestPointerLock();
        }
        return;
      }
      if (isChatOpen || isImageAnalyzerOpen || isCraftingOpen || useStore.getState().isInventoryOpen) return;
      if (e.code === 'KeyW') keys.current.w = true;
      if (e.code === 'KeyA') keys.current.a = true;
      if (e.code === 'KeyS') keys.current.s = true;
      if (e.code === 'KeyD') keys.current.d = true;
      if (e.code === 'Space') keys.current.space = true;
      if (e.code === 'ShiftLeft') keys.current.shift = true;
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'KeyW') keys.current.w = false;
      if (e.code === 'KeyA') keys.current.a = false;
      if (e.code === 'KeyS') keys.current.s = false;
      if (e.code === 'KeyD') keys.current.d = false;
      if (e.code === 'Space') keys.current.space = false;
      if (e.code === 'ShiftLeft') keys.current.shift = false;
    };

    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('keyup', handleKeyUp);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('keyup', handleKeyUp);
    };
  }, [isChatOpen, isImageAnalyzerOpen, isCraftingOpen]);

  const checkCollision = (p: THREE.Vector3, blocks: Record<string, any>) => {
    const minX = Math.round(p.x - 0.5);
    const maxX = Math.round(p.x + 0.5);
    const minY = Math.round(p.y - 1.0);
    const maxY = Math.round(p.y + 1.0);
    const minZ = Math.round(p.z - 0.5);
    const maxZ = Math.round(p.z + 0.5);

    for (let x = minX; x <= maxX; x++) {
      for (let y = minY; y <= maxY; y++) {
        for (let z = minZ; z <= maxZ; z++) {
          const block = blocks[`${x},${y},${z}`];
          if (block && block.type !== 'water' && block.type !== 'flower' && block.type !== 'torch') {
            const bx = x;
            const by = y;
            const bz = z;
            // Player AABB: width 0.6, height 1.6
            // Block AABB: width 1, height 1
            if (
              Math.abs(p.x - bx) < 0.8 &&
              Math.abs(p.y - by) < 1.3 &&
              Math.abs(p.z - bz) < 0.8
            ) {
              return true;
            }
          }
        }
      }
    }
    return false;
  };

  useFrame((state, delta) => {
    (window as any).camera = camera;
    // Cap delta to prevent huge jumps if tab is inactive
    const dt = Math.min(delta, 0.1);
    const storeState = useStore.getState();
    const blocks = storeState.blocks;
    
    // Movement Intent
    const forward = new THREE.Vector3();
    camera.getWorldDirection(forward);
    forward.y = 0;
    forward.normalize();
    
    const right = new THREE.Vector3().crossVectors(forward, new THREE.Vector3(0, 1, 0)).normalize();
    
    const moveDir = new THREE.Vector3();
    if (keys.current.w) moveDir.add(forward);
    if (keys.current.s) moveDir.sub(forward);
    if (keys.current.d) moveDir.add(right);
    if (keys.current.a) moveDir.sub(right);
    
    const currentSpeed = keys.current.shift ? SPEED * 1.5 : SPEED;

    const px = Math.round(pos.current.x);
    const py = Math.floor(pos.current.y); // Feet level
    const pz = Math.round(pos.current.z);
    const inWater = blocks[`${px},${py},${pz}`]?.type === 'water' || blocks[`${px},${py+1},${pz}`]?.type === 'water';

    if (moveDir.lengthSq() > 0) {
      moveDir.normalize().multiplyScalar(inWater ? currentSpeed * 0.5 : currentSpeed);
    }

    // Apply Gravity
    if (inWater) {
      velocity.current.y -= GRAVITY * 0.2 * dt; // Slow sinking
      if (velocity.current.y < -2) velocity.current.y = -2; // Terminal velocity in water
    } else {
      velocity.current.y -= GRAVITY * dt;
    }

    const activeItem = storeState.inventory[storeState.activeItemIndex];
    const isJetpackActive = activeItem && activeItem.type === 'jetpack' && keys.current.space;

    if (isJetpackActive) {
      velocity.current.y += (GRAVITY + 15) * dt; // Counteract gravity and push up
      if (velocity.current.y > 10) velocity.current.y = 10; // Cap upward speed
      onGround.current = false;
      if (Math.random() < 0.2) {
        import('../utils/sounds').then(m => m.playSound('jetpack'));
      }
    }

    // Jump / Swim
    if (keys.current.space && !isJetpackActive) {
      if (inWater) {
        velocity.current.y += 15 * dt; // Swim up
        if (velocity.current.y > 4) velocity.current.y = 4;
      } else if (onGround.current) {
        velocity.current.y = JUMP_FORCE;
        onGround.current = false;
        import('../utils/sounds').then(m => m.playSound('jump'));
      }
    }

    // Handle Explosion Knockback
    if (explosionEvent && explosionEvent.time !== lastExplosionTime.current) {
      lastExplosionTime.current = explosionEvent.time;
      const dx = pos.current.x - explosionEvent.x;
      const dy = pos.current.y - explosionEvent.y;
      const dz = pos.current.z - explosionEvent.z;
      const dist = Math.sqrt(dx*dx + dy*dy + dz*dz);
      
      if (dist < explosionEvent.radius * 2) {
        const force = (explosionEvent.radius * 2 - dist) * 5;
        velocity.current.x += (dx / dist) * force;
        velocity.current.y += (dy / dist) * force + 10; // Extra upward boost
        velocity.current.z += (dz / dist) * force;
        onGround.current = false;
      }
    }

    // Move X
    const nextX = pos.current.clone();
    nextX.x += (moveDir.x + velocity.current.x) * dt;
    if (!checkCollision(nextX, blocks)) {
      pos.current.x = nextX.x;
    } else {
      velocity.current.x = 0;
    }

    // Move Z
    const nextZ = pos.current.clone();
    nextZ.z += (moveDir.z + velocity.current.z) * dt;
    if (!checkCollision(nextZ, blocks)) {
      pos.current.z = nextZ.z;
    } else {
      velocity.current.z = 0;
    }

    // Friction for horizontal velocity
    velocity.current.x *= 0.9;
    velocity.current.z *= 0.9;

    // Move Y
    const nextY = pos.current.clone();
    nextY.y += velocity.current.y * dt;
    if (!checkCollision(nextY, blocks)) {
      pos.current.y = nextY.y;
      onGround.current = false;
    } else {
      if (velocity.current.y < 0) {
        onGround.current = true;
        
        // Check if landing on slime block
        const blockX = Math.round(pos.current.x);
        const blockY = Math.round(pos.current.y - 1.3);
        const blockZ = Math.round(pos.current.z);
        const blockBelow = blocks[`${blockX},${blockY},${blockZ}`];
        
        if (blockBelow && blockBelow.type === 'slime') {
          // Bounce!
          velocity.current.y = Math.max(15, Math.abs(velocity.current.y) * 1.2);
          onGround.current = false;
          import('../utils/sounds').then(m => m.playSound('jump')); // Or a specific bounce sound
        } else {
          velocity.current.y = 0;
        }
      } else {
        velocity.current.y = 0;
      }
    }

    // Head bobbing and footsteps
    let bobbingOffset = 0;
    if (onGround.current && moveDir.lengthSq() > 0) {
      const bobbingSpeed = keys.current.shift ? 15 : 10;
      const oldPhase = bobPhase.current;
      bobPhase.current += dt * bobbingSpeed;
      
      bobbingOffset = Math.sin(bobPhase.current) * 0.05;
      
      // Play footstep sound when crossing PI or 2*PI
      if (Math.sin(oldPhase) > 0 && Math.sin(bobPhase.current) <= 0) {
        import('../utils/sounds').then(m => m.playSound('footstep'));
      } else if (Math.sin(oldPhase) < 0 && Math.sin(bobPhase.current) >= 0) {
        import('../utils/sounds').then(m => m.playSound('footstep'));
      }
    } else {
      bobPhase.current = 0;
    }

    // Update Camera
    camera.position.copy(new THREE.Vector3(pos.current.x, pos.current.y + 0.6 + bobbingOffset, pos.current.z));
    (window as any).playerPos = pos.current;

    // Collect Drops
    storeState.drops.forEach(drop => {
      const dx = pos.current.x - drop.pos[0];
      const dy = pos.current.y - drop.pos[1];
      const dz = pos.current.z - drop.pos[2];
      const distSq = dx*dx + dy*dy + dz*dz;
      if (distSq < 2.0) { // collect radius
        storeState.removeDrop(drop.id);
        storeState.addToInventory(drop.type, 1);
        import('../utils/sounds').then(m => m.playSound('collect'));
      }
    });

    // Track biomes for quest
    const y = pos.current.y;
    let currentBiome = 'plains';
    if (y > 5) currentBiome = 'mountains';
    else if (y < -3) currentBiome = 'valley';
    
    useStore.getState().updateQuest('find_biomes', currentBiome);

    // Teleport back if falling off the world
    if (y < -20) {
      pos.current.set(0, 20, 0);
      velocity.current.set(0, 0, 0);
    }
    
    // Update chunks
    storeState.updateChunks(pos.current.x, pos.current.z);
  });

  return null;
};
