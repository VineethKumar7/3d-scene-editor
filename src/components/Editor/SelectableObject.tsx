import { useRef } from 'react';
import type { ThreeEvent } from '@react-three/fiber';
import * as THREE from 'three';
import type { SceneObject } from '../../store/sceneStore';
import { useSceneStore } from '../../store/sceneStore';

interface SelectableObjectProps {
  id: string;
}

export function SelectableObject({ id }: SelectableObjectProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  const obj = useSceneStore((s) => s.objectsById[id]);
  const selectedId = useSceneStore((s) => s.selectedId);
  const selectObject = useSceneStore((s) => s.selectObject);
  
  if (!obj) return null;
  
  const isSelected = selectedId === id;
  const isWindow = obj.type === 'window';
  const isDoor = obj.type === 'door';

  const handleClick = (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation();
    selectObject(id);
  };

  // Windows - simple rectangular glass with frame
  if (isWindow) {
    // Get dimensions from scale
    const scaleX = obj.scale[0];
    const scaleY = obj.scale[1];
    const scaleZ = obj.scale[2];
    
    // Detect orientation: if X is thin, it's on a vertical wall (left/right)
    const isVerticalWall = scaleX < scaleZ;
    
    // For vertical wall windows: rotate Y by 90° so the window faces the wall correctly
    const rotation: [number, number, number] = isVerticalWall 
      ? [obj.rotation[0], obj.rotation[1] + Math.PI / 2, obj.rotation[2]]
      : obj.rotation;
    
    // Window dimensions (always use the larger horizontal dimension as width)
    const windowWidth = isVerticalWall ? scaleZ : scaleX;
    const windowHeight = scaleY;
    const glassThickness = 0.02;
    
    // Frame dimensions
    const frameSize = 0.06;
    
    return (
      <group position={obj.position} rotation={rotation} name={id}>
        {/* Glass pane */}
        <mesh onClick={handleClick}>
          <boxGeometry args={[windowWidth, windowHeight, glassThickness]} />
          <meshPhysicalMaterial
            color="#4da6ff"
            metalness={0}
            roughness={0}
            transmission={0.7}
            transparent={true}
            opacity={0.5}
            side={THREE.DoubleSide}
            emissive={isSelected ? '#444400' : '#003366'}
            emissiveIntensity={isSelected ? 0.3 : 0.2}
          />
        </mesh>
        {/* Frame - top */}
        <mesh position={[0, windowHeight/2 - frameSize/2, 0]}>
          <boxGeometry args={[windowWidth, frameSize, frameSize]} />
          <meshStandardMaterial color="#2196f3" roughness={0.5} />
        </mesh>
        {/* Frame - bottom */}
        <mesh position={[0, -windowHeight/2 + frameSize/2, 0]}>
          <boxGeometry args={[windowWidth, frameSize, frameSize]} />
          <meshStandardMaterial color="#2196f3" roughness={0.5} />
        </mesh>
        {/* Frame - left */}
        <mesh position={[-windowWidth/2 + frameSize/2, 0, 0]}>
          <boxGeometry args={[frameSize, windowHeight - frameSize*2, frameSize]} />
          <meshStandardMaterial color="#2196f3" roughness={0.5} />
        </mesh>
        {/* Frame - right */}
        <mesh position={[windowWidth/2 - frameSize/2, 0, 0]}>
          <boxGeometry args={[frameSize, windowHeight - frameSize*2, frameSize]} />
          <meshStandardMaterial color="#2196f3" roughness={0.5} />
        </mesh>
      </group>
    );
  }

  // Doors - use scale values directly in geometry (not as transform)
  if (isDoor) {
    const doorHeight = obj.scale[1];
    const doorThickness = 0.08; // Fixed thickness for visibility
    
    // Detect if door is on vertical wall (same logic as windows)
    const isVerticalWall = obj.scale[0] < obj.scale[2];
    const rotation: [number, number, number] = isVerticalWall 
      ? [obj.rotation[0], obj.rotation[1] + Math.PI / 2, obj.rotation[2]]
      : obj.rotation;
    
    const width = isVerticalWall ? obj.scale[2] : obj.scale[0];
    
    return (
      <group position={obj.position} rotation={rotation} name={id}>
        {/* Door panel */}
        <mesh ref={meshRef} onClick={handleClick}>
          <boxGeometry args={[width, doorHeight, doorThickness]} />
          <meshStandardMaterial
            color={obj.material.color}
            metalness={obj.material.metalness}
            roughness={obj.material.roughness}
            emissive={isSelected ? '#444400' : '#000000'}
            emissiveIntensity={isSelected ? 0.3 : 0}
          />
        </mesh>
        {/* Door handle */}
        <mesh position={[width * 0.35, 0, doorThickness / 2 + 0.02]}>
          <cylinderGeometry args={[0.02, 0.02, 0.12, 8]} />
          <meshStandardMaterial color="#c0c0c0" metalness={0.8} roughness={0.2} />
        </mesh>
        <mesh position={[width * 0.35, 0, doorThickness / 2 + 0.06]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.015, 0.015, 0.06, 8]} />
          <meshStandardMaterial color="#c0c0c0" metalness={0.8} roughness={0.2} />
        </mesh>
      </group>
    );
  }

  return (
    <mesh
      ref={meshRef}
      position={obj.position}
      rotation={obj.rotation}
      scale={obj.scale}
      onClick={handleClick}
      name={id}
    >
      <ObjectGeometry type={obj.type} />
      <meshStandardMaterial
        color={obj.material.color}
        metalness={obj.material.metalness}
        roughness={obj.material.roughness}
        emissive={isSelected ? '#444400' : '#000000'}
        emissiveIntensity={isSelected ? 0.3 : 0}
      />
    </mesh>
  );
}

function ObjectGeometry({ type }: { type: SceneObject['type'] }) {
  switch (type) {
    // Primitives
    case 'box':
      return <boxGeometry args={[1, 1, 1]} />;
    case 'sphere':
      return <sphereGeometry args={[0.5, 32, 32]} />;
    case 'cylinder':
      return <cylinderGeometry args={[0.5, 0.5, 1, 32]} />;
    case 'plane':
      return <planeGeometry args={[1, 1]} />;
    case 'cone':
      return <coneGeometry args={[0.5, 1, 32]} />;
    
    // AEC Elements - all use box geometry, scaled via transform
    case 'wall':
    case 'column':
    case 'beam':
    case 'slab':
    case 'door':
    case 'window':
      return <boxGeometry args={[1, 1, 1]} />;
    
    default:
      return <boxGeometry args={[1, 1, 1]} />;
  }
}
