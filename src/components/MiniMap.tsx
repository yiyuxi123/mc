import { useEffect, useRef } from 'react';
import { useStore } from '../store/useStore';
import * as THREE from 'three';

export const MiniMap = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

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
      const blocks = state.blocks;
      const px = Math.round((window as any).playerPos?.x || 0);
      const pz = Math.round((window as any).playerPos?.z || 0);

      // Clear canvas
      ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      const radius = 20; // Blocks to show
      const cellSize = canvas.width / (radius * 2);

      // Draw blocks
      for (let x = -radius; x <= radius; x++) {
        for (let z = -radius; z <= radius; z++) {
          // Find highest block at x, z
          let highestY = -100;
          let blockType = '';
          
          // Simple scan from top down
          for (let y = 20; y >= -10; y--) {
            const block = blocks[`${px + x},${y},${pz + z}`];
            if (block) {
              highestY = y;
              blockType = block.type;
              break;
            }
          }

          if (blockType) {
            // Color based on type
            let color = '#000';
            if (blockType === 'grass') color = '#41980a';
            else if (blockType === 'dirt') color = '#5c3a21';
            else if (blockType === 'stone') color = '#7d7d7d';
            else if (blockType === 'wood') color = '#5c4033';
            else if (blockType === 'leaves') color = '#2d5a27';
            else if (blockType === 'water') color = '#0064ff';
            else color = '#888';

            // Add shading based on height
            const shade = Math.max(0, Math.min(1, (highestY + 10) / 20));
            ctx.globalAlpha = 0.5 + shade * 0.5;
            ctx.fillStyle = color;
            ctx.fillRect((x + radius) * cellSize, (z + radius) * cellSize, cellSize, cellSize);
            ctx.globalAlpha = 1.0;
          }
        }
      }

      // Draw player
      ctx.fillStyle = '#ff0000';
      ctx.beginPath();
      ctx.arc(radius * cellSize, radius * cellSize, 3, 0, Math.PI * 2);
      ctx.fill();

      // Player direction
      const forward = new THREE.Vector3();
      if ((window as any).camera) {
        (window as any).camera.getWorldDirection(forward);
        ctx.strokeStyle = '#ff0000';
        ctx.beginPath();
        ctx.moveTo(radius * cellSize, radius * cellSize);
        ctx.lineTo(radius * cellSize + forward.x * 10, radius * cellSize + forward.z * 10);
        ctx.stroke();
      }
    };

    renderMap();

    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return (
    <div className="absolute top-4 right-4 w-48 h-48 rounded-full overflow-hidden border-4 border-zinc-800 shadow-2xl pointer-events-none opacity-80">
      <canvas ref={canvasRef} width={192} height={192} className="w-full h-full" />
    </div>
  );
};
