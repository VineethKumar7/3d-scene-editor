import { Suspense } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import { Scene } from './Scene';
import { SelectableObject } from './SelectableObject';
import { TransformGizmo } from './TransformGizmo';
import { FloorPlanOverlay } from './FloorPlanOverlay';
import { useSceneStore } from '../../store/sceneStore';

function SceneContent() {
  const objectIds = useSceneStore((s) => s.objectIds);

  return (
    <>
      <Scene />
      
      {/* Floor plan reference image */}
      <FloorPlanOverlay />
      
      {/* Render all objects */}
      {objectIds.map((id) => (
        <SelectableObject key={id} id={id} />
      ))}
      
      {/* Transform controls for selected object */}
      <TransformGizmo />
      
      {/* Camera controls */}
      <OrbitControls makeDefault />
    </>
  );
}

export function Canvas3D() {
  const selectObject = useSceneStore((s) => s.selectObject);

  const handleMissedClick = () => {
    selectObject(null);
  };

  return (
    <div style={{ width: '100%', height: '100%' }}>
      <Canvas
        camera={{ position: [5, 5, 5], fov: 50 }}
        onPointerMissed={handleMissedClick}
        gl={{ antialias: true }}
      >
        <Suspense fallback={null}>
          <SceneContent />
        </Suspense>
      </Canvas>
    </div>
  );
}
