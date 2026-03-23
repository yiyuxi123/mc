import { useEffect, useRef, useState } from 'react';
import { useStore } from '../store/useStore';
import * as THREE from 'three';

export const MiniMap = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isEnlarged, setIsEnlarged] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;

    let frameCount = 0;

    const renderMap = () => {
      animationFrameId = requestAnimationFrame(renderMap);
      
      frameCount++;
      if (frameCount % 5 !== 0) return; // Render every 5 frames

      const state = useStore.getState();
      const visibleBlocks = state.visibleBlocks;
      const px = Math.round((window as any).playerPos?.x || 0);
      const pz = Math.round((window as any).playerPos?.z || 0);

      // Clear canvas
      ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      const radius = isEnlarged ? 40 : 20; // Blocks to show
      const cellSize = canvas.width / (radius * 2);

      // Find highest block at each x, z
      const heightMap: Record<string, { y: number, type: string }> = {};
      
      for (const key in visibleBlocks) {
        const block = visibleBlocks[key];
        const dx = block.pos[0] - px;
        const dz = block.pos[2] - pz;
        
        if (Math.abs(dx) <= radius && Math.abs(dz) <= radius) {
          const mapKey = `${dx},${dz}`;
          if (!heightMap[mapKey] || block.pos[1] > heightMap[mapKey].y) {
            heightMap[mapKey] = { y: block.pos[1], type: block.type };
          }
        }
      }

      // Draw blocks
      for (const mapKey in heightMap) {
        const [dxStr, dzStr] = mapKey.split(',');
        const dx = parseInt(dxStr);
        const dz = parseInt(dzStr);
        const { y, type } = heightMap[mapKey];

        // Color based on type
        let color = '#000';
        if (type === 'grass') color = '#41980a';
        else if (type === 'dirt') color = '#5c3a21';
        else if (type === 'stone') color = '#7d7d7d';
        else if (type === 'wood') color = '#5c4033';
        else if (type === 'leaves') color = '#2d5a27';
        else if (type === 'water') color = '#0064ff';
        else color = '#888';

        // Add shading based on height
        const shade = Math.max(0, Math.min(1, (y + 10) / 20));
        ctx.globalAlpha = 0.5 + shade * 0.5;
        ctx.fillStyle = color;
        ctx.fillRect((dx + radius) * cellSize, (dz + radius) * cellSize, cellSize, cellSize);
      }
      ctx.globalAlpha = 1.0;

      // Draw player
      ctx.fillStyle = '#ff0000';
      ctx.beginPath();
      ctx.arc(radius * cellSize, radius * cellSize, isEnlarged ? 4 : 3, 0, Math.PI * 2);
      ctx.fill();

      // Player direction
      const forward = new THREE.Vector3();
      if ((window as any).camera) {
        (window as any).camera.getWorldDirection(forward);
        ctx.strokeStyle = '#ff0000';
        ctx.beginPath();
        ctx.moveTo(radius * cellSize, radius * cellSize);
        ctx.lineTo(radius * cellSize + forward.x * (isEnlarged ? 15 : 10), radius * cellSize + forward.z * (isEnlarged ? 15 : 10));
        ctx.stroke();
      }
    };

    renderMap();

    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, [isEnlarged]);

  return (
    <div 
      className={`absolute top-4 right-4 rounded-full overflow-hidden border-4 border-zinc-800 shadow-2xl opacity-80 cursor-pointer transition-all duration-300 z-50 ${isEnlarged ? 'w-96 h-96' : 'w-48 h-48'}`}
      onClick={() => setIsEnlarged(!isEnlarged)}
    >
      <canvas ref={canvasRef} width={isEnlarged ? 384 : 192} height={isEnlarged ? 384 : 192} className="w-full h-full" />
    </div>
  );
};
