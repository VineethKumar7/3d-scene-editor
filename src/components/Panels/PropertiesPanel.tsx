import { useSceneStore } from '../../store/sceneStore';
import './PropertiesPanel.css';

export function PropertiesPanel() {
  const selectedId = useSceneStore((s) => s.selectedId);
  const selectedObject = useSceneStore((s) => s.selectedId ? s.objectsById[s.selectedId] : null);
  const updateTransform = useSceneStore((s) => s.updateTransform);
  const updateMaterial = useSceneStore((s) => s.updateMaterial);

  if (!selectedObject || !selectedId) {
    return (
      <div className="properties-panel">
        <h3>📋 Properties</h3>
        <div className="empty-state">Select an object to edit</div>
      </div>
    );
  }

  const handlePositionChange = (axis: number, value: string) => {
    const newPos = [...selectedObject.position] as [number, number, number];
    newPos[axis] = parseFloat(value) || 0;
    updateTransform(selectedId, { position: newPos });
  };

  const handleRotationChange = (axis: number, value: string) => {
    const newRot = [...selectedObject.rotation] as [number, number, number];
    // Convert degrees to radians for storage
    newRot[axis] = ((parseFloat(value) || 0) * Math.PI) / 180;
    updateTransform(selectedId, { rotation: newRot });
  };

  const handleScaleChange = (axis: number, value: string) => {
    const newScale = [...selectedObject.scale] as [number, number, number];
    newScale[axis] = parseFloat(value) || 1;
    updateTransform(selectedId, { scale: newScale });
  };

  const toDegrees = (rad: number) => ((rad * 180) / Math.PI).toFixed(1);

  return (
    <div className="properties-panel">
      <h3>📋 Properties</h3>
      
      <div className="object-info">
        <span className="object-type">{selectedObject.type}</span>
        <span className="object-name">{selectedObject.name}</span>
      </div>

      {/* Transform Section */}
      <div className="property-section">
        <div className="section-title">Transform</div>
        
        <div className="property-group">
          <label>Position</label>
          <div className="xyz-inputs">
            {['X', 'Y', 'Z'].map((axis, i) => (
              <div key={axis} className="input-row">
                <span className={`axis-label axis-${axis.toLowerCase()}`}>{axis}</span>
                <input
                  type="number"
                  step="0.1"
                  value={selectedObject.position[i].toFixed(2)}
                  onChange={(e) => handlePositionChange(i, e.target.value)}
                />
              </div>
            ))}
          </div>
        </div>

        <div className="property-group">
          <label>Rotation (°)</label>
          <div className="xyz-inputs">
            {['X', 'Y', 'Z'].map((axis, i) => (
              <div key={axis} className="input-row">
                <span className={`axis-label axis-${axis.toLowerCase()}`}>{axis}</span>
                <input
                  type="number"
                  step="15"
                  value={toDegrees(selectedObject.rotation[i])}
                  onChange={(e) => handleRotationChange(i, e.target.value)}
                />
              </div>
            ))}
          </div>
        </div>

        <div className="property-group">
          <label>Scale</label>
          <div className="xyz-inputs">
            {['X', 'Y', 'Z'].map((axis, i) => (
              <div key={axis} className="input-row">
                <span className={`axis-label axis-${axis.toLowerCase()}`}>{axis}</span>
                <input
                  type="number"
                  step="0.1"
                  min="0.01"
                  value={selectedObject.scale[i].toFixed(2)}
                  onChange={(e) => handleScaleChange(i, e.target.value)}
                />
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Material Section */}
      <div className="property-section">
        <div className="section-title">🎨 Material</div>
        
        <div className="property-group">
          <label>Color</label>
          <div className="color-input">
            <input
              type="color"
              value={selectedObject.material.color}
              onChange={(e) => updateMaterial(selectedId, { color: e.target.value })}
            />
            <span>{selectedObject.material.color}</span>
          </div>
        </div>

        <div className="property-group">
          <label>Metalness</label>
          <input
            type="range"
            min="0"
            max="1"
            step="0.01"
            value={selectedObject.material.metalness}
            onChange={(e) => updateMaterial(selectedId, { metalness: parseFloat(e.target.value) })}
          />
          <span className="slider-value">{selectedObject.material.metalness.toFixed(2)}</span>
        </div>

        <div className="property-group">
          <label>Roughness</label>
          <input
            type="range"
            min="0"
            max="1"
            step="0.01"
            value={selectedObject.material.roughness}
            onChange={(e) => updateMaterial(selectedId, { roughness: parseFloat(e.target.value) })}
          />
          <span className="slider-value">{selectedObject.material.roughness.toFixed(2)}</span>
        </div>
      </div>
    </div>
  );
}
