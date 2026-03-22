import { create } from 'zustand';
import { v4 as uuidv4 } from 'uuid';

// AEC-focused object types
export type ObjectType = 
  | 'box' | 'sphere' | 'cylinder' | 'plane' | 'cone'  // Primitives
  | 'wall' | 'column' | 'beam' | 'slab' | 'door' | 'window';  // AEC Elements

export interface SceneObject {
  id: string;
  type: ObjectType;
  name: string;
  position: [number, number, number];
  rotation: [number, number, number];
  scale: [number, number, number];
  material: {
    color: string;
    metalness: number;
    roughness: number;
  };
  // AEC-specific properties
  dimensions?: {
    width: number;
    height: number;
    depth: number;
  };
  layer?: string;
  locked?: boolean;
}

interface SceneState {
  objectIds: string[];
  objectsById: Record<string, SceneObject>;
  selectedId: string | null;
  
  // Grid & Snap settings
  snapEnabled: boolean;
  snapValue: number;
  
  // Layers
  layers: string[];
  activeLayer: string;
  
  // Floor plan reference
  floorPlanUrl: string | null;
  floorPlanScale: number;
  floorPlanOpacity: number;
  
  // Actions
  addObject: (type: ObjectType) => string;
  removeObject: (id: string) => void;
  selectObject: (id: string | null) => void;
  updateTransform: (id: string, transform: Partial<Pick<SceneObject, 'position' | 'rotation' | 'scale'>>) => void;
  updateMaterial: (id: string, material: Partial<SceneObject['material']>) => void;
  duplicateObject: (id: string) => string | null;
  getObject: (id: string) => SceneObject | undefined;
  setSnapEnabled: (enabled: boolean) => void;
  setSnapValue: (value: number) => void;
  setFloorPlan: (url: string | null) => void;
  setFloorPlanScale: (scale: number) => void;
  setFloorPlanOpacity: (opacity: number) => void;
  addWallFromDetection: (position: [number, number, number], scale: [number, number, number], rotation: [number, number, number]) => void;
  addDoorFromDetection: (position: [number, number, number], scale: [number, number, number], rotation: [number, number, number]) => void;
  addWindowFromDetection: (position: [number, number, number], scale: [number, number, number], rotation: [number, number, number]) => void;
  clearAllObjects: () => void;
}

const defaultMaterial = {
  color: '#ffffff',
  metalness: 0.1,
  roughness: 0.5,
};

// AEC-specific default materials
const aecMaterials: Partial<Record<ObjectType, typeof defaultMaterial>> = {
  wall: { color: '#e8e8e8', metalness: 0, roughness: 0.9 },
  column: { color: '#b0b0b0', metalness: 0.2, roughness: 0.6 },
  beam: { color: '#a0a0a0', metalness: 0.3, roughness: 0.5 },
  slab: { color: '#d0d0d0', metalness: 0, roughness: 0.8 },
  door: { color: '#8b4513', metalness: 0, roughness: 0.7 },
  window: { color: '#87ceeb', metalness: 0.5, roughness: 0.1 },
};

// Default dimensions for AEC elements (in meters)
const aecDimensions: Partial<Record<ObjectType, { width: number; height: number; depth: number }>> = {
  wall: { width: 3, height: 2.8, depth: 0.2 },
  column: { width: 0.4, height: 3, depth: 0.4 },
  beam: { width: 3, height: 0.4, depth: 0.3 },
  slab: { width: 4, height: 0.2, depth: 4 },
  door: { width: 0.9, height: 2.1, depth: 0.1 },
  window: { width: 1.2, height: 1.5, depth: 0.1 },
};

const objectNames: Record<ObjectType, string> = {
  box: 'Cube',
  sphere: 'Sphere',
  cylinder: 'Cylinder',
  plane: 'Plane',
  cone: 'Cone',
  wall: 'Wall',
  column: 'Column',
  beam: 'Beam',
  slab: 'Slab',
  door: 'Door',
  window: 'Window',
};

export const useSceneStore = create<SceneState>((set, get) => ({
  objectIds: [],
  objectsById: {},
  selectedId: null,
  snapEnabled: true,
  snapValue: 0.5, // 50cm grid snap
  layers: ['Default', 'Structural', 'Walls', 'Openings'],
  activeLayer: 'Default',
  floorPlanUrl: null,
  floorPlanScale: 10, // 10 meters default
  floorPlanOpacity: 0.7,

  addObject: (type) => {
    const id = uuidv4();
    const existingCount = Object.values(get().objectsById).filter(o => o.type === type).length;
    const name = `${objectNames[type]}${existingCount > 0 ? `.${existingCount + 1}` : ''}`;
    
    const isAecElement = ['wall', 'column', 'beam', 'slab', 'door', 'window'].includes(type);
    const dims = aecDimensions[type];
    
    const newObject: SceneObject = {
      id,
      type,
      name,
      position: [0, isAecElement && dims ? dims.height / 2 : 0.5, 0],
      rotation: [0, 0, 0],
      scale: dims ? [dims.width, dims.height, dims.depth] : [1, 1, 1],
      material: aecMaterials[type] || { ...defaultMaterial },
      dimensions: dims,
      layer: get().activeLayer,
      locked: false,
    };

    set((state) => ({
      objectIds: [...state.objectIds, id],
      objectsById: { ...state.objectsById, [id]: newObject },
      selectedId: id,
    }));

    return id;
  },

  removeObject: (id) => {
    const obj = get().objectsById[id];
    if (obj?.locked) return; // Can't delete locked objects
    
    set((state) => {
      const { [id]: _, ...rest } = state.objectsById;
      return {
        objectIds: state.objectIds.filter(oid => oid !== id),
        objectsById: rest,
        selectedId: state.selectedId === id ? null : state.selectedId,
      };
    });
  },

  selectObject: (id) => {
    set({ selectedId: id });
  },

  updateTransform: (id, transform) => {
    set((state) => {
      const obj = state.objectsById[id];
      if (!obj || obj.locked) return state;

      // Apply grid snapping if enabled
      let finalTransform = { ...transform };
      if (state.snapEnabled && transform.position) {
        const snap = state.snapValue;
        finalTransform.position = transform.position.map(v => 
          Math.round(v / snap) * snap
        ) as [number, number, number];
      }

      return {
        objectsById: {
          ...state.objectsById,
          [id]: { ...obj, ...finalTransform },
        },
      };
    });
  },

  updateMaterial: (id, material) => {
    set((state) => {
      const obj = state.objectsById[id];
      if (!obj) return state;

      return {
        objectsById: {
          ...state.objectsById,
          [id]: {
            ...obj,
            material: { ...obj.material, ...material },
          },
        },
      };
    });
  },

  duplicateObject: (id) => {
    const obj = get().objectsById[id];
    if (!obj) return null;

    const newId = uuidv4();
    const snap = get().snapValue;
    const newObject: SceneObject = {
      ...obj,
      id: newId,
      name: `${obj.name}.copy`,
      position: [obj.position[0] + snap * 2, obj.position[1], obj.position[2]],
      locked: false,
    };

    set((state) => ({
      objectIds: [...state.objectIds, newId],
      objectsById: { ...state.objectsById, [newId]: newObject },
      selectedId: newId,
    }));

    return newId;
  },

  getObject: (id) => get().objectsById[id],
  
  setSnapEnabled: (enabled) => set({ snapEnabled: enabled }),
  setSnapValue: (value) => set({ snapValue: value }),
  
  setFloorPlan: (url) => set({ floorPlanUrl: url }),
  setFloorPlanScale: (scale) => set({ floorPlanScale: scale }),
  setFloorPlanOpacity: (opacity) => set({ floorPlanOpacity: opacity }),
  
  addWallFromDetection: (position, scale, rotation) => {
    const id = uuidv4();
    const existingWalls = Object.values(get().objectsById).filter(o => o.type === 'wall').length;
    
    const newWall: SceneObject = {
      id,
      type: 'wall',
      name: `Wall.${existingWalls + 1}`,
      position,
      rotation,
      scale,
      material: { color: '#e8e8e8', metalness: 0, roughness: 0.9 },
      layer: 'Walls',
      locked: false,
    };

    set((state) => ({
      objectIds: [...state.objectIds, id],
      objectsById: { ...state.objectsById, [id]: newWall },
    }));
  },
  
  addDoorFromDetection: (position, scale, rotation) => {
    const id = uuidv4();
    const existingDoors = Object.values(get().objectsById).filter(o => o.type === 'door').length;
    
    const newDoor: SceneObject = {
      id,
      type: 'door',
      name: `Door.${existingDoors + 1}`,
      position,
      rotation,
      scale,
      material: { color: '#8b4513', metalness: 0, roughness: 0.7 },
      layer: 'Openings',
      locked: false,
    };

    set((state) => ({
      objectIds: [...state.objectIds, id],
      objectsById: { ...state.objectsById, [id]: newDoor },
    }));
  },
  
  addWindowFromDetection: (position, scale, rotation) => {
    const id = uuidv4();
    const existingWindows = Object.values(get().objectsById).filter(o => o.type === 'window').length;
    
    const newWindow: SceneObject = {
      id,
      type: 'window',
      name: `Window.${existingWindows + 1}`,
      position,
      rotation,
      scale,
      material: { color: '#87ceeb', metalness: 0.5, roughness: 0.1 },
      layer: 'Openings',
      locked: false,
    };

    set((state) => ({
      objectIds: [...state.objectIds, id],
      objectsById: { ...state.objectsById, [id]: newWindow },
    }));
  },
  
  clearAllObjects: () => {
    set({ objectIds: [], objectsById: {}, selectedId: null });
  },
}));
