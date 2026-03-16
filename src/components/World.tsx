import { useBox } from '@react-three/cannon';
import { useStore } from '../store/useStore';
import { textures } from '../utils/textures';
import { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { ThreeEvent } from '@react-three/fiber';

const BlockTypeMesh = ({ type, blocks }: { type: string; blocks: any[] }) => {
  const [ref] = useBox((index) => ({
    mass: 0,
    type: 'Static',
    args: [1, 1, 1],
    position: blocks[index].pos,
  }), useRef<THREE.InstancedMesh>(null), [blocks]);

  const removeBlock = useStore((state) => state.removeBlock);
  const addBlock = useStore((state) => state.addBlock);
  const inventory = useStore((state) => state.inventory);
  const activeItemIndex = useStore((state) => state.activeItemIndex);

  const isChatOpen = useStore((state) => state.isChatOpen);
  const isImageAnalyzerOpen = useStore((state) => state.isImageAnalyzerOpen);
  const isCraftingOpen = useStore((state) => state.isCraftingOpen);

  const handleClick = (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation();
    if (isChatOpen || isImageAnalyzerOpen || isCraftingOpen) return;
    if (e.instanceId === undefined) return;
    
    const block = blocks[e.instanceId];
    if (!block) return;

    if (block.type === 'npc') {
      useStore.getState().setNpcDialogue("Greetings, traveler! I've heard tales of an Ancient Ruin hidden in these lands. Seek it out, for it holds great treasures. But beware, you'll need to survive first. Gather resources, build a farm, and craft strong tools!");
      return;
    }

    if (e.button === 2) {
      // Right click: Place block
      const activeItem = inventory[activeItemIndex];
      if (!activeItem || activeItem.count <= 0) return;
      
      const placeableBlocks = ['dirt', 'grass', 'stone', 'wood', 'leaves', 'glass', 'wheat_seeds', 'wheat', 'chest'];
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
      const success = addBlock(pos.x, pos.y, pos.z, activeItem.type as any);
      if (success) {
        useStore.getState().removeFromInventory(activeItem.type, 1);
      }
    } else if (e.button === 0) {
      // Left click: Break block
      removeBlock(block.pos[0], block.pos[1], block.pos[2]);
    }
  };

  const texture = textures[type as keyof typeof textures];

  return (
    <instancedMesh ref={ref as any} args={[undefined, undefined, blocks.length]} castShadow receiveShadow onPointerDown={handleClick}>
      <boxGeometry args={[1, 1, 1]} />
      <meshStandardMaterial map={texture} transparent={type === 'glass' || type === 'leaves'} opacity={type === 'glass' ? 0.5 : 1} />
    </instancedMesh>
  );
};

export const World = () => {
  const blocks = useStore((state) => state.blocks);

  const blocksByType = useMemo(() => {
    const grouped: Record<string, any[]> = {};
    Object.values(blocks).forEach((block) => {
      if (!grouped[block.type]) grouped[block.type] = [];
      grouped[block.type].push(block);
    });
    return grouped;
  }, [blocks]);

  return (
    <>
      {Object.entries(blocksByType).map(([type, typeBlocks]) => (
        <BlockTypeMesh key={type} type={type} blocks={typeBlocks} />
      ))}
    </>
  );
};
