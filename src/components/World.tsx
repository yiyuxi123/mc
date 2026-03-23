import { useStore } from '../store/useStore';
import { textures } from '../utils/textures';
import { useLayoutEffect, useRef, memo } from 'react';
import * as THREE from 'three';
import { ThreeEvent, useFrame } from '@react-three/fiber';
import { Animals } from './Animals';

const crossGeometry = new THREE.BufferGeometry();
const vertices = new Float32Array([
  // Plane 1 (diagonal)
  -0.4, -0.5, -0.4,
   0.4, -0.5,  0.4,
  -0.4,  0.5, -0.4,

   0.4, -0.5,  0.4,
   0.4,  0.5,  0.4,
  -0.4,  0.5, -0.4,

  // Plane 2 (other diagonal)
  -0.4, -0.5,  0.4,
   0.4, -0.5, -0.4,
  -0.4,  0.5,  0.4,

   0.4, -0.5, -0.4,
   0.4,  0.5, -0.4,
  -0.4,  0.5,  0.4,
]);
const uvs = new Float32Array([
  // Plane 1
  0, 0,
  1, 0,
  0, 1,

  1, 0,
  1, 1,
  0, 1,

  // Plane 2
  0, 0,
  1, 0,
  0, 1,

  1, 0,
  1, 1,
  0, 1,
]);
crossGeometry.setAttribute('position', new THREE.BufferAttribute(vertices, 3));
crossGeometry.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
crossGeometry.computeVertexNormals();

export const BreakingEffect = () => {
  const meshRef = useRef<THREE.Mesh>(null);
  const materialRef = useRef<THREE.MeshBasicMaterial>(null);
  
  useFrame((state, delta) => {
    const breaking = (window as any).currentBreakingBlock;
    if (breaking && meshRef.current) {
      meshRef.current.visible = true;
      
      let yOffset = 0;
      let sx = 1, sy = 1, sz = 1;
      if (breaking.type === 'torch') {
        yOffset = -0.1;
        sx = 0.2; sy = 0.8; sz = 0.2;
      } else if (breaking.type === 'flower') {
        yOffset = -0.2;
        sx = 0.6; sy = 0.6; sz = 0.6;
      }
      
      meshRef.current.position.set(breaking.pos[0], breaking.pos[1] + yOffset, breaking.pos[2]);
      
      const storeState = useStore.getState();
      const activeItem = storeState.inventory[storeState.activeItemIndex];
      const toolType = activeItem?.type || 'hand';
      
      let breakTime = 0.4; // Default
      let canBreak = true;
      
      // Permissions and Speed
      if (breaking.type === 'stone') {
        if (toolType === 'iron_pickaxe') {
          breakTime = 0.2;
        } else {
          breakTime = 2.0; // Very slow by hand
          canBreak = false; // Cannot harvest
        }
      } else if (breaking.type === 'wood') {
        if (toolType === 'wooden_axe') {
          breakTime = 0.2;
        } else {
          breakTime = 0.6;
        }
      } else if (breaking.type === 'dirt' || breaking.type === 'grass') {
        breakTime = 0.3;
      } else if (breaking.type === 'leaves' || breaking.type === 'flower' || breaking.type === 'torch') {
        breakTime = 0.1;
      }
      
      breaking.progress += delta;
      
      // Pulse effect
      const pulse = 1 + Math.sin(breaking.progress * 30) * 0.05;
      meshRef.current.scale.set(sx * pulse, sy * pulse, sz * pulse);
      
      if (materialRef.current) {
        materialRef.current.opacity = 0.3 + (breaking.progress / breakTime) * 0.5;
        // Turn increasingly red
        materialRef.current.color.setRGB(1, 1 - (breaking.progress / breakTime), 1 - (breaking.progress / breakTime));
      }
      
      if (breaking.progress >= breakTime) {
        if (canBreak) {
          storeState.removeBlock(breaking.pos[0], breaking.pos[1], breaking.pos[2]);
        } else {
          // Just remove visually, don't drop item
          storeState.removeBlock(breaking.pos[0], breaking.pos[1], breaking.pos[2], false);
        }
        import('../utils/sounds').then(m => m.playSound('break'));
        (window as any).currentBreakingBlock = null;
        meshRef.current.visible = false;
      }
    } else if (meshRef.current) {
      meshRef.current.visible = false;
    }
  });
  
  return (
    <mesh ref={meshRef} visible={false} raycast={() => null}>
      <boxGeometry args={[1.02, 1.02, 1.02]} />
      <meshBasicMaterial ref={materialRef} color="white" transparent opacity={0.5} depthWrite={false} />
    </mesh>
  );
};

export const TargetHighlight = () => {
  const meshRef = useRef<THREE.LineSegments>(null);
  
  useFrame(() => {
    const hovered = (window as any).currentHoveredBlock;
    if (hovered && meshRef.current) {
      meshRef.current.visible = true;
      let yOffset = 0;
      let sx = 1.01, sy = 1.01, sz = 1.01;
      if (hovered.type === 'torch') {
        yOffset = -0.1;
        sx = 0.21; sy = 0.81; sz = 0.21;
      } else if (hovered.type === 'flower') {
        yOffset = -0.2;
        sx = 0.61; sy = 0.61; sz = 0.61;
      }
      meshRef.current.position.set(hovered.pos[0], hovered.pos[1] + yOffset, hovered.pos[2]);
      meshRef.current.scale.set(sx, sy, sz);
    } else if (meshRef.current) {
      meshRef.current.visible = false;
    }
  });

  return (
    <lineSegments ref={meshRef} visible={false} raycast={() => null}>
      <edgesGeometry args={[new THREE.BoxGeometry(1, 1, 1)]} />
      <lineBasicMaterial color="black" linewidth={2} />
    </lineSegments>
  );
};

const MAX_INSTANCES = 40000;

const BlockTypeMesh = memo(({ type, blocks }: { type: string; blocks: any[] }) => {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const displayBlocks = blocks.slice(0, MAX_INSTANCES);

  // Update instanced mesh matrices
  useLayoutEffect(() => {
    if (!meshRef.current) return;
    const dummy = new THREE.Object3D();
    displayBlocks.forEach((block, i) => {
      let yOffset = 0;
      if (type === 'torch') yOffset = -0.1;
      else if (type === 'flower') yOffset = -0.2;
      
      dummy.position.set(block.pos[0], block.pos[1] + yOffset, block.pos[2]);
      dummy.updateMatrix();
      meshRef.current!.setMatrixAt(i, dummy.matrix);
    });
    meshRef.current.instanceMatrix.needsUpdate = true;
  }, [displayBlocks, type]);

  const handlePointerDown = (e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation();
    const state = useStore.getState();
    if (state.isChatOpen || state.isImageAnalyzerOpen || state.isCraftingOpen || state.isInventoryOpen) return;
    if (e.instanceId === undefined) return;
    
    const block = displayBlocks[e.instanceId];
    if (!block) return;

    if (block.type === 'npc') {
      state.setNpcDialogue("你好，旅行者！我听说这片土地上隐藏着一个古老遗迹。去寻找它吧，里面藏有巨大的宝藏。但要小心，你必须先活下来。收集资源，建立农场，并制作坚固的工具！");
      return;
    }

    if (e.button === 2) {
      // Right click: Place block or use item
      
      if (block.type === 'crafting_table') {
        state.setCraftingOpen(true);
        document.exitPointerLock();
        return;
      }

      const activeItem = state.inventory[state.activeItemIndex];
      if (!activeItem || activeItem.count <= 0) return;
      
      if (activeItem.type === 'bread') {
        useStore.getState().eatFood();
        import('../utils/sounds').then(m => m.playSound('break')); // Maybe a munch sound?
        return;
      }
      
      if (block.type === 'tnt' && activeItem.type === 'torch') {
        import('../utils/sounds').then(m => m.playSound('break'));
        useStore.getState().addChatMessage('TNT已点燃！', 'ai');
        useStore.getState().removeBlock(block.pos[0], block.pos[1], block.pos[2], false);
        useStore.getState().addPrimedTnt(block.pos);
        return;
      }

      if (block.type === 'nuke' && activeItem.type === 'torch') {
        import('../utils/sounds').then(m => m.playSound('break'));
        useStore.getState().addChatMessage('警告：核弹已启动！', 'ai');
        useStore.getState().removeBlock(block.pos[0], block.pos[1], block.pos[2], false);
        // Explode immediately with huge radius
        setTimeout(() => {
          useStore.getState().explode(block.pos[0], block.pos[1], block.pos[2], 12);
        }, 1000);
        return;
      }
      
      const placeableBlocks = ['dirt', 'grass', 'stone', 'wood', 'leaves', 'glass', 'wheat_seeds', 'wheat', 'chest', 'torch', 'flower', 'tnt', 'slime', 'nuke', 'iron_ore', 'water', 'bedrock', 'sand', 'snow', 'crafting_table'];
      if (!placeableBlocks.includes(activeItem.type)) return;
      
      const faceIndex = Math.floor((e.faceIndex || 0) / 2);
      const normal = new THREE.Vector3();
      if (faceIndex === 0) normal.set(1, 0, 0);
      else if (faceIndex === 1) normal.set(-1, 0, 0);
      else if (faceIndex === 2) normal.set(0, 1, 0);
      else if (faceIndex === 3) normal.set(0, -1, 0);
      else if (faceIndex === 4) normal.set(0, 0, 1);
      else if (faceIndex === 5) normal.set(0, 0, -1);

      const pos = new THREE.Vector3(...block.pos).add(normal);
      
      // Check collision with player
      const px = (window as any).playerPos?.x || 0;
      const py = (window as any).playerPos?.y || 0;
      const pz = (window as any).playerPos?.z || 0;
      
      if (
        Math.abs(pos.x - px) < 0.8 &&
        Math.abs(pos.z - pz) < 0.8 &&
        py - 1.5 < pos.y + 0.5 &&
        py + 0.3 > pos.y - 0.5
      ) {
        return; // Cannot place block inside player
      }

      const success = state.addBlock(pos.x, pos.y, pos.z, activeItem.type as any);
      if (success) {
        state.removeFromInventory(activeItem.type, 1);
        import('../utils/sounds').then(m => m.playSound('place'));
      }
    } else if (e.button === 0) {
      // Left click: Start breaking block
      const activeItem = state.inventory[state.activeItemIndex];
      if (activeItem && activeItem.type === 'laser') {
        import('../utils/sounds').then(m => m.playSound('laser'));
        state.removeBlock(block.pos[0], block.pos[1], block.pos[2]);
        return;
      }

      if (block.type === 'tnt') {
        // Ignite TNT
        import('../utils/sounds').then(m => m.playSound('break')); // Hiss sound?
        state.addChatMessage('TNT 已点燃！快跑！', 'ai');
        
        state.removeBlock(block.pos[0], block.pos[1], block.pos[2]);
        state.addPrimedTnt(block.pos);
        return;
      }
      (window as any).currentBreakingBlock = { pos: block.pos, progress: 0, type: block.type };
    }
  };

  const handlePointerUp = (e: ThreeEvent<PointerEvent>) => {
    if (e.button === 0) {
      (window as any).currentBreakingBlock = null;
    }
  };

  const handlePointerOut = (e: ThreeEvent<PointerEvent>) => {
    (window as any).currentBreakingBlock = null;
    (window as any).currentHoveredBlock = null;
  };

  const handlePointerMove = (e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation();
    const state = useStore.getState();
    if (state.isChatOpen || state.isImageAnalyzerOpen || state.isCraftingOpen || state.isInventoryOpen) return;
    if (e.instanceId === undefined) return;
    const block = displayBlocks[e.instanceId];
    if (block) {
      (window as any).currentHoveredBlock = block;
    }
  };

  useFrame(({ clock }) => {
    if (type === 'water' && textures.water) {
      textures.water.offset.x = clock.getElapsedTime() * 0.1;
      textures.water.offset.y = clock.getElapsedTime() * 0.1;
    }
  });

  const texture = textures[type as keyof typeof textures];

  return (
    <>
      <instancedMesh 
        ref={meshRef} 
        args={[null as any, null as any, MAX_INSTANCES]} 
        count={displayBlocks.length}
        castShadow={type !== 'torch' && type !== 'flower' && type !== 'water' && type !== 'glass'} 
        receiveShadow 
        frustumCulled={false}
        onPointerDown={type === 'water' ? undefined : handlePointerDown}
        onPointerUp={type === 'water' ? undefined : handlePointerUp}
        onPointerOut={type === 'water' ? undefined : handlePointerOut}
        onPointerMove={type === 'water' ? undefined : handlePointerMove}
        raycast={type === 'water' ? () => null : undefined}
      >
        {type === 'flower' || type === 'torch' ? (
          <primitive object={crossGeometry} attach="geometry" />
        ) : type === 'cactus' ? (
          <boxGeometry args={[0.8, 1, 0.8]} />
        ) : (
          <boxGeometry args={[1, 1, 1]} />
        )}
        {type === 'grass' ? (
          <>
            <meshStandardMaterial attach="material-0" map={textures.grass} />
            <meshStandardMaterial attach="material-1" map={textures.grass} />
            <meshStandardMaterial attach="material-2" map={textures.grass_top} />
            <meshStandardMaterial attach="material-3" map={textures.dirt} />
            <meshStandardMaterial attach="material-4" map={textures.grass} />
            <meshStandardMaterial attach="material-5" map={textures.grass} />
          </>
        ) : type === 'water' || type === 'glass' ? (
          <meshPhysicalMaterial 
            map={texture} 
            transmission={type === 'glass' ? 0.9 : 0.8}
            opacity={1}
            transparent={true}
            roughness={type === 'glass' ? 0.1 : 0.2}
            ior={type === 'glass' ? 1.5 : 1.33}
            thickness={1}
            side={THREE.FrontSide} 
          />
        ) : type === 'torch' ? (
          <meshStandardMaterial 
            map={texture} 
            transparent={true} 
            alphaTest={0.5}
            emissive="#ffaa00"
            emissiveIntensity={1}
            side={THREE.DoubleSide}
          />
        ) : (
          <meshStandardMaterial 
            map={texture} 
            transparent={false} 
            side={type === 'flower' ? THREE.DoubleSide : THREE.FrontSide} 
            alphaTest={type === 'leaves' || type === 'flower' ? 0.5 : 0.1} 
          />
        )}
      </instancedMesh>
      {type === 'torch' && blocks.map(block => (
        <pointLight 
          key={block.id} 
          position={[block.pos[0], block.pos[1], block.pos[2]]} 
          distance={15} 
          intensity={2} 
          color="#ffaa00" 
        />
      ))}
    </>
  );
});

const PrimedTnt = ({ tnt }: { tnt: { id: string, pos: [number, number, number], progress: number } }) => {
  const meshRef = useRef<THREE.Mesh>(null);
  const materialRef = useRef<THREE.MeshStandardMaterial>(null);
  const texture = textures.tnt;

  useFrame((state, delta) => {
    if (meshRef.current && materialRef.current) {
      tnt.progress += delta;
      
      // Flash effect
      const flash = Math.sin(tnt.progress * 20) > 0;
      if (flash) {
        materialRef.current.color.setHex(0xffffff);
        materialRef.current.emissive.setHex(0xffffff);
      } else {
        materialRef.current.color.setHex(0xffffff);
        materialRef.current.emissive.setHex(0x000000);
      }
      
      // Swell slightly before exploding
      const scale = 1 + Math.max(0, tnt.progress - 1.5) * 0.2;
      meshRef.current.scale.set(scale, scale, scale);

      if (tnt.progress >= 2.0 && !meshRef.current.userData.exploded) {
        meshRef.current.userData.exploded = true;
        useStore.getState().explode(tnt.pos[0], tnt.pos[1], tnt.pos[2], 4);
        useStore.getState().removePrimedTnt(tnt.id);
      }
    }
  });

  return (
    <mesh ref={meshRef} position={[tnt.pos[0], tnt.pos[1], tnt.pos[2]]}>
      <boxGeometry args={[1, 1, 1]} />
      <meshStandardMaterial ref={materialRef} map={texture} />
    </mesh>
  );
};

export const World = () => {
  const blocksByType = useStore((state) => state.blocksByType);
  const primedTnts = useStore((state) => state.primedTnts);

  return (
    <>
      <TargetHighlight />
      {Object.entries(blocksByType).map(([type, typeBlocks]) => (
        <BlockTypeMesh key={type} type={type} blocks={typeBlocks} />
      ))}
      {primedTnts.map(tnt => (
        <PrimedTnt key={tnt.id} tnt={tnt} />
      ))}
      <Animals />
    </>
  );
};
