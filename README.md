# 3D Scene Editor for AEC (Architecture, Engineering, Construction)

A browser-based 3D scene editor built with React, Three.js, and TypeScript. Designed specifically for AEC workflows — upload a floor plan, auto-detect walls/doors/windows, and visualize in 3D.

![3D Scene Editor](https://img.shields.io/badge/React-19-blue) ![Three.js](https://img.shields.io/badge/Three.js-0.183-green) ![TypeScript](https://img.shields.io/badge/TypeScript-5.7-blue)

## ✨ Features

### Demo

| Add Elements | Transform Controls |
|:------------:|:------------------:|
| ![Add Elements](assets/add-elements.gif?v=2) | ![Transform Controls](assets/transform-controls.gif?v=2) |

| Grid Snapping | Floor Plan Upload |
|:-------------:|:-----------------:|
| ![Grid Snapping](assets/grid-snapping.gif?v=2) | ![Floor Plan Upload](assets/floor-plan-upload.gif?v=2) |

### Floor Plan Processing
- **Upload floor plans** (PNG, JPG, SVG) as reference overlays
- **Auto-detect walls** from dark lines using computer vision
- **Auto-detect doors** from brown/beige colored markers (external doors)
- **Auto-detect windows** from cyan/blue colored markers
- **Smart positioning**: Doors placed on exterior wall surface, windows on interior
- Adjustable scale (meters) and opacity controls
- Real-time detection status feedback

### AEC Elements
| Element | Default Dimensions | Material |
|---------|-------------------|----------|
| Wall | Auto-detected × 2.8m × 0.2m | Light gray, matte |
| Column | 0.4m × 3m × 0.4m | Gray, slight metallic |
| Beam | 3m × 0.4m × 0.3m | Gray, metallic |
| Slab | 4m × 0.2m × 4m | Light gray, matte |
| Door | 0.8m+ × 2.1m × 0.08m | Wood brown (#8B4513) with handle |
| Window | 0.4m+ × 1.2m × 0.02m | Glass blue (#4DA6FF) with frame |

### 3D Visualization
- **Windows**: 
  - Realistic glass material with 70% transmission
  - Blue frame (#2196F3) on all four sides
  - Proper orientation for horizontal and vertical walls
  - Positioned on interior wall surface
- **Doors**: 
  - Wood panel with metallic door handle
  - Positioned on exterior wall surface (visible from outside)
  - Proper height (2.1m standard)
- **Walls**: 
  - Standard architectural walls (2.8m height, 0.2m thickness)
  - Automatic detection and placement from floor plan
- Real-time transform controls (Move, Rotate, Scale)
- Grid snapping (10cm, 25cm, 50cm, 1m options)
- Pivot-based transform system for reliable object manipulation

### Editor Features
- Hierarchy panel with scene tree
- Properties panel for transform and material editing
- Object selection with visual feedback (yellow emission)
- Duplicate objects (Ctrl+D)
- Delete objects (Del key)
- Orbit camera controls (rotate, pan, zoom)
- Floor plan overlay with adjustable opacity

## 🛠️ Tech Stack

- **React 19** - UI framework
- **TypeScript 5.7** - Type safety
- **Three.js 0.183** - 3D rendering
- **React Three Fiber** - React renderer for Three.js
- **React Three Drei** - Useful helpers (TransformControls, Grid, etc.)
- **Zustand** - State management
- **Vite 8** - Build tool and dev server

## 📦 Installation

### Quick Start (Recommended)

**Linux / macOS:**
```bash
git clone https://github.com/VineethKumar7/3d-scene-editor.git
cd 3d-scene-editor
./start.sh          # Installs deps + starts server
# Open http://localhost:5173
./stop.sh           # Stop the server
```

**Windows:**
```cmd
git clone https://github.com/VineethKumar7/3d-scene-editor.git
cd 3d-scene-editor
start.bat           # Installs deps + starts server
# Open http://localhost:5173
stop.bat            # Stop the server (or Ctrl+C)
```

### Manual Installation

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

### Requirements

- **Node.js** 18+ (LTS recommended)
- **npm** 8+

## 🧪 Testing

```bash
# Run floor plan detection test
npx ts-node scripts/test-detection.ts

# Run 3D output validation
npx ts-node scripts/test-3d-output.ts

# Run visibility validation
npx ts-node scripts/validate-visibility.ts
```

## 🚀 Usage

### Basic Workflow

1. **Upload a Floor Plan**
   - Click "Upload Plan" in the Hierarchy panel
   - Select your floor plan image (PNG/JPG recommended)
   - Adjust scale (in meters) to match real-world dimensions

2. **Auto-Detect Elements**
   - Click "Auto-Detect Walls"
   - Walls, doors, and windows are automatically created
   - Status shows count: "8 walls, 1 doors, 4 windows"

3. **Manual Editing**
   - Add AEC elements from the toolbar
   - Select objects to transform (Move/Rotate/Scale)
   - Edit materials in the Properties panel

### Floor Plan Color Guidelines

For best auto-detection results:

| Element | Color | RGB Values |
|---------|-------|------------|
| **Walls** | Black/Dark gray | R,G,B < 80 |
| **Windows** | Cyan/Sky blue | B > 180, G > 130, R < 120 |
| **Doors (beige)** | Light cream | R > 240, G > 220, B > 200 |
| **Doors (brown)** | Dark brown | R: 80-180, G: 40-130, B < 80 |

**Tips:**
- Use solid colors, avoid gradients
- Recommended resolution: 800-1500px
- Add scale indicator (e.g., "10.0 m") for reference

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
│   │   ├── Canvas3D.tsx         # Main 3D canvas
│   │   ├── Scene.tsx            # Scene setup (lights, grid)
│   │   ├── SelectableObject.tsx # 3D object rendering (walls, doors, windows)
│   │   ├── FloorPlanOverlay.tsx # Floor plan texture on ground
│   │   └── TransformGizmo.tsx   # Pivot-based transform controls
│   ├── Panels/
│   │   ├── HierarchyPanel.tsx   # Scene tree + floor plan upload
│   │   └── PropertiesPanel.tsx  # Object properties editor
│   └── UI/
│       └── Toolbar.tsx          # Top toolbar (Move/Rotate/Scale)
├── store/
│   ├── sceneStore.ts            # Scene state (objects, selection, floor plan)
│   └── editorStore.ts           # Editor state (mode, grid, snap)
├── utils/
│   └── floorPlanDetector.ts     # Computer vision for detection
├── hooks/
│   └── useKeyboardShortcuts.ts  # Keyboard event handling
├── App.tsx
└── main.tsx

scripts/
├── test-detection.ts            # Floor plan detection test
├── test-3d-output.ts            # 3D conversion validation
└── validate-visibility.ts       # Door/window visibility check
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
const detection = await detectWallsFromImage(floorPlanUrl, 80); // 0-255
```

### Default Dimensions
Edit in `floorPlanDetector.ts`:
```typescript
const wallHeight = 2.8;      // meters
const wallThickness = 0.2;   // meters
const doorHeight = 2.1;      // meters
const windowHeight = 1.2;    // meters
```

## 🎯 Use Cases

- **Architects**: Quick 3D visualization from 2D plans
- **Interior Designers**: Space planning and layout
- **Real Estate**: Property visualization for listings
- **Construction**: Site planning and coordination
- **Students**: Learning 3D modeling concepts
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
clearAllObjects(): void
```

### Detection Functions

```typescript
// Detect elements from floor plan image
detectWallsFromImage(
  imageUrl: string, 
  threshold?: number
): Promise<DetectionResult>

// Convert to 3D coordinates
convertToSceneWalls(
  detection: DetectionResult, 
  scaleMeters: number
): SceneWall[]

convertOpeningsToScene(
  openings: DetectedOpening[], 
  type: 'door' | 'window',
  detection: DetectionResult,
  scaleMeters: number
): SceneOpening[]
```

## 🔮 Roadmap

- [ ] Export to glTF/GLB
- [ ] Import IFC files
- [ ] Multi-floor support
- [ ] Measurement tools
- [ ] Material library
- [ ] Undo/Redo system
- [ ] Interior door detection (ML-based)
- [ ] Room labeling
- [ ] Collaborative editing

## 🐛 Known Limitations

- **Interior doors**: Dashed arc detection for interior doors is unreliable; only external doors (color-based) are detected
- **Complex floor plans**: Very detailed plans may produce extra wall segments
- **Gradients**: Gradient colors in floor plans may not be detected correctly

## 👤 Author

**Vineeth Kumar**
- GitHub: [@VineethKumar7](https://github.com/VineethKumar7)
- LinkedIn: [vineethkumar7](https://www.linkedin.com/in/vineethkumar7)
- Email: k.vineeth26@gmail.com

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
