import { create } from 'zustand';
import { createNoise2D } from 'simplex-noise';
import { v4 as uuidv4 } from 'uuid';

const noise2D = createNoise2D();

export type BlockType = 'dirt' | 'grass' | 'stone' | 'wood' | 'leaves' | 'glass' | 'iron_ore' | 'wheat_seeds' | 'wheat' | 'chest' | 'npc' | 'torch' | 'flower' | 'tnt' | 'slime' | 'jetpack' | 'water' | 'nuke' | 'laser' | 'bedrock' | 'sand' | 'snow' | 'crafting_table' | 'cactus';

export interface Block {
  id: string;
  pos: [number, number, number];
  type: BlockType;
  metadata?: any;
}

export interface InventoryItem {
  type: string;
  count: number;
}

export interface Drop {
  id: string;
  type: string;
  pos: [number, number, number];
}

interface GameState {
  blocks: Record<string, Block>;
  inventory: InventoryItem[];
  activeItemIndex: number;
  setActiveItemIndex: (index: number) => void;
  addBlock: (x: number, y: number, z: number, type: BlockType) => boolean;
  removeBlock: (x: number, y: number, z: number, dropItem?: boolean) => void;
  explode: (x: number, y: number, z: number, radius: number) => void;
  explosionEvent: { x: number, y: number, z: number, radius: number, time: number } | null;
  primedTnts: { id: string, pos: [number, number, number], progress: number }[];
  addPrimedTnt: (pos: [number, number, number]) => void;
  removePrimedTnt: (id: string) => void;
  generateWorld: () => void;
  updateChunks: (px: number, pz: number) => void;
  time: number;
  setTime: (time: number) => void;
  loadedChunks: Record<string, boolean>;
  visibleBlocks: Record<string, Block>;
  blocksByType: Record<string, Block[]>;
  isWorldGenerated: boolean;
  
  // Drops
  drops: Drop[];
  addDrop: (type: string, pos: [number, number, number]) => void;
  removeDrop: (id: string) => void;

  // Inventory UI
  isInventoryOpen: boolean;
  setInventoryOpen: (open: boolean) => void;

  // Chat & AI
  chatMessages: { id: string; text: string; sender: 'user' | 'ai' }[];
  addChatMessage: (text: string, sender: 'user' | 'ai') => void;
  isChatOpen: boolean;
  setChatOpen: (open: boolean) => void;
  isImageAnalyzerOpen: boolean;
  setImageAnalyzerOpen: (open: boolean) => void;
  
  // Survival
  health: number;
  hunger: number;
  setHealth: (h: number) => void;
  setHunger: (h: number) => void;
  eatFood: () => void;
  
  // Crafting
  isCraftingOpen: boolean;
  setCraftingOpen: (open: boolean) => void;
  craftingGrid: ({ type: string; count: number } | null)[];
  setCraftingGrid: (grid: ({ type: string; count: number } | null)[]) => void;
  craftItem: (recipeId: string) => void;
  addToInventory: (type: string, count: number) => void;
  removeFromInventory: (type: string, count: number) => boolean;
  swapInventoryItems: (index1: number, index2: number) => void;
  
  // Quests & Story
  quests: {
    find_biomes: { progress: string[]; target: 3; completed: boolean };
    craft_iron_pickaxe: { progress: number; target: 1; completed: boolean };
    build_farm: { progress: number; target: 10; completed: boolean };
    find_ruin: { progress: number; target: 1; completed: boolean };
  };
  updateQuest: (questId: string, value: any) => void;
  npcDialogue: string | null;
  setNpcDialogue: (dialogue: string | null) => void;
  isRaining: boolean;
  setRaining: (raining: boolean) => void;
  weather: 'clear' | 'rain' | 'storm';
  setWeather: (weather: 'clear' | 'rain' | 'storm') => void;
}

const getPosKey = (x: number, y: number, z: number) => `${Math.round(x)},${Math.round(y)},${Math.round(z)}`;

const computeBlocksByType = (visibleBlocks: Record<string, Block>) => {
  const grouped: Record<string, Block[]> = {};
  for (const key in visibleBlocks) {
    const block = visibleBlocks[key];
    if (!grouped[block.type]) grouped[block.type] = [];
    grouped[block.type].push(block);
  }
  return grouped;
};

const addBlockToType = (blocksByType: Record<string, Block[]>, block: Block) => {
  const newBlocksByType = { ...blocksByType };
  if (!newBlocksByType[block.type]) newBlocksByType[block.type] = [];
  newBlocksByType[block.type] = [...newBlocksByType[block.type], block];
  return newBlocksByType;
};

const removeBlockFromType = (blocksByType: Record<string, Block[]>, block: Block) => {
  const newBlocksByType = { ...blocksByType };
  if (newBlocksByType[block.type]) {
    newBlocksByType[block.type] = newBlocksByType[block.type].filter(b => b.id !== block.id);
  }
  return newBlocksByType;
};

export const useStore = create<GameState>((set, get) => ({
  blocks: {},
  loadedChunks: {},
  visibleBlocks: {},
  blocksByType: {},
  isWorldGenerated: false,
  time: 0,
  setTime: (time) => set({ time }),
  inventory: [
    { type: 'dirt', count: 64 },
    { type: 'grass', count: 64 },
    { type: 'stone', count: 64 },
    { type: 'wood', count: 64 },
    { type: 'leaves', count: 64 },
    { type: 'glass', count: 64 },
    { type: 'crafting_table', count: 64 },
    { type: 'torch', count: 64 },
    { type: 'tnt', count: 64 },
    { type: 'slime', count: 64 },
    { type: 'jetpack', count: 1 },
    { type: 'nuke', count: 10 },
    { type: 'laser', count: 1 },
  ],
  activeItemIndex: 0,
  setActiveItemIndex: (index) => set({ activeItemIndex: index }),
  
  drops: [],
  addDrop: (type, pos) => set((state) => ({ drops: [...state.drops, { id: uuidv4(), type, pos }] })),
  removeDrop: (id) => set((state) => ({ drops: state.drops.filter(d => d.id !== id) })),

  isInventoryOpen: false,
  setInventoryOpen: (open) => set({ isInventoryOpen: open }),
  explosionEvent: null,
  primedTnts: [],
  addPrimedTnt: (pos) => set((state) => ({ primedTnts: [...state.primedTnts, { id: uuidv4(), pos, progress: 0 }] })),
  removePrimedTnt: (id) => set((state) => ({ primedTnts: state.primedTnts.filter(t => t.id !== id) })),

  addToInventory: (type, count) => set((state) => {
    const newInv = [...state.inventory];
    const existingIndex = newInv.findIndex(i => i.type === type);
    if (existingIndex !== -1) {
      newInv[existingIndex] = { ...newInv[existingIndex], count: newInv[existingIndex].count + count };
    } else {
      newInv.push({ type, count });
    }
    return { inventory: newInv };
  }),
  
  removeFromInventory: (type, count) => {
    let success = false;
    set((state) => {
      const newInv = [...state.inventory];
      const existingIndex = newInv.findIndex(i => i.type === type);
      if (existingIndex !== -1 && newInv[existingIndex].count >= count) {
        const existing = { ...newInv[existingIndex] };
        existing.count -= count;
        if (existing.count === 0) {
          newInv.splice(existingIndex, 1);
        } else {
          newInv[existingIndex] = existing;
        }
        success = true;
        return { inventory: newInv };
      }
      return state;
    });
    return success;
  },
  
  swapInventoryItems: (index1: number, index2: number) => set((state) => {
    const newInv = [...state.inventory];
    if (index1 >= 0 && index1 < newInv.length && index2 >= 0 && index2 < newInv.length) {
      const temp = newInv[index1];
      newInv[index1] = newInv[index2];
      newInv[index2] = temp;
    }
    return { inventory: newInv };
  }),

  addBlock: (x, y, z, type) => {
    const key = getPosKey(x, y, z);
    const state = get();
    if (state.blocks[key]) return false;
    
    const newBlock: Block = { id: uuidv4(), pos: [x, y, z], type };
    
    // Quest: Build farm
    if (type === 'wheat_seeds') {
      const farmQuest = state.quests.build_farm;
      if (!farmQuest.completed) {
        const newProgress = farmQuest.progress + 1;
        const completed = newProgress >= farmQuest.target;
        if (completed) {
          state.addChatMessage('任务完成：建立农场！奖励：5 个面包。', 'ai');
          setTimeout(() => get().addToInventory('bread', 5), 100);
        }
        set({
          blocks: { ...state.blocks, [key]: newBlock },
          visibleBlocks: { ...state.visibleBlocks, [key]: newBlock },
          blocksByType: addBlockToType(state.blocksByType, newBlock),
          quests: { ...state.quests, build_farm: { ...farmQuest, progress: newProgress, completed } }
        });
      } else {
        set({ 
          blocks: { ...state.blocks, [key]: newBlock },
          visibleBlocks: { ...state.visibleBlocks, [key]: newBlock },
          blocksByType: addBlockToType(state.blocksByType, newBlock)
        });
      }

      // Grow wheat after 10 seconds
      setTimeout(() => {
        const currentBlocks = get().blocks;
        if (currentBlocks[key] && currentBlocks[key].type === 'wheat_seeds') {
          const grownBlock: Block = { ...currentBlocks[key], type: 'wheat' };
          const s = get();
          let newBlocksByType = removeBlockFromType(s.blocksByType, currentBlocks[key]);
          newBlocksByType = addBlockToType(newBlocksByType, grownBlock);
          set({
            blocks: { ...s.blocks, [key]: grownBlock },
            visibleBlocks: { ...s.visibleBlocks, [key]: grownBlock },
            blocksByType: newBlocksByType
          });
        }
      }, 10000);
      
      return true;
    }
    
    set({
      blocks: {
        ...state.blocks,
        [key]: newBlock
      },
      visibleBlocks: {
        ...state.visibleBlocks,
        [key]: newBlock
      },
      blocksByType: addBlockToType(state.blocksByType, newBlock)
    });
    return true;
  },
  
  removeBlock: (x, y, z, dropItem = true) => {
    const state = get();
    const key = getPosKey(x, y, z);
    const block = state.blocks[key];
    if (!block) return;
    
    const newBlocks = { ...state.blocks };
    delete newBlocks[key];
    const newVisibleBlocks = { ...state.visibleBlocks };
    delete newVisibleBlocks[key];
    const newBlocksByType = removeBlockFromType(state.blocksByType, block);
    
    // Drops
    if (dropItem) {
      let dropType = block.type as string;
      if (block.type === 'grass') {
        dropType = 'dirt';
        if (Math.random() < 0.3) {
          get().addDrop('wheat_seeds', [x, y, z]);
        }
      }
      get().addDrop(dropType, [x, y, z]);
    }
    
    // Quest: Find Ruin (breaking the chest)
    if (block.type === 'chest') {
      const ruinQuest = state.quests.find_ruin;
      if (!ruinQuest.completed) {
        state.addChatMessage('任务完成：找到古老遗迹！奖励：1 颗钻石。', 'ai');
        setTimeout(() => get().addToInventory('diamond', 1), 100);
        set({ blocks: newBlocks, visibleBlocks: newVisibleBlocks, blocksByType: newBlocksByType, quests: { ...state.quests, find_ruin: { ...ruinQuest, progress: 1, completed: true } } });
        return;
      }
    }
    
    set({ blocks: newBlocks, visibleBlocks: newVisibleBlocks, blocksByType: newBlocksByType });
  },

  explode: (x: number, y: number, z: number, radius: number) => {
    const state = get();
    const newBlocks = { ...state.blocks };
    const newVisibleBlocks = { ...state.visibleBlocks };
    let exploded = false;
    
    const deletedIdsByType: Record<string, Set<string>> = {};
    const newDrops: { id: string, type: string, pos: [number, number, number] }[] = [];

    for (let dx = -radius; dx <= radius; dx++) {
      for (let dy = -radius; dy <= radius; dy++) {
        for (let dz = -radius; dz <= radius; dz++) {
          if (dx * dx + dy * dy + dz * dz <= radius * radius) {
            const key = getPosKey(x + dx, y + dy, z + dz);
            if (newBlocks[key] && newBlocks[key].type !== 'bedrock') {
              const block = newBlocks[key];
              
              if (!deletedIdsByType[block.type]) deletedIdsByType[block.type] = new Set();
              deletedIdsByType[block.type].add(block.id);
              
              if (block.type === 'tnt') {
                // Chain reaction!
                const tntPos = block.pos;
                delete newBlocks[key];
                delete newVisibleBlocks[key];
                // Add primed TNT with a slight random delay so they don't all explode at the exact same frame
                setTimeout(() => {
                  get().addPrimedTnt(tntPos);
                }, Math.random() * 200);
              } else {
                delete newBlocks[key];
                delete newVisibleBlocks[key];
                exploded = true;
                // Add some drops randomly
                if (Math.random() < 0.1) {
                  newDrops.push({ id: uuidv4(), type: block.type === 'leaves' ? 'wood' : block.type, pos: [x + dx, y + dy, z + dz] });
                }
              }
            }
          }
        }
      }
    }

    if (exploded || Object.keys(deletedIdsByType).length > 0) {
      const newBlocksByType = { ...state.blocksByType };
      for (const type in deletedIdsByType) {
        if (newBlocksByType[type]) {
          newBlocksByType[type] = newBlocksByType[type].filter(b => !deletedIdsByType[type].has(b.id));
        }
      }
      
      set({ 
        blocks: newBlocks,
        visibleBlocks: newVisibleBlocks,
        blocksByType: newBlocksByType,
        drops: [...state.drops, ...newDrops],
        explosionEvent: { x, y, z, radius, time: Date.now() }
      });
      import('../utils/sounds').then(m => m.playSound('break'));
    }
  },
  
  updateChunks: (px: number, pz: number) => {
    const state = get();
    const CHUNK_SIZE = 16;
    const RENDER_DISTANCE = 3; // chunks
    
    const cx = Math.floor(px / CHUNK_SIZE);
    const cz = Math.floor(pz / CHUNK_SIZE);
    
    // Check if we moved to a new chunk
    const currentChunkKey = `${cx},${cz}`;
    if ((state as any).lastChunkKey === currentChunkKey) return;
    
    let chunksUpdated = false;
    const newLoadedChunks = { ...state.loadedChunks };
    const newBlocks = { ...state.blocks };
    
    for (let x = cx - RENDER_DISTANCE; x <= cx + RENDER_DISTANCE; x++) {
      for (let z = cz - RENDER_DISTANCE; z <= cz + RENDER_DISTANCE; z++) {
        const chunkKey = `${x},${z}`;
        if (!newLoadedChunks[chunkKey]) {
          newLoadedChunks[chunkKey] = true;
          chunksUpdated = true;
          
          const startX = x * CHUNK_SIZE;
          const startZ = z * CHUNK_SIZE;
          
          for (let bx = 0; bx < CHUNK_SIZE; bx++) {
            for (let bz = 0; bz < CHUNK_SIZE; bz++) {
              const worldX = startX + bx;
              const worldZ = startZ + bz;
              const y = Math.floor(noise2D(worldX / 40, worldZ / 40) * 10);
              const tempNoise = noise2D(worldX / 100, worldZ / 100);
              const key = getPosKey(worldX, y, worldZ);
              
              let surfaceType: BlockType = 'grass';
              if (y > 5) surfaceType = 'stone';
              else if (y < -3) surfaceType = 'dirt';
              else if (tempNoise > 0.5) surfaceType = 'sand';
              else if (tempNoise < -0.5) surfaceType = 'snow';
              
              newBlocks[key] = { id: uuidv4(), pos: [worldX, y, worldZ], type: surfaceType };

              if (surfaceType === 'grass' && Math.random() < 0.05) {
                newBlocks[getPosKey(worldX, y + 1, worldZ)] = { id: uuidv4(), pos: [worldX, y + 1, worldZ], type: 'flower' };
              }
              
              for (let dy = y - 1; dy >= y - 2; dy--) {
                newBlocks[getPosKey(worldX, dy, worldZ)] = { id: uuidv4(), pos: [worldX, dy, worldZ], type: surfaceType === 'sand' ? 'sand' : 'dirt' };
              }
              for (let dy = y - 3; dy >= y - 4; dy--) {
                const isIron = Math.random() < 0.05;
                newBlocks[getPosKey(worldX, dy, worldZ)] = { id: uuidv4(), pos: [worldX, dy, worldZ], type: isIron ? 'iron_ore' : 'stone' };
              }

              // Water level
              const WATER_LEVEL = -2;
              if (y < WATER_LEVEL) {
                for (let wy = y + 1; wy <= WATER_LEVEL; wy++) {
                  newBlocks[getPosKey(worldX, wy, worldZ)] = { id: uuidv4(), pos: [worldX, wy, worldZ], type: 'water' };
                }
              }
            }
          }
          
          // Trees
          for (let i = 0; i < 2; i++) {
            const tx = startX + Math.floor(Math.random() * CHUNK_SIZE);
            const tz = startZ + Math.floor(Math.random() * CHUNK_SIZE);
            if (Math.abs(tx) < 3 && Math.abs(tz) < 3) continue;
            const ty = Math.floor(noise2D(tx / 40, tz / 40) * 10) + 1;
            const tempNoise = noise2D(tx / 100, tz / 100);
            
            if (ty <= 5 && ty >= -3) {
              if (tempNoise > 0.5) {
                // Desert: Cactus
                if (Math.random() < 0.3) {
                  const h = 2 + Math.floor(Math.random() * 3);
                  for (let y = 0; y < h; y++) {
                    newBlocks[getPosKey(tx, ty + y, tz)] = { id: uuidv4(), pos: [tx, ty + y, tz], type: 'cactus' };
                  }
                }
              } else if (tempNoise < -0.5) {
                // Snow: Pine tree
                for (let h = 0; h < 5; h++) newBlocks[getPosKey(tx, ty + h, tz)] = { id: uuidv4(), pos: [tx, ty + h, tz], type: 'wood' };
                for (let ly = 2; ly <= 6; ly++) {
                  const radius = ly === 6 ? 1 : (ly % 2 === 0 ? 2 : 1);
                  for (let lx = -radius; lx <= radius; lx++) {
                    for (let lz = -radius; lz <= radius; lz++) {
                      if (lx === 0 && lz === 0 && ly < 5) continue;
                      const key = getPosKey(tx + lx, ty + ly, tz + lz);
                      if (!newBlocks[key]) newBlocks[key] = { id: uuidv4(), pos: [tx + lx, ty + ly, tz + lz], type: 'leaves' };
                    }
                  }
                }
              } else {
                // Normal tree
                for (let h = 0; h < 4; h++) newBlocks[getPosKey(tx, ty + h, tz)] = { id: uuidv4(), pos: [tx, ty + h, tz], type: 'wood' };
                for (let lx = -2; lx <= 2; lx++) {
                  for (let lz = -2; lz <= 2; lz++) {
                    for (let ly = 3; ly <= 5; ly++) {
                      if (Math.abs(lx) === 2 && Math.abs(lz) === 2 && ly === 5) continue;
                      if (lx === 0 && lz === 0 && ly < 5) continue;
                      const key = getPosKey(tx + lx, ty + ly, tz + lz);
                      if (!newBlocks[key]) newBlocks[key] = { id: uuidv4(), pos: [tx + lx, ty + ly, tz + lz], type: 'leaves' };
                    }
                  }
                }
              }
            }
          }
        }
      }
    }
    
    // Always update visible blocks when crossing chunk boundary
    const newVisibleBlocks: Record<string, Block> = {};
    const minX = (cx - RENDER_DISTANCE) * CHUNK_SIZE;
    const maxX = (cx + RENDER_DISTANCE + 1) * CHUNK_SIZE;
    const minZ = (cz - RENDER_DISTANCE) * CHUNK_SIZE;
    const maxZ = (cz + RENDER_DISTANCE + 1) * CHUNK_SIZE;
    
    for (const key in newBlocks) {
      const b = newBlocks[key];
      if (b.pos[0] >= minX && b.pos[0] < maxX && b.pos[2] >= minZ && b.pos[2] < maxZ) {
        newVisibleBlocks[key] = b;
      }
    }
    
    set({ 
      blocks: newBlocks, 
      loadedChunks: newLoadedChunks, 
      visibleBlocks: newVisibleBlocks,
      blocksByType: computeBlocksByType(newVisibleBlocks),
      lastChunkKey: currentChunkKey,
      isWorldGenerated: true
    } as any);
  },
  
  generateWorld: () => {
    // Initial generation
    get().updateChunks(0, 0);
    
    // Add NPC and Ruin near spawn
    const state = get();
    const newBlocks = { ...state.blocks };
    const newVisibleBlocks = { ...state.visibleBlocks };
    let newBlocksByType = { ...state.blocksByType };
    
    // NPC
    const npcPos = [0, Math.floor(noise2D(0, 0) * 10) + 1, 5] as [number, number, number];
    const npcBlock = { id: uuidv4(), pos: npcPos, type: 'npc' as BlockType };
    newBlocks[getPosKey(...npcPos)] = npcBlock;
    newVisibleBlocks[getPosKey(...npcPos)] = npcBlock;
    newBlocksByType = addBlockToType(newBlocksByType, npcBlock);
    
    // Ancient Ruin
    const rx = 15;
    const rz = 15;
    const ry = Math.floor(noise2D(rx / 40, rz / 40) * 10) + 1;
    for (let x = -2; x <= 2; x++) {
      for (let z = -2; z <= 2; z++) {
        for (let y = 0; y < 4; y++) {
          if (x === -2 || x === 2 || z === -2 || z === 2 || y === 3) {
            const pos = [rx + x, ry + y, rz + z] as [number, number, number];
            const block = { id: uuidv4(), pos, type: 'stone' as BlockType };
            newBlocks[getPosKey(...pos)] = block;
            newVisibleBlocks[getPosKey(...pos)] = block;
            newBlocksByType = addBlockToType(newBlocksByType, block);
          }
        }
      }
    }
    const chestPos = [rx, ry, rz] as [number, number, number];
    const chestBlock = { id: uuidv4(), pos: chestPos, type: 'chest' as BlockType };
    newBlocks[getPosKey(...chestPos)] = chestBlock;
    newVisibleBlocks[getPosKey(...chestPos)] = chestBlock;
    newBlocksByType = addBlockToType(newBlocksByType, chestBlock);
    
    set({ blocks: newBlocks, visibleBlocks: newVisibleBlocks, blocksByType: newBlocksByType });
  },
  
  chatMessages: [{ id: uuidv4(), text: '欢迎来到 AI Craft！按 T 与 AI 向导聊天，或按 I 分析图像。按 C 打开制作菜单。', sender: 'ai' }],
  addChatMessage: (text, sender) => set((state) => ({ chatMessages: [...state.chatMessages, { id: uuidv4(), text, sender }] })),
  isChatOpen: false,
  setChatOpen: (open) => set({ isChatOpen: open }),
  isImageAnalyzerOpen: false,
  setImageAnalyzerOpen: (open) => set({ isImageAnalyzerOpen: open }),
  
  health: 20,
  hunger: 20,
  weather: 'clear' as 'clear' | 'rain' | 'storm',
  setWeather: (weather: 'clear' | 'rain' | 'storm') => set({ weather }),
  setHealth: (h) => set({ health: Math.max(0, Math.min(20, h)) }),
  setHunger: (h) => set({ hunger: Math.max(0, Math.min(20, h)) }),
  eatFood: () => {
    const state = get();
    const hasBread = state.inventory.find(i => i.type === 'bread' && i.count > 0);
    if (hasBread) {
      state.removeFromInventory('bread', 1);
      set({ hunger: Math.min(20, state.hunger + 5), health: Math.min(20, state.health + 2) });
    }
  },
  
  isCraftingOpen: false,
  setCraftingOpen: (open) => set({ isCraftingOpen: open }),
  craftingGrid: Array(9).fill(null),
  setCraftingGrid: (grid) => set({ craftingGrid: grid }),
  craftItem: (recipeId) => {
    const state = get();
    if (recipeId === 'iron_pickaxe' && state.removeFromInventory('iron_ore', 10)) {
      state.addToInventory('iron_pickaxe', 1);
      if (!state.quests.craft_iron_pickaxe.completed) {
        state.addChatMessage('任务完成：制作铁镐！奖励：10 个木头。', 'ai');
        state.addToInventory('wood', 10);
        set({ quests: { ...state.quests, craft_iron_pickaxe: { progress: 1, target: 1, completed: true } } });
      }
    } else if (recipeId === 'wooden_axe' && state.removeFromInventory('wood', 5)) {
      state.addToInventory('wooden_axe', 1);
    } else if (recipeId === 'chest' && state.removeFromInventory('wood', 8)) {
      state.addToInventory('chest', 1);
    } else if (recipeId === 'bread' && state.removeFromInventory('wheat', 3)) {
      state.addToInventory('bread', 1);
    } else if (recipeId === 'torch' && state.removeFromInventory('wood', 1)) {
      state.addToInventory('torch', 4);
    }
  },
  
  quests: {
    find_biomes: { progress: [], target: 3, completed: false },
    craft_iron_pickaxe: { progress: 0, target: 1, completed: false },
    build_farm: { progress: 0, target: 10, completed: false },
    find_ruin: { progress: 0, target: 1, completed: false },
  },
  updateQuest: (questId, value) => {
    const state = get();
    if (questId === 'find_biomes') {
      const q = state.quests.find_biomes;
      if (!q.completed && !q.progress.includes(value)) {
        const newProgress = [...q.progress, value];
        const completed = newProgress.length >= q.target;
        if (completed) {
          state.addChatMessage('任务完成：找到 3 种生物群落！奖励：5 个铁矿石。', 'ai');
          setTimeout(() => get().addToInventory('iron_ore', 5), 100);
        }
        set({ quests: { ...state.quests, find_biomes: { ...q, progress: newProgress, completed } } });
      }
    }
  },
  
  npcDialogue: null,
  setNpcDialogue: (dialogue) => set({ npcDialogue: dialogue }),
  isRaining: false,
  setRaining: (raining) => set({ isRaining: raining })
}));
