import { useSceneStore } from '../../store/sceneStore';
import { useEditorStore } from '../../store/editorStore';
import './StatusBar.css';

export function StatusBar() {
  const objectCount = useSceneStore((s) => s.objectIds.length);
  const selectedObject = useSceneStore((s) => s.selectedId ? s.objectsById[s.selectedId] : null);
  const mode = useEditorStore((s) => s.mode);

  return (
    <div className="status-bar">
      <div className="status-left">
        <span className="status-item">
          {selectedObject ? (
            <>
              <span className="status-label">Selected:</span>
              <span className="status-value">{selectedObject.name}</span>
            </>
          ) : (
            <span className="status-hint">Click an object to select</span>
          )}
        </span>
      </div>

      <div className="status-center">
        <span className="status-item">
          <span className="status-label">Mode:</span>
          <span className={`mode-badge mode-${mode}`}>
            {mode.charAt(0).toUpperCase() + mode.slice(1)}
          </span>
        </span>
      </div>

      <div className="status-right">
        <span className="status-item">
          <span className="status-label">Objects:</span>
          <span className="status-value">{objectCount}</span>
        </span>
      </div>
    </div>
  );
}
