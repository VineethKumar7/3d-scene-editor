import { useEffect } from 'react';
import { useEditorStore } from '../store/editorStore';
import { useSceneStore } from '../store/sceneStore';

export function useKeyboard() {
  const setMode = useEditorStore((s) => s.setMode);
  const selectedId = useSceneStore((s) => s.selectedId);
  const removeObject = useSceneStore((s) => s.removeObject);
  const duplicateObject = useSceneStore((s) => s.duplicateObject);
  const selectObject = useSceneStore((s) => s.selectObject);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if typing in input
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      switch (e.key.toLowerCase()) {
        case 'g':
          setMode('translate');
          break;
        case 'r':
          setMode('rotate');
          break;
        case 's':
          if (!e.ctrlKey && !e.metaKey) {
            setMode('scale');
          }
          break;
        case 'delete':
        case 'backspace':
          if (selectedId) {
            removeObject(selectedId);
          }
          break;
        case 'd':
          if ((e.ctrlKey || e.metaKey) && selectedId) {
            e.preventDefault();
            duplicateObject(selectedId);
          }
          break;
        case 'escape':
          selectObject(null);
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [setMode, selectedId, removeObject, duplicateObject, selectObject]);
}
