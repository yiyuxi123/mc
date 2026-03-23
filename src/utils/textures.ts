import * as THREE from 'three';

export const textureDataURIs: Record<string, string> = {};

const generateTexture = (type: string) => {
  const canvas = document.createElement('canvas');
  const size = 64;
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (!ctx) return new THREE.Texture();

  // Helper to add noise
  const addNoise = (color: string, count: number, w: number, h: number) => {
    ctx.fillStyle = color;
    for (let i = 0; i < count; i++) {
      ctx.fillRect(Math.random() * size, Math.random() * size, w, h);
    }
  };

  if (type === 'dirt') {
    ctx.fillStyle = '#5c3a21';
    ctx.fillRect(0, 0, size, size);
    addNoise('#4a2f1b', 400, 2, 2);
    addNoise('#6b4427', 200, 2, 2);
  } else if (type === 'grass') {
    ctx.fillStyle = '#5c3a21';
    ctx.fillRect(0, 0, size, size);
    addNoise('#4a2f1b', 200, 2, 2);
    
    // Grass top
    ctx.fillStyle = '#41980a';
    ctx.fillRect(0, 0, size, 16);
    
    // Grass overhang
    for (let i = 0; i < size; i += 4) {
      if (Math.random() > 0.3) {
        ctx.fillRect(i, 16, 4, Math.random() * 8);
      }
    }
    
    // Grass noise
    ctx.fillStyle = '#357a08';
    for (let i = 0; i < 150; i++) {
      ctx.fillRect(Math.random() * size, Math.random() * 16, 2, 2);
    }
    ctx.fillStyle = '#52b80d';
    for (let i = 0; i < 100; i++) {
      ctx.fillRect(Math.random() * size, Math.random() * 16, 2, 2);
    }
  } else if (type === 'grass_top') {
    ctx.fillStyle = '#41980a';
    ctx.fillRect(0, 0, size, size);
    addNoise('#357a08', 300, 2, 2);
    addNoise('#52b80d', 200, 2, 2);
  } else if (type === 'stone') {
    ctx.fillStyle = '#7d7d7d';
    ctx.fillRect(0, 0, size, size);
    addNoise('#636363', 500, 4, 4);
    addNoise('#8f8f8f', 300, 2, 2);
    // Cracks
    ctx.fillStyle = '#4a4a4a';
    for (let i = 0; i < 10; i++) {
      ctx.fillRect(Math.random() * size, Math.random() * size, 8, 1);
      ctx.fillRect(Math.random() * size, Math.random() * size, 1, 8);
    }
  } else if (type === 'wood') {
    ctx.fillStyle = '#5c4033';
    ctx.fillRect(0, 0, size, size);
    ctx.fillStyle = '#4a332a';
    for (let i = 0; i < size; i += 8) {
      ctx.fillRect(0, i, size, 2);
      if (Math.random() > 0.5) {
        ctx.fillRect(Math.random() * size, i, 8, 4);
      }
    }
    addNoise('#3d2a22', 100, 2, 4);
  } else if (type === 'leaves') {
    ctx.fillStyle = '#2d5a27';
    ctx.fillRect(0, 0, size, size);
    addNoise('#1e3f1a', 600, 4, 4);
    addNoise('#3a7332', 400, 4, 4);
    // Add some gaps for transparency
    ctx.clearRect(Math.random() * size, Math.random() * size, 8, 8);
    ctx.clearRect(Math.random() * size, Math.random() * size, 8, 8);
  } else if (type === 'glass') {
    ctx.fillStyle = 'rgba(173, 216, 230, 0.3)';
    ctx.fillRect(0, 0, size, size);
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.9)';
    ctx.lineWidth = 4;
    ctx.strokeRect(2, 2, size - 4, size - 4);
    // Diagonal shine
    ctx.beginPath();
    ctx.moveTo(8, size - 8);
    ctx.lineTo(size - 8, 8);
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
    ctx.lineWidth = 6;
    ctx.stroke();
  } else if (type === 'iron_ore') {
    ctx.fillStyle = '#7d7d7d';
    ctx.fillRect(0, 0, size, size);
    addNoise('#636363', 500, 4, 4);
    // Iron spots
    ctx.fillStyle = '#d8af93';
    for (let i = 0; i < 30; i++) {
      ctx.fillRect(Math.random() * size, Math.random() * size, 6, 6);
    }
    ctx.fillStyle = '#e8c8b0';
    for (let i = 0; i < 15; i++) {
      ctx.fillRect(Math.random() * size, Math.random() * size, 4, 4);
    }
  } else if (type === 'sand') {
    ctx.fillStyle = '#e3cfa1';
    ctx.fillRect(0, 0, size, size);
    addNoise('#d1ba8a', 300, 2, 2);
    addNoise('#f0e0b9', 200, 2, 2);
  } else if (type === 'snow') {
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, size, size);
    addNoise('#e0e0e0', 200, 2, 2);
    addNoise('#f5f5f5', 300, 2, 2);
  } else if (type === 'wheat_seeds') {
    ctx.fillStyle = '#5c3a21'; // dirt background
    ctx.fillRect(0, 0, size, size);
    addNoise('#4a2f1b', 400, 2, 2);
    ctx.fillStyle = '#e2c044';
    for (let i = 0; i < 15; i++) {
      ctx.fillRect(Math.random() * size, Math.random() * size, 4, 4);
    }
  } else if (type === 'wheat') {
    ctx.fillStyle = '#5c3a21'; // dirt background
    ctx.fillRect(0, 0, size, size);
    addNoise('#4a2f1b', 400, 2, 2);
    ctx.fillStyle = '#e2c044';
    ctx.fillRect(16, 0, 8, size);
    ctx.fillRect(40, 0, 8, size);
    ctx.fillStyle = '#d1ad32';
    ctx.fillRect(18, 0, 4, size);
    ctx.fillRect(42, 0, 4, size);
  } else if (type === 'cactus') {
    ctx.fillStyle = '#0f5e0f';
    ctx.fillRect(0, 0, size, size);
    addNoise('#1a7a1a', 400, 4, 4);
    ctx.fillStyle = '#000000';
    for (let i = 0; i < 40; i++) {
      ctx.fillRect(Math.random() * size, Math.random() * size, 2, 2);
    }
  } else if (type === 'crafting_table') {
    ctx.fillStyle = '#8b5a2b';
    ctx.fillRect(0, 0, size, size);
    ctx.fillStyle = '#5c4033';
    ctx.fillRect(0, 0, size, 16);
    ctx.fillStyle = '#3e2723';
    for (let i = 0; i < size; i += 16) {
      for (let j = 0; j < 16; j += 16) {
        ctx.strokeRect(i, j, 16, 16);
      }
    }
    // Tools on side
    ctx.fillStyle = '#7d7d7d';
    ctx.fillRect(10, 30, 4, 20);
    ctx.fillRect(20, 30, 4, 20);
    ctx.fillStyle = '#8b4513';
    ctx.fillRect(10, 50, 4, 10);
    ctx.fillRect(20, 50, 4, 10);
  } else if (type === 'chest') {
    ctx.fillStyle = '#8b5a2b';
    ctx.fillRect(0, 0, size, size);
    ctx.strokeStyle = '#3e2723';
    ctx.lineWidth = 6;
    ctx.strokeRect(0, 0, size, size);
    // Wood planks
    ctx.fillStyle = '#3e2723';
    ctx.fillRect(0, 16, size, 2);
    ctx.fillRect(0, 32, size, 2);
    ctx.fillRect(0, 48, size, 2);
    // Lock
    ctx.fillStyle = 'silver';
    ctx.fillRect(24, 24, 16, 16);
    ctx.fillStyle = '#444';
    ctx.fillRect(28, 28, 8, 8);
  } else if (type === 'npc') {
    ctx.fillStyle = '#9c27b0';
    ctx.fillRect(0, 0, size, size);
    addNoise('#7b1fa2', 200, 4, 4);
    // Eyes
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(12, 16, 12, 12);
    ctx.fillRect(40, 16, 12, 12);
    ctx.fillStyle = '#000000';
    ctx.fillRect(16, 20, 4, 4);
    ctx.fillRect(44, 20, 4, 4);
    // Mouth
    ctx.fillStyle = '#000000';
    ctx.fillRect(24, 40, 16, 8);
  } else if (type === 'iron_pickaxe') {
    ctx.fillStyle = 'rgba(0,0,0,0)';
    ctx.fillRect(0, 0, size, size);
    // Handle
    ctx.fillStyle = '#8b5a2b';
    ctx.beginPath();
    ctx.moveTo(16, 48);
    ctx.lineTo(48, 16);
    ctx.lineWidth = 6;
    ctx.strokeStyle = '#5c3a21';
    ctx.stroke();
    // Head
    ctx.fillStyle = '#d3d3d3';
    ctx.beginPath();
    ctx.moveTo(10, 20);
    ctx.quadraticCurveTo(32, 0, 50, 10);
    ctx.lineTo(40, 20);
    ctx.quadraticCurveTo(32, 12, 20, 30);
    ctx.fill();
  } else if (type === 'wooden_axe') {
    ctx.fillStyle = 'rgba(0,0,0,0)';
    ctx.fillRect(0, 0, size, size);
    // Handle
    ctx.fillStyle = '#8b5a2b';
    ctx.beginPath();
    ctx.moveTo(16, 48);
    ctx.lineTo(48, 16);
    ctx.lineWidth = 6;
    ctx.strokeStyle = '#5c3a21';
    ctx.stroke();
    // Head
    ctx.fillStyle = '#8b5a2b';
    ctx.beginPath();
    ctx.moveTo(30, 10);
    ctx.lineTo(50, 10);
    ctx.lineTo(50, 30);
    ctx.lineTo(40, 30);
    ctx.fill();
  } else if (type === 'bread') {
    ctx.fillStyle = 'rgba(0,0,0,0)';
    ctx.fillRect(0, 0, size, size);
    ctx.fillStyle = '#d2691e';
    ctx.beginPath();
    ctx.ellipse(32, 32, 24, 16, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#8b4513';
    ctx.fillRect(20, 24, 4, 16);
    ctx.fillRect(30, 24, 4, 16);
    ctx.fillRect(40, 24, 4, 16);
  } else if (type === 'diamond') {
    ctx.fillStyle = 'rgba(0,0,0,0)';
    ctx.fillRect(0, 0, size, size);
    ctx.fillStyle = '#00ffff';
    ctx.beginPath();
    ctx.moveTo(32, 8);
    ctx.lineTo(56, 24);
    ctx.lineTo(32, 56);
    ctx.lineTo(8, 24);
    ctx.fill();
    ctx.fillStyle = '#e0ffff';
    ctx.beginPath();
    ctx.moveTo(32, 8);
    ctx.lineTo(56, 24);
    ctx.lineTo(32, 32);
    ctx.lineTo(8, 24);
    ctx.fill();
  } else if (type === 'torch') {
    ctx.fillStyle = 'rgba(0,0,0,0)';
    ctx.fillRect(0, 0, size, size);
    // Stick
    ctx.fillStyle = '#8b5a2b';
    ctx.fillRect(28, 24, 8, 40);
    // Flame
    ctx.fillStyle = '#ffaa00';
    ctx.beginPath();
    ctx.moveTo(32, 4);
    ctx.lineTo(40, 24);
    ctx.lineTo(24, 24);
    ctx.fill();
    ctx.fillStyle = '#ffff00';
    ctx.beginPath();
    ctx.moveTo(32, 12);
    ctx.lineTo(36, 24);
    ctx.lineTo(28, 24);
    ctx.fill();
  } else if (type === 'flower') {
    ctx.fillStyle = 'rgba(0,0,0,0)';
    ctx.fillRect(0, 0, size, size);
    // Stem
    ctx.fillStyle = '#228b22';
    ctx.fillRect(30, 32, 4, 32);
    // Petals
    ctx.fillStyle = '#ff0000';
    ctx.beginPath();
    ctx.arc(32, 24, 12, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ffff00';
    ctx.beginPath();
    ctx.arc(32, 24, 4, 0, Math.PI * 2);
    ctx.fill();
  } else if (type === 'tnt') {
    ctx.fillStyle = '#ff3333';
    ctx.fillRect(0, 0, size, size);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 24, size, 16);
    ctx.fillStyle = '#000000';
    ctx.font = '12px Arial';
    ctx.fillText('TNT', 20, 36);
  } else if (type === 'slime') {
    ctx.fillStyle = 'rgba(50, 255, 50, 0.8)';
    ctx.fillRect(0, 0, size, size);
    ctx.fillStyle = 'rgba(20, 200, 20, 0.9)';
    ctx.fillRect(16, 16, 32, 32);
  } else if (type === 'jetpack') {
    ctx.fillStyle = '#888888';
    ctx.fillRect(16, 16, 32, 40);
    ctx.fillStyle = '#ffaa00';
    ctx.fillRect(24, 56, 16, 8);
  } else if (type === 'water') {
    ctx.fillStyle = 'rgba(0, 100, 255, 0.6)';
    ctx.fillRect(0, 0, size, size);
    // Add some wave lines
    ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
    for (let i = 0; i < 5; i++) {
      ctx.fillRect(Math.random() * size, Math.random() * size, Math.random() * 20 + 10, 2);
    }
    ctx.fillStyle = 'rgba(0, 50, 200, 0.3)';
    for (let i = 0; i < 5; i++) {
      ctx.fillRect(Math.random() * size, Math.random() * size, Math.random() * 20 + 10, 2);
    }
  } else if (type === 'nuke') {
    ctx.fillStyle = '#111111';
    ctx.fillRect(0, 0, size, size);
    ctx.fillStyle = '#ffff00';
    ctx.beginPath();
    ctx.arc(32, 32, 16, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#000000';
    ctx.beginPath();
    ctx.arc(32, 32, 8, 0, Math.PI * 2);
    ctx.fill();
  } else if (type === 'laser') {
    ctx.fillStyle = '#333333';
    ctx.fillRect(16, 24, 32, 16);
    ctx.fillStyle = '#ff0000';
    ctx.fillRect(48, 28, 16, 8);
  } else if (type === 'pig') {
    ctx.fillStyle = '#f5b5c8';
    ctx.fillRect(0, 0, size, size);
    ctx.fillStyle = '#e098ae';
    addNoise('#e098ae', 100, 4, 4);
    // Eyes (Cute)
    ctx.fillStyle = '#fff'; // Sclera
    ctx.fillRect(12, 24, 12, 12);
    ctx.fillRect(40, 24, 12, 12);
    ctx.fillStyle = '#000'; // Pupil
    ctx.fillRect(16, 28, 8, 8);
    ctx.fillRect(40, 28, 8, 8);
  } else if (type === 'pig_body') {
    ctx.fillStyle = '#f5b5c8';
    ctx.fillRect(0, 0, size, size);
    ctx.fillStyle = '#e098ae';
    addNoise('#e098ae', 100, 4, 4);
  } else if (type === 'cow') {
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, size, size);
    // Spots (Dark gray, not black)
    ctx.fillStyle = '#333';
    ctx.fillRect(8, 8, 16, 24);
    ctx.fillRect(40, 32, 16, 16);
    ctx.fillRect(24, 48, 16, 16);
    // Eyes (Cute)
    ctx.fillStyle = '#fff'; // Sclera
    ctx.fillRect(12, 24, 12, 12);
    ctx.fillRect(40, 24, 12, 12);
    ctx.fillStyle = '#000'; // Pupil
    ctx.fillRect(16, 28, 8, 8);
    ctx.fillRect(40, 28, 8, 8);
  } else if (type === 'cow_body') {
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, size, size);
    // Spots
    ctx.fillStyle = '#000';
    ctx.fillRect(8, 8, 16, 24);
    ctx.fillRect(40, 32, 16, 16);
    ctx.fillRect(24, 48, 16, 16);
  } else if (type === 'pig_snout') {
    ctx.fillStyle = '#d68a9f';
    ctx.fillRect(0, 0, size, size);
    ctx.fillStyle = '#8a4b5d';
    ctx.fillRect(16, 24, 8, 16);
    ctx.fillRect(40, 24, 8, 16);
  } else if (type === 'cow_snout') {
    ctx.fillStyle = '#e8b4b8';
    ctx.fillRect(0, 0, size, size);
    ctx.fillStyle = '#8a4b5d';
    ctx.fillRect(16, 24, 8, 16);
    ctx.fillRect(40, 24, 8, 16);
  }

  textureDataURIs[type] = canvas.toDataURL();

  const texture = new THREE.CanvasTexture(canvas);
  texture.magFilter = THREE.NearestFilter;
  texture.minFilter = THREE.NearestFilter;
  // Fix texture bleeding
  if (type === 'water') {
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
  } else {
    texture.wrapS = THREE.ClampToEdgeWrapping;
    texture.wrapT = THREE.ClampToEdgeWrapping;
  }
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
};

export const textures = {
  dirt: generateTexture('dirt'),
  grass: generateTexture('grass'),
  grass_top: generateTexture('grass_top'),
  snow: generateTexture('snow'),
  sand: generateTexture('sand'),
  stone: generateTexture('stone'),
  wood: generateTexture('wood'),
  leaves: generateTexture('leaves'),
  glass: generateTexture('glass'),
  iron_ore: generateTexture('iron_ore'),
  wheat_seeds: generateTexture('wheat_seeds'),
  wheat: generateTexture('wheat'),
  cactus: generateTexture('cactus'),
  crafting_table: generateTexture('crafting_table'),
  chest: generateTexture('chest'),
  npc: generateTexture('npc'),
  iron_pickaxe: generateTexture('iron_pickaxe'),
  wooden_axe: generateTexture('wooden_axe'),
  bread: generateTexture('bread'),
  diamond: generateTexture('diamond'),
  torch: generateTexture('torch'),
  flower: generateTexture('flower'),
  tnt: generateTexture('tnt'),
  slime: generateTexture('slime'),
  jetpack: generateTexture('jetpack'),
  water: generateTexture('water'),
  nuke: generateTexture('nuke'),
  laser: generateTexture('laser'),
  pig: generateTexture('pig'),
  pig_body: generateTexture('pig_body'),
  pig_snout: generateTexture('pig_snout'),
  cow: generateTexture('cow'),
  cow_body: generateTexture('cow_body'),
  cow_snout: generateTexture('cow_snout'),
};
