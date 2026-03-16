import { create } from 'zustand';
import { createNoise2D } from 'simplex-noise';
import { v4 as uuidv4 } from 'uuid';

const noise2D = createNoise2D();

export type BlockType = 'dirt' | 'grass' | 'stone' | 'wood' | 'leaves' | 'glass' | 'iron_ore' | 'wheat_seeds' | 'wheat' | 'chest' | 'npc';

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

interface GameState {
  blocks: Record<string, Block>;
  inventory: InventoryItem[];
  activeItemIndex: number;
  setActiveItemIndex: (index: number) => void;
  addBlock: (x: number, y: number, z: number, type: BlockType) => boolean;
  removeBlock: (x: number, y: number, z: number) => void;
  generateWorld: () => void;
  
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
  craftItem: (recipeId: string) => void;
  addToInventory: (type: string, count: number) => void;
  removeFromInventory: (type: string, count: number) => boolean;
  
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
}

const getPosKey = (x: number, y: number, z: number) => `${Math.round(x)},${Math.round(y)},${Math.round(z)}`;

export const useStore = create<GameState>((set, get) => ({
  blocks: {},
  inventory: [
    { type: 'dirt', count: 64 },
    { type: 'grass', count: 64 },
    { type: 'stone', count: 64 },
    { type: 'wood', count: 64 },
    { type: 'leaves', count: 64 },
    { type: 'glass', count: 64 },
  ],
  activeItemIndex: 0,
  setActiveItemIndex: (index) => set({ activeItemIndex: index }),
  
  addToInventory: (type, count) => set((state) => {
    const newInv = [...state.inventory];
    const existing = newInv.find(i => i.type === type);
    if (existing) {
      existing.count += count;
    } else {
      newInv.push({ type, count });
    }
    return { inventory: newInv };
  }),
  
  removeFromInventory: (type, count) => {
    let success = false;
    set((state) => {
      const newInv = [...state.inventory];
      const existing = newInv.find(i => i.type === type);
      if (existing && existing.count >= count) {
        existing.count -= count;
        if (existing.count === 0) {
          const idx = newInv.indexOf(existing);
          newInv.splice(idx, 1);
        }
        success = true;
        return { inventory: newInv };
      }
      return state;
    });
    return success;
  },

  addBlock: (x, y, z, type) => {
    const key = getPosKey(x, y, z);
    const state = get();
    if (state.blocks[key]) return false;
    
    // Quest: Build farm
    if (type === 'wheat_seeds') {
      const farmQuest = state.quests.build_farm;
      if (!farmQuest.completed) {
        const newProgress = farmQuest.progress + 1;
        const completed = newProgress >= farmQuest.target;
        if (completed) {
          state.addChatMessage('Quest Completed: Built a farm! Reward: 5 Bread.', 'ai');
          setTimeout(() => get().addToInventory('bread', 5), 100);
        }
        set({
          blocks: { ...state.blocks, [key]: { id: uuidv4(), pos: [x, y, z], type } },
          quests: { ...state.quests, build_farm: { ...farmQuest, progress: newProgress, completed } }
        });
      } else {
        set({ blocks: { ...state.blocks, [key]: { id: uuidv4(), pos: [x, y, z], type } } });
      }

      // Grow wheat after 10 seconds
      setTimeout(() => {
        const currentBlocks = get().blocks;
        if (currentBlocks[key] && currentBlocks[key].type === 'wheat_seeds') {
          set((s) => ({
            blocks: { ...s.blocks, [key]: { ...s.blocks[key], type: 'wheat' } }
          }));
        }
      }, 10000);
      
      return true;
    }
    
    set({
      blocks: {
        ...state.blocks,
        [key]: { id: uuidv4(), pos: [x, y, z], type }
      }
    });
    return true;
  },
  
  removeBlock: (x, y, z) => {
    const state = get();
    const key = getPosKey(x, y, z);
    const block = state.blocks[key];
    if (!block) return;
    
    const newBlocks = { ...state.blocks };
    delete newBlocks[key];
    
    // Drops
    let dropType = block.type as string;
    if (block.type === 'grass' && Math.random() < 0.3) {
      setTimeout(() => get().addToInventory('wheat_seeds', 1), 10);
    }
    setTimeout(() => get().addToInventory(dropType, 1), 10);
    
    // Quest: Find Ruin (breaking the chest)
    if (block.type === 'chest') {
      const ruinQuest = state.quests.find_ruin;
      if (!ruinQuest.completed) {
        state.addChatMessage('Quest Completed: Found the Ancient Ruin! Reward: Diamond.', 'ai');
        setTimeout(() => get().addToInventory('diamond', 1), 100);
        set({ blocks: newBlocks, quests: { ...state.quests, find_ruin: { ...ruinQuest, progress: 1, completed: true } } });
        return;
      }
    }
    
    set({ blocks: newBlocks });
  },
  
  generateWorld: () => {
    const newBlocks: Record<string, Block> = {};
    const size = 30; // 60x60 world
    for (let x = -size; x <= size; x++) {
      for (let z = -size; z <= size; z++) {
        const y = Math.floor(noise2D(x / 30, z / 30) * 8);
        const key = getPosKey(x, y, z);
        
        // Biomes based on noise
        let surfaceType: BlockType = 'grass';
        if (y > 4) surfaceType = 'stone'; // Mountains
        else if (y < -2) surfaceType = 'dirt'; // Valley
        
        newBlocks[key] = { id: uuidv4(), pos: [x, y, z], type: surfaceType };
        
        for (let dy = y - 1; dy >= y - 3; dy--) {
          newBlocks[getPosKey(x, dy, z)] = { id: uuidv4(), pos: [x, dy, z], type: 'dirt' };
        }
        for (let dy = y - 4; dy >= -10; dy--) {
          const isIron = Math.random() < 0.05;
          newBlocks[getPosKey(x, dy, z)] = { id: uuidv4(), pos: [x, dy, z], type: isIron ? 'iron_ore' : 'stone' };
        }
      }
    }
    
    // Trees
    for (let i = 0; i < 30; i++) {
      const tx = Math.floor(Math.random() * (size * 2)) - size;
      const tz = Math.floor(Math.random() * (size * 2)) - size;
      const ty = Math.floor(noise2D(tx / 30, tz / 30) * 8) + 1;
      
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
    
    // NPC
    newBlocks[getPosKey(0, Math.floor(noise2D(0, 0) * 8) + 1, 5)] = { id: uuidv4(), pos: [0, Math.floor(noise2D(0, 0) * 8) + 1, 5], type: 'npc' };
    
    // Ancient Ruin
    const rx = 20;
    const rz = 20;
    const ry = Math.floor(noise2D(rx / 30, rz / 30) * 8) + 1;
    for (let x = -2; x <= 2; x++) {
      for (let z = -2; z <= 2; z++) {
        for (let y = 0; y < 4; y++) {
          if (x === -2 || x === 2 || z === -2 || z === 2 || y === 3) {
            newBlocks[getPosKey(rx + x, ry + y, rz + z)] = { id: uuidv4(), pos: [rx + x, ry + y, rz + z], type: 'stone' };
          }
        }
      }
    }
    newBlocks[getPosKey(rx, ry, rz)] = { id: uuidv4(), pos: [rx, ry, rz], type: 'chest' };
    
    set({ blocks: newBlocks });
  },
  
  chatMessages: [{ id: uuidv4(), text: 'Welcome to AI Craft! Press T to chat with the AI Guide, or I to analyze an image. Press C to open Crafting.', sender: 'ai' }],
  addChatMessage: (text, sender) => set((state) => ({ chatMessages: [...state.chatMessages, { id: uuidv4(), text, sender }] })),
  isChatOpen: false,
  setChatOpen: (open) => set({ isChatOpen: open }),
  isImageAnalyzerOpen: false,
  setImageAnalyzerOpen: (open) => set({ isImageAnalyzerOpen: open }),
  
  health: 20,
  hunger: 20,
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
  craftItem: (recipeId) => {
    const state = get();
    if (recipeId === 'iron_pickaxe' && state.removeFromInventory('iron_ore', 10)) {
      state.addToInventory('iron_pickaxe', 1);
      if (!state.quests.craft_iron_pickaxe.completed) {
        state.addChatMessage('Quest Completed: Crafted an Iron Pickaxe! Reward: 10 Wood.', 'ai');
        state.addToInventory('wood', 10);
        set({ quests: { ...state.quests, craft_iron_pickaxe: { progress: 1, target: 1, completed: true } } });
      }
    } else if (recipeId === 'wooden_axe' && state.removeFromInventory('wood', 5)) {
      state.addToInventory('wooden_axe', 1);
    } else if (recipeId === 'bread' && state.removeFromInventory('wheat', 3)) {
      state.addToInventory('bread', 1);
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
          state.addChatMessage('Quest Completed: Found 3 biomes! Reward: 5 Iron Ore.', 'ai');
          setTimeout(() => get().addToInventory('iron_ore', 5), 100);
        }
        set({ quests: { ...state.quests, find_biomes: { ...q, progress: newProgress, completed } } });
      }
    }
  },
  
  npcDialogue: null,
  setNpcDialogue: (dialogue) => set({ npcDialogue: dialogue })
}));
