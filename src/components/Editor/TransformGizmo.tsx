import { useRef, useEffect } from 'react';
import { TransformControls } from '@react-three/drei';
import { useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { useSceneStore } from '../../store/sceneStore';
import { useEditorStore } from '../../store/editorStore';

export function TransformGizmo() {
  const transformRef = useRef<any>(null);
  const { scene } = useThree();
  
  const selectedId = useSceneStore((s) => s.selectedId);
  const updateTransform = useSceneStore((s) => s.updateTransform);
  const mode = useEditorStore((s) => s.mode);

  useEffect(() => {
    if (!transformRef.current || !selectedId) return;

    const selectedMesh = scene.getObjectByName(selectedId) as THREE.Mesh;
    if (selectedMesh) {
      transformRef.current.attach(selectedMesh);
    }

    return () => {
      if (transformRef.current) {
        transformRef.current.detach();
      }
    };
  }, [selectedId, scene]);

  const handleChange = () => {
    if (!transformRef.current || !selectedId) return;

    const object = transformRef.current.object as THREE.Object3D;
    if (!object) return;

    updateTransform(selectedId, {
      position: object.position.toArray() as [number, number, number],
      rotation: [object.rotation.x, object.rotation.y, object.rotation.z],
      scale: object.scale.toArray() as [number, number, number],
    });
  };

  if (!selectedId) return null;

  return (
    <TransformControls
      ref={transformRef}
      mode={mode}
      onObjectChange={handleChange}
    />
  );
}
