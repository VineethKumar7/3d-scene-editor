import type { TransformMode } from '../../store/editorStore';
import { useEditorStore } from '../../store/editorStore';
import { useSceneStore } from '../../store/sceneStore';
import './Toolbar.css';

const modeButtons: { mode: TransformMode; icon: string; label: string; key: string }[] = [
  { mode: 'translate', icon: '↔️', label: 'Move', key: 'G' },
  { mode: 'rotate', icon: '🔄', label: 'Rotate', key: 'R' },
  { mode: 'scale', icon: '⤢', label: 'Scale', key: 'S' },
];

const snapValues = [0.1, 0.25, 0.5, 1.0];

export function Toolbar() {
  const mode = useEditorStore((s) => s.mode);
  const setMode = useEditorStore((s) => s.setMode);
  const gridVisible = useEditorStore((s) => s.gridVisible);
  const toggleGrid = useEditorStore((s) => s.toggleGrid);
  
  const snapEnabled = useSceneStore((s) => s.snapEnabled);
  const snapValue = useSceneStore((s) => s.snapValue);
  const setSnapEnabled = useSceneStore((s) => s.setSnapEnabled);
  const setSnapValue = useSceneStore((s) => s.setSnapValue);

  return (
    <div className="toolbar">
      <div className="toolbar-section">
        <span className="toolbar-title">🏗️ AEC Scene Editor</span>
      </div>

      <div className="toolbar-section mode-buttons">
        {modeButtons.map(({ mode: m, icon, label, key }) => (
          <button
            key={m}
            className={`mode-btn ${mode === m ? 'active' : ''}`}
            onClick={() => setMode(m)}
            title={`${label} (${key})`}
          >
            <span className="btn-icon">{icon}</span>
            <span className="btn-label">{label}</span>
            <span className="btn-key">{key}</span>
          </button>
        ))}
      </div>

      <div className="toolbar-section snap-section">
        <button
          className={`toggle-btn ${snapEnabled ? 'active' : ''}`}
          onClick={() => setSnapEnabled(!snapEnabled)}
          title="Toggle Grid Snap"
        >
          🧲 Snap
        </button>
        {snapEnabled && (
          <select 
            className="snap-select"
            value={snapValue}
            onChange={(e) => setSnapValue(parseFloat(e.target.value))}
          >
            {snapValues.map((v) => (
              <option key={v} value={v}>{v * 100}cm</option>
            ))}
          </select>
        )}
        <button
          className={`toggle-btn ${gridVisible ? 'active' : ''}`}
          onClick={toggleGrid}
          title="Toggle Grid"
        >
          #️⃣ Grid
        </button>
      </div>

      <div className="toolbar-section toolbar-right">
        <span className="keyboard-hints">
          Del: Delete | Ctrl+D: Duplicate | Esc: Deselect
        </span>
      </div>
    </div>
  );
}
