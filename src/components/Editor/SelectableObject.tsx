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

  // Windows need special rendering - glass panel with visible blue frame
  if (isWindow) {
    // Detect vertical window (on vertical wall): scale[0] < scale[2]
    const isVerticalWindow = obj.scale[0] < obj.scale[2];
    
    // Use actual dimensions from scale for proper frame positioning
    const width = isVerticalWindow ? obj.scale[2] : obj.scale[0];  // Width of window
    const height = obj.scale[1];
    const thickness = isVerticalWindow ? obj.scale[0] : obj.scale[2];
    
    // Frame dimensions (absolute, not scaled)
    const frameWidth = 0.08;
    const frameDepth = 0.06;
    
    if (isVerticalWindow) {
      // Vertical window (on left/right wall) - rotated 90 degrees
      return (
        <group position={obj.position} rotation={obj.rotation}>
          {/* Glass pane */}
          <mesh onClick={handleClick} name={id}>
            <boxGeometry args={[thickness, height, width]} />
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
          <mesh position={[0, height/2 - frameWidth/2, 0]}>
            <boxGeometry args={[frameDepth, frameWidth, width]} />
            <meshStandardMaterial color="#2196f3" roughness={0.5} />
          </mesh>
          {/* Frame - bottom */}
          <mesh position={[0, -height/2 + frameWidth/2, 0]}>
            <boxGeometry args={[frameDepth, frameWidth, width]} />
            <meshStandardMaterial color="#2196f3" roughness={0.5} />
          </mesh>
          {/* Frame - front */}
          <mesh position={[0, 0, width/2 - frameWidth/2]}>
            <boxGeometry args={[frameDepth, height - frameWidth*2, frameWidth]} />
            <meshStandardMaterial color="#2196f3" roughness={0.5} />
          </mesh>
          {/* Frame - back */}
          <mesh position={[0, 0, -width/2 + frameWidth/2]}>
            <boxGeometry args={[frameDepth, height - frameWidth*2, frameWidth]} />
            <meshStandardMaterial color="#2196f3" roughness={0.5} />
          </mesh>
        </group>
      );
    }
    
    // Horizontal window (on front/back wall)
    return (
      <group position={obj.position} rotation={obj.rotation}>
        {/* Glass pane */}
        <mesh onClick={handleClick} name={id}>
          <boxGeometry args={[width, height, thickness]} />
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
        <mesh position={[0, height/2 - frameWidth/2, 0]}>
          <boxGeometry args={[width, frameWidth, frameDepth]} />
          <meshStandardMaterial color="#2196f3" roughness={0.5} />
        </mesh>
        {/* Frame - bottom */}
        <mesh position={[0, -height/2 + frameWidth/2, 0]}>
          <boxGeometry args={[width, frameWidth, frameDepth]} />
          <meshStandardMaterial color="#2196f3" roughness={0.5} />
        </mesh>
        {/* Frame - left */}
        <mesh position={[-width/2 + frameWidth/2, 0, 0]}>
          <boxGeometry args={[frameWidth, height - frameWidth*2, frameDepth]} />
          <meshStandardMaterial color="#2196f3" roughness={0.5} />
        </mesh>
        {/* Frame - right */}
        <mesh position={[width/2 - frameWidth/2, 0, 0]}>
          <boxGeometry args={[frameWidth, height - frameWidth*2, frameDepth]} />
          <meshStandardMaterial color="#2196f3" roughness={0.5} />
        </mesh>
      </group>
    );
  }

  // Doors need a door panel with handle
  if (isDoor) {
    return (
      <group position={obj.position} rotation={obj.rotation} scale={obj.scale}>
        {/* Door panel */}
        <mesh ref={meshRef} onClick={handleClick} name={id}>
          <boxGeometry args={[1, 1, 0.05]} />
          <meshStandardMaterial
            color={obj.material.color}
            metalness={obj.material.metalness}
            roughness={obj.material.roughness}
            emissive={isSelected ? '#444400' : '#000000'}
            emissiveIntensity={isSelected ? 0.3 : 0}
          />
        </mesh>
        {/* Door handle */}
        <mesh position={[0.35, 0, 0.05]}>
          <cylinderGeometry args={[0.02, 0.02, 0.15, 8]} />
          <meshStandardMaterial color="#c0c0c0" metalness={0.8} roughness={0.2} />
        </mesh>
        <mesh position={[0.35, 0, 0.12]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.015, 0.015, 0.08, 8]} />
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
