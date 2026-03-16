import * as THREE from 'three';

const generateTexture = (type: string) => {
  const canvas = document.createElement('canvas');
  canvas.width = 16;
  canvas.height = 16;
  const ctx = canvas.getContext('2d');
  if (!ctx) return new THREE.Texture();

  if (type === 'dirt') {
    ctx.fillStyle = '#5c3a21';
    ctx.fillRect(0, 0, 16, 16);
    ctx.fillStyle = '#4a2f1b';
    for (let i = 0; i < 20; i++) {
      ctx.fillRect(Math.random() * 16, Math.random() * 16, 1, 1);
    }
  } else if (type === 'grass') {
    ctx.fillStyle = '#5c3a21';
    ctx.fillRect(0, 0, 16, 16);
    ctx.fillStyle = '#41980a';
    ctx.fillRect(0, 0, 16, 4);
    for (let i = 0; i < 10; i++) {
      ctx.fillRect(Math.random() * 16, Math.random() * 4, 1, 1);
    }
  } else if (type === 'stone') {
    ctx.fillStyle = '#7d7d7d';
    ctx.fillRect(0, 0, 16, 16);
    ctx.fillStyle = '#636363';
    for (let i = 0; i < 30; i++) {
      ctx.fillRect(Math.random() * 16, Math.random() * 16, 2, 2);
    }
  } else if (type === 'wood') {
    ctx.fillStyle = '#5c4033';
    ctx.fillRect(0, 0, 16, 16);
    ctx.fillStyle = '#4a332a';
    for (let i = 0; i < 16; i += 2) {
      ctx.fillRect(0, i, 16, 1);
    }
  } else if (type === 'leaves') {
    ctx.fillStyle = '#2d5a27';
    ctx.fillRect(0, 0, 16, 16);
    ctx.fillStyle = '#1e3f1a';
    for (let i = 0; i < 40; i++) {
      ctx.fillRect(Math.random() * 16, Math.random() * 16, 2, 2);
    }
  } else if (type === 'glass') {
    ctx.fillStyle = 'rgba(173, 216, 230, 0.5)';
    ctx.fillRect(0, 0, 16, 16);
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)';
    ctx.lineWidth = 1;
    ctx.strokeRect(0, 0, 16, 16);
  } else if (type === 'iron_ore') {
    ctx.fillStyle = '#7d7d7d';
    ctx.fillRect(0, 0, 16, 16);
    ctx.fillStyle = '#d8af93';
    for (let i = 0; i < 15; i++) {
      ctx.fillRect(Math.random() * 16, Math.random() * 16, 2, 2);
    }
  } else if (type === 'wheat_seeds') {
    ctx.fillStyle = '#5c3a21'; // dirt background
    ctx.fillRect(0, 0, 16, 16);
    ctx.fillStyle = '#e2c044';
    for (let i = 0; i < 5; i++) {
      ctx.fillRect(Math.random() * 16, Math.random() * 16, 1, 1);
    }
  } else if (type === 'wheat') {
    ctx.fillStyle = '#5c3a21'; // dirt background
    ctx.fillRect(0, 0, 16, 16);
    ctx.fillStyle = '#e2c044';
    ctx.fillRect(4, 0, 2, 16);
    ctx.fillRect(10, 0, 2, 16);
  } else if (type === 'chest') {
    ctx.fillStyle = '#8b5a2b';
    ctx.fillRect(0, 0, 16, 16);
    ctx.strokeStyle = '#3e2723';
    ctx.lineWidth = 2;
    ctx.strokeRect(0, 0, 16, 16);
    ctx.fillStyle = 'silver';
    ctx.fillRect(6, 6, 4, 4);
  } else if (type === 'npc') {
    ctx.fillStyle = '#9c27b0';
    ctx.fillRect(0, 0, 16, 16);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(4, 4, 2, 2);
    ctx.fillRect(10, 4, 2, 2);
    ctx.fillRect(6, 10, 4, 2);
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.magFilter = THREE.NearestFilter;
  texture.minFilter = THREE.NearestFilter;
  return texture;
};

export const textures = {
  dirt: generateTexture('dirt'),
  grass: generateTexture('grass'),
  stone: generateTexture('stone'),
  wood: generateTexture('wood'),
  leaves: generateTexture('leaves'),
  glass: generateTexture('glass'),
  iron_ore: generateTexture('iron_ore'),
  wheat_seeds: generateTexture('wheat_seeds'),
  wheat: generateTexture('wheat'),
  chest: generateTexture('chest'),
  npc: generateTexture('npc'),
};
