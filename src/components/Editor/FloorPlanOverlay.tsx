import { useRef } from 'react';
import { useTexture } from '@react-three/drei';
import * as THREE from 'three';
import { useSceneStore } from '../../store/sceneStore';

export function FloorPlanOverlay() {
  const floorPlanUrl = useSceneStore((s) => s.floorPlanUrl);
  const floorPlanScale = useSceneStore((s) => s.floorPlanScale);
  const floorPlanOpacity = useSceneStore((s) => s.floorPlanOpacity);
  
  if (!floorPlanUrl) return null;
  
  return <FloorPlanMesh url={floorPlanUrl} scale={floorPlanScale} opacity={floorPlanOpacity} />;
}

function FloorPlanMesh({ url, scale, opacity }: { url: string; scale: number; opacity: number }) {
  const meshRef = useRef<THREE.Mesh>(null);
  const texture = useTexture(url);
  
  // Calculate aspect ratio (height / width)
  const img = texture.image as HTMLImageElement | undefined;
  const aspect = img ? img.height / img.width : 1;
  
  // Width = scale (in meters), Depth = scale * aspect
  // This matches the wall detection coordinate conversion
  const width = scale;
  const depth = scale * aspect;
  
  return (
    <mesh 
      ref={meshRef} 
      rotation={[-Math.PI / 2, 0, 0]} 
      position={[0, 0.01, 0]}
      receiveShadow
    >
      <planeGeometry args={[width, depth]} />
      <meshBasicMaterial 
        map={texture} 
        transparent 
        opacity={opacity}
        side={THREE.DoubleSide}
      />
    </mesh>
  );
}
