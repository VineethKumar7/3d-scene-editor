import { Grid } from '@react-three/drei';
import { useEditorStore } from '../../store/editorStore';

export function Scene() {
  const gridVisible = useEditorStore((s) => s.gridVisible);

  return (
    <>
      {/* Lighting */}
      <ambientLight intensity={0.5} />
      <directionalLight position={[10, 10, 5]} intensity={1} />
      <directionalLight position={[-10, 10, -5]} intensity={0.3} />
      <hemisphereLight intensity={0.3} />

      {/* Grid floor */}
      {gridVisible && (
        <Grid
          args={[20, 20]}
          cellSize={0.5}
          cellThickness={0.5}
          cellColor="#6e6e6e"
          sectionSize={2}
          sectionThickness={1}
          sectionColor="#9d4b4b"
          fadeDistance={30}
          fadeStrength={1}
          followCamera={false}
          position={[0, 0, 0]}
        />
      )}
    </>
  );
}
