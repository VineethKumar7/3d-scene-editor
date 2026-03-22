# 3D Scene Editor for AEC (Architecture, Engineering, Construction)

A browser-based 3D scene editor built with React, Three.js, and TypeScript. Designed specifically for AEC workflows — upload a floor plan, auto-detect walls/doors/windows, and visualize in 3D.

![3D Scene Editor](https://img.shields.io/badge/React-19-blue) ![Three.js](https://img.shields.io/badge/Three.js-0.183-green) ![TypeScript](https://img.shields.io/badge/TypeScript-5.7-blue)

## ✨ Features

### Floor Plan Processing
- **Upload floor plans** (PNG, JPG, SVG) as reference overlays
- **Auto-detect walls** from dark lines in the image
- **Auto-detect doors** from brown/orange colored markers
- **Auto-detect windows** from blue colored markers
- Adjustable scale (meters) and opacity controls

### AEC Elements
| Element | Default Dimensions | Material |
|---------|-------------------|----------|
| Wall | 3m × 2.8m × 0.2m | Light gray, matte |
| Column | 0.4m × 3m × 0.4m | Gray, slight metallic |
| Beam | 3m × 0.4m × 0.3m | Gray, metallic |
| Slab | 4m × 0.2m × 4m | Light gray, matte |
| Door | 0.9m × 2.1m × 0.1m | Wood brown with handle |
| Window | 1.2m × 1.5m × 0.1m | Glass with frame |

### 3D Visualization
- **Windows**: Realistic glass material with transparency, visible from both sides, includes frame
- **Doors**: Wood panel with metallic door handle
- **Walls**: Standard architectural walls with proper thickness
- Real-time transform controls (Move, Rotate, Scale)
- Grid snapping (10cm, 25cm, 50cm, 1m options)

### Editor Features
- Hierarchy panel with scene tree
- Properties panel for transform and material editing
- Object selection with visual feedback
- Duplicate objects (Ctrl+D)
- Delete objects (Del key)
- Orbit camera controls

## 🛠️ Tech Stack

- **React 19** - UI framework
- **TypeScript 5.7** - Type safety
- **Three.js 0.183** - 3D rendering
- **React Three Fiber** - React renderer for Three.js
- **React Three Drei** - Useful helpers for R3F
- **Zustand** - State management
- **Vite** - Build tool and dev server

## 📦 Installation

```bash
# Clone the repository
git clone https://github.com/VineethKumar7/3d-scene-editor.git
cd 3d-scene-editor

# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build
```

## 🚀 Usage

### Basic Workflow

1. **Upload a Floor Plan**
   - Click "Upload Plan" in the Hierarchy panel
   - Select your floor plan image
   - Adjust scale (in meters) to match real-world dimensions

2. **Auto-Detect Elements**
   - Click "Auto-Detect Walls"
   - Walls, doors, and windows are automatically created
   - Fine-tune positions using transform tools

3. **Manual Editing**
   - Add AEC elements from the toolbar
   - Select objects to transform
   - Edit materials in the Properties panel

### Floor Plan Guidelines

For best auto-detection results:
- **Walls**: Draw as dark/black lines
- **Doors**: Mark with brown or orange color
- **Windows**: Mark with blue color
- Use solid colors, avoid gradients
- Recommended resolution: 1000-2000px

### Keyboard Shortcuts

| Key | Action |
|-----|--------|
| `G` | Move mode |
| `R` | Rotate mode |
| `S` | Scale mode |
| `Del` | Delete selected |
| `Ctrl+D` | Duplicate selected |
| `Esc` | Deselect |

## 📁 Project Structure

```
src/
├── components/
│   ├── Editor/
│   │   ├── Canvas3D.tsx       # Main 3D canvas
│   │   ├── Scene.tsx          # Scene setup (lights, grid)
│   │   ├── SelectableObject.tsx # 3D object rendering
│   │   ├── FloorPlanOverlay.tsx # Floor plan texture
│   │   └── TransformGizmo.tsx # Transform controls
│   ├── Panels/
│   │   ├── HierarchyPanel.tsx # Scene tree + floor plan upload
│   │   └── PropertiesPanel.tsx # Object properties editor
│   └── UI/
│       └── Toolbar.tsx        # Top toolbar
├── store/
│   └── sceneStore.ts          # Zustand state management
├── utils/
│   └── floorPlanDetector.ts   # Computer vision for wall detection
├── hooks/
│   └── useKeyboardShortcuts.ts
├── App.tsx
└── main.tsx
```

## 🔧 Configuration

### Grid Snap Values
Edit in `sceneStore.ts`:
```typescript
snapValue: 0.5, // Default: 50cm
```

### Wall Detection Threshold
Edit in `HierarchyPanel.tsx`:
```typescript
const detection = await detectWallsFromImage(floorPlanUrl, 80); // Darkness threshold 0-255
```

### Default Wall Height
Edit in `floorPlanDetector.ts`:
```typescript
const wallHeight = 2.8; // meters
```

## 🎯 Use Cases

- **Architects**: Quick 3D visualization from 2D plans
- **Interior Designers**: Space planning and layout
- **Real Estate**: Property visualization
- **Construction**: Site planning and coordination
- **Portfolio**: Showcase for AEC software skills

## 📝 API Reference

### SceneStore Actions

```typescript
// Add new object
addObject(type: ObjectType): string

// Transform object
updateTransform(id: string, transform: {
  position?: [number, number, number],
  rotation?: [number, number, number],
  scale?: [number, number, number]
}): void

// Update material
updateMaterial(id: string, material: {
  color?: string,
  metalness?: number,
  roughness?: number
}): void

// Floor plan detection
addWallFromDetection(position, scale, rotation): void
addDoorFromDetection(position, scale, rotation): void
addWindowFromDetection(position, scale, rotation): void
```

### Detection Functions

```typescript
// Detect elements from floor plan image
detectWallsFromImage(imageUrl: string, threshold?: number): Promise<DetectionResult>

// Convert to 3D coordinates
convertToSceneWalls(detection: DetectionResult, scaleMeters: number): SceneWall[]
convertOpeningsToScene(openings: DetectedOpening[], type: 'door' | 'window', ...): SceneOpening[]
```

## 🔮 Roadmap

- [ ] Export to glTF/GLB
- [ ] Import IFC files
- [ ] Multi-floor support
- [ ] Measurement tools
- [ ] Material library
- [ ] Undo/Redo system
- [ ] Collaborative editing

## 👤 Author

**Vineeth Kumar**
- GitHub: [@VineethKumar7](https://github.com/VineethKumar7)
- LinkedIn: [vineethkumar7](https://www.linkedin.com/in/vineethkumar7)

## 📄 License

This project is licensed under **CC BY-NC 4.0** (Creative Commons Attribution-NonCommercial 4.0 International).

[![License: CC BY-NC 4.0](https://img.shields.io/badge/License-CC%20BY--NC%204.0-lightgrey.svg)](https://creativecommons.org/licenses/by-nc/4.0/)

**You are free to:**
- ✅ Share — copy and redistribute in any medium
- ✅ Adapt — remix, transform, and build upon it

**Under these terms:**
- 📝 **Attribution** — Give credit, link to license, indicate changes
- 🚫 **NonCommercial** — No commercial use without permission

For commercial licensing, contact: k.vineeth26@gmail.com

---

*Built as a portfolio project demonstrating expertise in React, Three.js, TypeScript, and AEC domain knowledge.*
