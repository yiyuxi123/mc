import { useStore } from '../store/useStore';
import { textures } from '../utils/textures';
import { useLayoutEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { ThreeEvent, useFrame } from '@react-three/fiber';
import { Animals } from './Animals';

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
    <mesh ref={meshRef} visible={false}>
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
    <lineSegments ref={meshRef} visible={false}>
      <edgesGeometry args={[new THREE.BoxGeometry(1, 1, 1)]} />
      <lineBasicMaterial color="black" linewidth={2} />
    </lineSegments>
  );
};

const BlockTypeMesh = ({ type, blocks }: { type: string; blocks: any[] }) => {
  const meshRef = useRef<THREE.InstancedMesh>(null);

  const addBlock = useStore((state) => state.addBlock);
  const inventory = useStore((state) => state.inventory);
  const activeItemIndex = useStore((state) => state.activeItemIndex);

  const isChatOpen = useStore((state) => state.isChatOpen);
  const isImageAnalyzerOpen = useStore((state) => state.isImageAnalyzerOpen);
  const isCraftingOpen = useStore((state) => state.isCraftingOpen);
  const isInventoryOpen = useStore((state) => state.isInventoryOpen);

  // Update instanced mesh matrices
  useLayoutEffect(() => {
    if (!meshRef.current) return;
    const dummy = new THREE.Object3D();
    blocks.forEach((block, i) => {
      let yOffset = 0;
      if (type === 'torch') yOffset = -0.1;
      else if (type === 'flower') yOffset = -0.2;
      
      dummy.position.set(block.pos[0], block.pos[1] + yOffset, block.pos[2]);
      dummy.updateMatrix();
      meshRef.current!.setMatrixAt(i, dummy.matrix);
    });
    meshRef.current.instanceMatrix.needsUpdate = true;
    meshRef.current.computeBoundingSphere();
  }, [blocks, type]);

  const handlePointerDown = (e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation();
    if (isChatOpen || isImageAnalyzerOpen || isCraftingOpen || isInventoryOpen) return;
    if (e.instanceId === undefined) return;
    
    const block = blocks[e.instanceId];
    if (!block) return;

    if (block.type === 'npc') {
      useStore.getState().setNpcDialogue("你好，旅行者！我听说这片土地上隐藏着一个古老遗迹。去寻找它吧，里面藏有巨大的宝藏。但要小心，你必须先活下来。收集资源，建立农场，并制作坚固的工具！");
      return;
    }

    if (e.button === 2) {
      // Right click: Place block
      const activeItem = inventory[activeItemIndex];
      if (!activeItem || activeItem.count <= 0) return;
      
      const placeableBlocks = ['dirt', 'grass', 'stone', 'wood', 'leaves', 'glass', 'wheat_seeds', 'wheat', 'chest', 'torch', 'flower', 'tnt', 'slime', 'nuke', 'iron_ore', 'water', 'bedrock'];
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
        Math.abs(pos.y - py) < 1.3 &&
        Math.abs(pos.z - pz) < 0.8
      ) {
        return; // Cannot place block inside player
      }

      const success = addBlock(pos.x, pos.y, pos.z, activeItem.type as any);
      if (success) {
        useStore.getState().removeFromInventory(activeItem.type, 1);
        import('../utils/sounds').then(m => m.playSound('place'));
      }
    } else if (e.button === 0) {
      // Left click: Start breaking block
      const activeItem = inventory[activeItemIndex];
      if (activeItem && activeItem.type === 'laser') {
        import('../utils/sounds').then(m => m.playSound('laser'));
        useStore.getState().removeBlock(block.pos[0], block.pos[1], block.pos[2]);
        return;
      }

      if (block.type === 'tnt') {
        // Ignite TNT
        import('../utils/sounds').then(m => m.playSound('break')); // Hiss sound?
        useStore.getState().addChatMessage('TNT 已点燃！快跑！', 'ai');
        
        useStore.getState().removeBlock(block.pos[0], block.pos[1], block.pos[2]);
        useStore.getState().addPrimedTnt(block.pos);
        return;
      }
      if (block.type === 'nuke') {
        import('../utils/sounds').then(m => m.playSound('break'));
        useStore.getState().addChatMessage('警告：核弹已启动！', 'ai');
        useStore.getState().removeBlock(block.pos[0], block.pos[1], block.pos[2]);
        // Explode immediately with huge radius
        setTimeout(() => {
          useStore.getState().explode(block.pos[0], block.pos[1], block.pos[2], 12);
        }, 1000);
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
    if (isChatOpen || isImageAnalyzerOpen || isCraftingOpen || isInventoryOpen) return;
    if (e.instanceId === undefined) return;
    const block = blocks[e.instanceId];
    if (block) {
      (window as any).currentHoveredBlock = block;
    }
  };

  const texture = textures[type as keyof typeof textures];

  return (
    <>
      <instancedMesh 
        ref={meshRef} 
        args={[undefined, undefined, blocks.length]} 
        castShadow={type !== 'torch' && type !== 'flower'} 
        receiveShadow 
        onPointerDown={handlePointerDown}
        onPointerUp={handlePointerUp}
        onPointerOut={handlePointerOut}
        onPointerMove={handlePointerMove}
      >
        {type === 'torch' ? (
          <boxGeometry args={[0.2, 0.8, 0.2]} />
        ) : type === 'flower' ? (
          <boxGeometry args={[0.6, 0.6, 0.6]} />
        ) : (
          <boxGeometry args={[1, 1, 1]} />
        )}
        <meshStandardMaterial map={texture} transparent={type === 'glass' || type === 'leaves' || type === 'torch' || type === 'flower' || type === 'water'} opacity={type === 'glass' ? 0.5 : type === 'water' ? 0.6 : 1} />
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
};

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
  const visibleBlocks = useStore((state) => state.visibleBlocks);
  const primedTnts = useStore((state) => state.primedTnts);

  const blocksByType = useMemo(() => {
    const grouped: Record<string, any[]> = {};
    Object.values(visibleBlocks).forEach((block) => {
      if (!grouped[block.type]) grouped[block.type] = [];
      grouped[block.type].push(block);
    });
    return grouped;
  }, [visibleBlocks]);

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
