import { useRef, useEffect } from 'react';
import { TransformControls } from '@react-three/drei';
import { useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { useSceneStore } from '../../store/sceneStore';
import { useEditorStore } from '../../store/editorStore';

export function TransformGizmo() {
  const transformRef = useRef<any>(null);
  const pivotRef = useRef<THREE.Object3D | null>(null);
  const meshRef = useRef<THREE.Object3D | null>(null);
  const isDraggingRef = useRef(false);
  const { scene } = useThree();
  
  const selectedId = useSceneStore((s) => s.selectedId);
  const selectedObj = useSceneStore((s) => s.selectedId ? s.objectsById[s.selectedId] : null);
  const updateTransform = useSceneStore((s) => s.updateTransform);
  const mode = useEditorStore((s) => s.mode);

  useEffect(() => {
    if (!transformRef.current || !selectedId || !selectedObj) return;

    const controls = transformRef.current;
    
    // Find the actual mesh
    meshRef.current = scene.getObjectByName(selectedId) as THREE.Object3D;
    
    // Create a pivot helper at stored position
    if (!pivotRef.current) {
      pivotRef.current = new THREE.Object3D();
      scene.add(pivotRef.current);
    }
    
    // Sync pivot to stored transform
    pivotRef.current.position.set(...selectedObj.position);
    pivotRef.current.rotation.set(...selectedObj.rotation);
    pivotRef.current.scale.set(...selectedObj.scale);
    
    controls.attach(pivotRef.current);

    const handleDraggingChanged = (event: { value: boolean }) => {
      isDraggingRef.current = event.value;
      
      if (!event.value && pivotRef.current) {
        // Drag ended - commit the pivot's transform to store
        const pivot = pivotRef.current;
        
        const transform: Partial<{ position: [number, number, number]; rotation: [number, number, number]; scale: [number, number, number] }> = {};
        
        if (mode === 'translate') {
          transform.position = pivot.position.toArray() as [number, number, number];
        } else if (mode === 'rotate') {
          transform.rotation = [pivot.rotation.x, pivot.rotation.y, pivot.rotation.z];
        } else if (mode === 'scale') {
          transform.scale = pivot.scale.toArray() as [number, number, number];
        }

        updateTransform(selectedId, transform);
      }
    };

    // Sync mesh position to pivot during drag for visual feedback
    const handleChange = () => {
      if (isDraggingRef.current && pivotRef.current && meshRef.current) {
        if (mode === 'translate') {
          meshRef.current.position.copy(pivotRef.current.position);
        } else if (mode === 'rotate') {
          meshRef.current.rotation.copy(pivotRef.current.rotation);
        } else if (mode === 'scale') {
          meshRef.current.scale.copy(pivotRef.current.scale);
        }
      }
    };

    controls.addEventListener('dragging-changed', handleDraggingChanged);
    controls.addEventListener('change', handleChange);

    return () => {
      controls.removeEventListener('dragging-changed', handleDraggingChanged);
      controls.removeEventListener('change', handleChange);
      controls.detach();
    };
  }, [selectedId, selectedObj, scene, mode, updateTransform]);

  // Cleanup pivot on unmount
  useEffect(() => {
    return () => {
      if (pivotRef.current) {
        scene.remove(pivotRef.current);
        pivotRef.current = null;
      }
    };
  }, [scene]);

  if (!selectedId) return null;

  return (
    <TransformControls
      ref={transformRef}
      mode={mode}
    />
  );
}
