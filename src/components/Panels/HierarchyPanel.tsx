import { useRef, useState } from 'react';
import type { ObjectType } from '../../store/sceneStore';
import { useSceneStore } from '../../store/sceneStore';
import { detectWallsFromImage, convertToSceneWalls, convertOpeningsToScene } from '../../utils/floorPlanDetector';
import './HierarchyPanel.css';

const objectIcons: Record<ObjectType, string> = {
  // Primitives
  box: '🔲',
  sphere: '🔴',
  cylinder: '🔷',
  plane: '▭',
  cone: '🔺',
  // AEC Elements
  wall: '🧱',
  column: '🏛️',
  beam: '📏',
  slab: '⬜',
  door: '🚪',
  window: '🪟',
};

const primitiveTypes: ObjectType[] = ['box', 'sphere', 'cylinder', 'plane', 'cone'];
const aecTypes: ObjectType[] = ['wall', 'column', 'beam', 'slab', 'door', 'window'];

function ObjectItem({ id }: { id: string }) {
  const obj = useSceneStore((s) => s.objectsById[id]);
  const selectedId = useSceneStore((s) => s.selectedId);
  const selectObject = useSceneStore((s) => s.selectObject);
  const removeObject = useSceneStore((s) => s.removeObject);

  if (!obj) return null;

  return (
    <div
      className={`tree-item ${selectedId === id ? 'selected' : ''} ${obj.locked ? 'locked' : ''}`}
      onClick={() => selectObject(id)}
    >
      <span className="tree-indent">├─</span>
      <span className="object-icon">{objectIcons[obj.type]}</span>
      <span className="object-name">{obj.name}</span>
      {obj.locked && <span className="lock-icon">🔒</span>}
      {!obj.locked && (
        <button
          className="delete-btn"
          onClick={(e) => {
            e.stopPropagation();
            removeObject(id);
          }}
        >
          ×
        </button>
      )}
    </div>
  );
}

function FloorPlanUpload() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDetecting, setIsDetecting] = useState(false);
  const [detectionStatus, setDetectionStatus] = useState<string | null>(null);
  
  const floorPlanUrl = useSceneStore((s) => s.floorPlanUrl);
  const floorPlanScale = useSceneStore((s) => s.floorPlanScale);
  const floorPlanOpacity = useSceneStore((s) => s.floorPlanOpacity);
  const setFloorPlan = useSceneStore((s) => s.setFloorPlan);
  const setFloorPlanScale = useSceneStore((s) => s.setFloorPlanScale);
  const setFloorPlanOpacity = useSceneStore((s) => s.setFloorPlanOpacity);
  const addWallFromDetection = useSceneStore((s) => s.addWallFromDetection);
  const addDoorFromDetection = useSceneStore((s) => s.addDoorFromDetection);
  const addWindowFromDetection = useSceneStore((s) => s.addWindowFromDetection);
  const clearAllObjects = useSceneStore((s) => s.clearAllObjects);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const url = URL.createObjectURL(file);
      setFloorPlan(url);
      setDetectionStatus(null);
    }
  };

  const handleDetectWalls = async () => {
    if (!floorPlanUrl) return;
    
    setIsDetecting(true);
    setDetectionStatus('Analyzing floor plan...');
    
    try {
      const detection = await detectWallsFromImage(floorPlanUrl, 80);
      
      const sceneWalls = convertToSceneWalls(detection, floorPlanScale);
      const sceneDoors = convertOpeningsToScene(detection.doors, 'door', detection, floorPlanScale);
      const sceneWindows = convertOpeningsToScene(detection.windows, 'window', detection, floorPlanScale);
      
      // Clear existing objects
      clearAllObjects();
      
      // Add walls
      for (const wall of sceneWalls) {
        addWallFromDetection(wall.position, wall.scale, wall.rotation);
      }
      
      // Add doors
      for (const door of sceneDoors) {
        addDoorFromDetection(door.position, door.scale, door.rotation);
      }
      
      // Add windows
      for (const window of sceneWindows) {
        addWindowFromDetection(window.position, window.scale, window.rotation);
      }
      
      setDetectionStatus(`✅ ${sceneWalls.length} walls, ${sceneDoors.length} doors, ${sceneWindows.length} windows`);
    } catch (error) {
      setDetectionStatus(`❌ Detection failed: ${error}`);
    } finally {
      setIsDetecting(false);
    }
  };

  return (
    <div className="floor-plan-section">
      <div className="section-header">📐 Floor Plan</div>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileChange}
        style={{ display: 'none' }}
      />
      {!floorPlanUrl ? (
        <button 
          className="add-btn upload-btn"
          onClick={() => fileInputRef.current?.click()}
        >
          📤 Upload Plan
        </button>
      ) : (
        <div className="floor-plan-controls">
          <div className="control-row">
            <label>Scale (m)</label>
            <input
              type="number"
              min="1"
              max="100"
              value={floorPlanScale}
              onChange={(e) => setFloorPlanScale(parseFloat(e.target.value) || 10)}
            />
          </div>
          <div className="control-row">
            <label>Opacity</label>
            <input
              type="range"
              min="0.1"
              max="1"
              step="0.1"
              value={floorPlanOpacity}
              onChange={(e) => setFloorPlanOpacity(parseFloat(e.target.value))}
            />
          </div>
          
          {/* Auto-detect button */}
          <button 
            className="add-btn detect-btn"
            onClick={handleDetectWalls}
            disabled={isDetecting}
          >
            {isDetecting ? '⏳ Detecting...' : '🔍 Auto-Detect Walls'}
          </button>
          
          {detectionStatus && (
            <div className="detection-status">{detectionStatus}</div>
          )}
          
          <button 
            className="add-btn remove-btn"
            onClick={() => setFloorPlan(null)}
          >
            ✕ Remove
          </button>
        </div>
      )}
    </div>
  );
}

export function HierarchyPanel() {
  const objectIds = useSceneStore((s) => s.objectIds);
  const addObject = useSceneStore((s) => s.addObject);

  return (
    <div className="hierarchy-panel">
      <h3>📦 Hierarchy</h3>
      
      {/* Floor Plan Upload */}
      <FloorPlanUpload />
      
      <div className="scene-tree">
        <div className="tree-header">▼ Scene</div>
        {objectIds.length === 0 ? (
          <div className="empty-state">No objects in scene</div>
        ) : (
          objectIds.map((id) => <ObjectItem key={id} id={id} />)
        )}
      </div>

      {/* AEC Elements */}
      <div className="add-object-section">
        <div className="section-header">🏗️ AEC Elements</div>
        <div className="object-buttons">
          {aecTypes.map((type) => (
            <button
              key={type}
              className="add-btn aec-btn"
              onClick={() => addObject(type)}
              title={`Add ${type}`}
            >
              {objectIcons[type]} {type.charAt(0).toUpperCase() + type.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Primitives */}
      <div className="add-object-section">
        <div className="section-header">+ Primitives</div>
        <div className="object-buttons">
          {primitiveTypes.map((type) => (
            <button
              key={type}
              className="add-btn"
              onClick={() => addObject(type)}
              title={`Add ${type}`}
            >
              {objectIcons[type]} {type.charAt(0).toUpperCase() + type.slice(1)}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
