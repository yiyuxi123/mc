import { useFrame, useThree } from '@react-three/fiber';
import { useRef, useMemo } from 'react';
import * as THREE from 'three';
import { useStore } from '../store/useStore';

export const Weather = () => {
  const { camera } = useThree();
  const rainRef = useRef<THREE.Points>(null);
  const lightningRef = useRef<THREE.DirectionalLight>(null);
  
  const isRaining = useStore(state => state.isRaining);
  
  const particleCount = 10000;
  
  const [positions, velocities] = useMemo(() => {
    const pos = new Float32Array(particleCount * 3);
    const vel = new Float32Array(particleCount);
    for (let i = 0; i < particleCount; i++) {
      pos[i * 3] = (Math.random() - 0.5) * 100;
      pos[i * 3 + 1] = Math.random() * 100;
      pos[i * 3 + 2] = (Math.random() - 0.5) * 100;
      vel[i] = 0.5 + Math.random() * 0.5;
    }
    return [pos, vel];
  }, []);

  const rainMaterial = useMemo(() => new THREE.PointsMaterial({
    color: 0xaaaaaa,
    size: 0.1,
    transparent: true,
    opacity: 0.6,
  }), []);

  useFrame(() => {
    if (!isRaining) {
      if (rainRef.current) rainRef.current.visible = false;
      return;
    }
    
    if (rainRef.current) {
      rainRef.current.visible = true;
      const positions = rainRef.current.geometry.attributes.position.array as Float32Array;
      for (let i = 0; i < particleCount; i++) {
        positions[i * 3 + 1] -= velocities[i];
        if (positions[i * 3 + 1] < camera.position.y - 20) {
          positions[i * 3 + 1] = camera.position.y + 50;
          positions[i * 3] = camera.position.x + (Math.random() - 0.5) * 100;
          positions[i * 3 + 2] = camera.position.z + (Math.random() - 0.5) * 100;
        }
      }
      rainRef.current.geometry.attributes.position.needsUpdate = true;
    }
    
    if (lightningRef.current) {
      if (Math.random() < 0.002) {
        lightningRef.current.intensity = 5;
        import('../utils/sounds').then(m => m.playSound('explosion')); // Reuse explosion sound for thunder
      } else {
        lightningRef.current.intensity = Math.max(0, lightningRef.current.intensity - 0.5);
      }
    }
  });

  return (
    <>
      <points ref={rainRef}>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" count={particleCount} array={positions} itemSize={3} />
        </bufferGeometry>
        <primitive object={rainMaterial} attach="material" />
      </points>
      {isRaining && (
        <directionalLight ref={lightningRef} color="#ffffff" intensity={0} position={[0, 100, 0]} />
      )}
    </>
  );
};
