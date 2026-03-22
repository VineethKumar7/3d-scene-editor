/**
 * Floor Plan Wall Detector
 * Uses canvas-based computer vision to detect walls from a floor plan image
 */

export interface DetectedWall {
  start: { x: number; y: number };
  end: { x: number; y: number };
  orientation: 'horizontal' | 'vertical';
  length: number;
}

export interface DetectedOpening {
  position: { x: number; y: number };
  width: number;
  type: 'door' | 'window';
  orientation: 'horizontal' | 'vertical';
}

export interface DetectionResult {
  walls: DetectedWall[];
  doors: DetectedOpening[];
  windows: DetectedOpening[];
  imageWidth: number;
  imageHeight: number;
}

/**
 * Detect walls from a floor plan image URL
 */
export async function detectWallsFromImage(
  imageUrl: string,
  threshold: number = 100 // Pixel darkness threshold (0-255)
): Promise<DetectionResult> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Could not get canvas context'));
        return;
      }

      canvas.width = img.width;
      canvas.height = img.height;
      ctx.drawImage(img, 0, 0);

      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const walls = findWalls(imageData, threshold);
      const windows = findWindows(imageData);
      const doors = findDoors(walls, imageData);

      resolve({
        walls,
        doors,
        windows,
        imageWidth: img.width,
        imageHeight: img.height,
      });
    };

    img.onerror = () => reject(new Error('Failed to load image'));
    img.src = imageUrl;
  });
}

/**
 * Find walls by detecting dark line segments in the image
 */
function findWalls(imageData: ImageData, threshold: number): DetectedWall[] {
  const { width, height, data } = imageData;
  
  // Create binary matrix (true = wall pixel)
  const wallPixels: boolean[][] = [];
  for (let y = 0; y < height; y++) {
    wallPixels[y] = [];
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4;
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      // Check if pixel is dark (wall)
      const brightness = (r + g + b) / 3;
      wallPixels[y][x] = brightness < threshold;
    }
  }

  const walls: DetectedWall[] = [];
  const visited = new Set<string>();
  const minWallLength = Math.min(width, height) * 0.03; // Min 3% of image size
  const wallThickness = Math.min(width, height) * 0.02; // Expected wall thickness

  // Scan for horizontal walls
  for (let y = 0; y < height; y += Math.ceil(wallThickness / 2)) {
    let startX: number | null = null;
    
    for (let x = 0; x < width; x++) {
      const isWall = isWallRegion(wallPixels, x, y, wallThickness, width, height);
      
      if (isWall && startX === null) {
        startX = x;
      } else if (!isWall && startX !== null) {
        const length = x - startX;
        if (length >= minWallLength) {
          const key = `h-${Math.round(startX / 10)}-${Math.round(y / 10)}-${Math.round(length / 10)}`;
          if (!visited.has(key)) {
            visited.add(key);
            walls.push({
              start: { x: startX, y },
              end: { x, y },
              orientation: 'horizontal',
              length,
            });
          }
        }
        startX = null;
      }
    }
    
    // Handle wall ending at edge
    if (startX !== null) {
      const length = width - startX;
      if (length >= minWallLength) {
        walls.push({
          start: { x: startX, y },
          end: { x: width, y },
          orientation: 'horizontal',
          length,
        });
      }
    }
  }

  // Scan for vertical walls
  for (let x = 0; x < width; x += Math.ceil(wallThickness / 2)) {
    let startY: number | null = null;
    
    for (let y = 0; y < height; y++) {
      const isWall = isWallRegion(wallPixels, x, y, wallThickness, width, height);
      
      if (isWall && startY === null) {
        startY = y;
      } else if (!isWall && startY !== null) {
        const length = y - startY;
        if (length >= minWallLength) {
          const key = `v-${Math.round(x / 10)}-${Math.round(startY / 10)}-${Math.round(length / 10)}`;
          if (!visited.has(key)) {
            visited.add(key);
            walls.push({
              start: { x, y: startY },
              end: { x, y },
              orientation: 'vertical',
              length,
            });
          }
        }
        startY = null;
      }
    }
    
    // Handle wall ending at edge
    if (startY !== null) {
      const length = height - startY;
      if (length >= minWallLength) {
        walls.push({
          start: { x, y: startY },
          end: { x, y: height },
          orientation: 'vertical',
          length,
        });
      }
    }
  }

  // Merge nearby parallel walls
  return mergeNearbyWalls(walls, wallThickness * 2);
}

/**
 * Check if a region contains wall pixels
 */
function isWallRegion(
  wallPixels: boolean[][],
  x: number,
  y: number,
  thickness: number,
  width: number,
  height: number
): boolean {
  const halfThick = Math.ceil(thickness / 2);
  let darkCount = 0;
  let totalCount = 0;

  for (let dy = -halfThick; dy <= halfThick; dy++) {
    for (let dx = -halfThick; dx <= halfThick; dx++) {
      const px = x + dx;
      const py = y + dy;
      if (px >= 0 && px < width && py >= 0 && py < height) {
        totalCount++;
        if (wallPixels[py][px]) darkCount++;
      }
    }
  }

  return totalCount > 0 && darkCount / totalCount > 0.3;
}

/**
 * Merge walls that are close together and parallel
 */
function mergeNearbyWalls(walls: DetectedWall[], mergeDistance: number): DetectedWall[] {
  const merged: DetectedWall[] = [];
  const used = new Set<number>();

  for (let i = 0; i < walls.length; i++) {
    if (used.has(i)) continue;

    let current = { ...walls[i] };
    used.add(i);

    // Find nearby walls to merge
    for (let j = i + 1; j < walls.length; j++) {
      if (used.has(j)) continue;
      if (walls[j].orientation !== current.orientation) continue;

      const dist = current.orientation === 'horizontal'
        ? Math.abs(walls[j].start.y - current.start.y)
        : Math.abs(walls[j].start.x - current.start.x);

      if (dist < mergeDistance) {
        // Merge by extending the wall
        if (current.orientation === 'horizontal') {
          current.start.x = Math.min(current.start.x, walls[j].start.x);
          current.end.x = Math.max(current.end.x, walls[j].end.x);
        } else {
          current.start.y = Math.min(current.start.y, walls[j].start.y);
          current.end.y = Math.max(current.end.y, walls[j].end.y);
        }
        current.length = current.orientation === 'horizontal'
          ? current.end.x - current.start.x
          : current.end.y - current.start.y;
        used.add(j);
      }
    }

    merged.push(current);
  }

  return merged;
}

/**
 * Find windows by detecting blue-colored regions
 * Uses flood-fill for accurate detection of window rectangles
 */
function findWindows(imageData: ImageData): DetectedOpening[] {
  const { width, height, data } = imageData;
  const windows: DetectedOpening[] = [];
  const visited = new Set<string>();
  const processed = new Set<string>();
  const minSize = Math.min(width, height) * 0.015;
  const maxSize = Math.min(width, height) * 0.15;

  // Scan for blue pixels and flood-fill to find window regions
  for (let y = 0; y < height; y += 3) {
    for (let x = 0; x < width; x += 3) {
      const key = `${x},${y}`;
      if (processed.has(key)) continue;
      
      const i = (y * width + x) * 4;
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      
      // Cyan/sky blue windows: RGB(80, 165, 253) - high blue, medium green, low red
      const isBlue = b > 180 && g > 130 && g < b && r < 120;
      
      if (isBlue) {
        // Flood fill to find the extent of this window region
        const region = floodFillBlueRegion(data, width, height, x, y, processed);
        
        // Windows can be thin lines - check that the LARGER dimension meets minimum
        // and that neither dimension is too big
        const largerDim = Math.max(region.width, region.height);
        const smallerDim = Math.min(region.width, region.height);
        
        if (largerDim >= minSize && largerDim <= maxSize * 1.5 && smallerDim >= 2) {
          const windowKey = `w-${Math.round(region.centerX / 30)}-${Math.round(region.centerY / 30)}`;
          if (!visited.has(windowKey)) {
            visited.add(windowKey);
            
            // Determine orientation based on aspect ratio
            const orientation = region.width > region.height ? 'horizontal' : 'vertical';
            
            windows.push({
              position: { x: region.centerX, y: region.centerY },
              width: Math.max(region.width, region.height),
              type: 'window',
              orientation,
            });
          }
        }
      }
    }
  }

  return windows;
}

/**
 * Flood fill to find a blue region's bounds
 */
function floodFillBlueRegion(
  data: Uint8ClampedArray,
  width: number,
  height: number,
  startX: number,
  startY: number,
  processed: Set<string>
): { centerX: number; centerY: number; width: number; height: number } {
  let minX = startX, maxX = startX;
  let minY = startY, maxY = startY;
  
  const stack = [[startX, startY]];
  
  while (stack.length > 0 && stack.length < 5000) {
    const [x, y] = stack.pop()!;
    const key = `${x},${y}`;
    
    if (processed.has(key)) continue;
    if (x < 0 || x >= width || y < 0 || y >= height) continue;
    
    const i = (y * width + x) * 4;
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    
    // Cyan/sky blue: high blue, medium green, low red
    const isBlue = b > 180 && g > 130 && g < b && r < 120;
    
    if (!isBlue) continue;
    
    processed.add(key);
    
    minX = Math.min(minX, x);
    maxX = Math.max(maxX, x);
    minY = Math.min(minY, y);
    maxY = Math.max(maxY, y);
    
    // Add neighbors
    stack.push([x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]);
  }
  
  return {
    centerX: (minX + maxX) / 2,
    centerY: (minY + maxY) / 2,
    width: maxX - minX,
    height: maxY - minY,
  };
}

/**
 * Find doors by detecting:
 * 1. Brown/orange colored regions (explicit door markers)
 * 2. Door swing arcs (dashed quarter circles) - interior doors
 */
function findDoors(_walls: DetectedWall[], imageData: ImageData): DetectedOpening[] {
  const { width, height, data } = imageData;
  const doors: DetectedOpening[] = [];
  const visited = new Set<string>();
  const maxSize = Math.min(width, height) * 0.12;

  // Create grayscale matrix for arc detection
  const gray: number[][] = [];
  for (let y = 0; y < height; y++) {
    gray[y] = [];
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4;
      gray[y][x] = (data[i] + data[i + 1] + data[i + 2]) / 3;
    }
  }

  // METHOD 1: Find door colored regions (external doors)
  // Handles: light beige/cream (~255, 237, 220) and dark brown (~119, 75, 48)
  const processed = new Set<string>();
  const doorMinSize = Math.min(width, height) * 0.03; // 3% minimum for doors
  
  for (let y = 0; y < height; y += 3) {
    for (let x = 0; x < width; x += 3) {
      const key = `${x},${y}`;
      if (processed.has(key)) continue;
      
      const i = (y * width + x) * 4;
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      
      // Light beige/cream door: RGB ~(255, 237, 220)
      const isBeige = r > 240 && g > 220 && b > 200 && r > b + 15 && g > b + 5;
      // Dark brown door interior: RGB ~(119, 75, 48)
      const isBrownDark = r > 80 && r < 180 && g > 40 && g < 130 && b < 80 && r > g && r > b * 1.3;
      const isDoor = isBeige || isBrownDark;
      
      if (isDoor) {
        const region = floodFillDoorRegion(data, width, height, x, y, processed);
        
        // Doors should be larger - minimum 15px in larger dimension
        const largerDim = Math.max(region.width, region.height);
        const smallerDim = Math.min(region.width, region.height);
        
        if (largerDim >= 15 && largerDim >= doorMinSize && largerDim <= maxSize * 1.5 && smallerDim >= 3) {
          const doorKey = `d-${Math.round(region.centerX / 30)}-${Math.round(region.centerY / 30)}`;
          if (!visited.has(doorKey)) {
            visited.add(doorKey);
            doors.push({
              position: { x: region.centerX, y: region.centerY },
              width: Math.max(region.width, region.height),
              type: 'door',
              orientation: region.width > region.height ? 'horizontal' : 'vertical',
            });
          }
        }
      }
    }
  }

  // NOTE: Arc detection for interior doors disabled - too many false positives
  // Interior door detection requires ML/edge detection for reliable results
  // For portfolio demo, color-based external door detection is sufficient

  return doors;
}

/**
 * Check if a point is near a wall intersection (potential door hinge)
 */
function isNearWallIntersection(
  gray: number[][],
  cx: number,
  cy: number,
  width: number,
  height: number
): boolean {
  const checkRadius = 15;
  let darkCount = 0;
  let totalChecked = 0;
  
  // Check in a small area around the point
  for (let dy = -checkRadius; dy <= checkRadius; dy += 3) {
    for (let dx = -checkRadius; dx <= checkRadius; dx += 3) {
      const x = cx + dx;
      const y = cy + dy;
      if (x >= 0 && x < width && y >= 0 && y < height) {
        totalChecked++;
        if (gray[y][x] < 100) darkCount++;
      }
    }
  }
  
  // Should have some dark pixels (wall) but not be completely filled
  const ratio = darkCount / totalChecked;
  return ratio > 0.1 && ratio < 0.6;
}

/**
 * Detect a door swing arc pattern
 */
function detectDoorArc(
  gray: number[][],
  cx: number,
  cy: number,
  radius: number,
  width: number,
  height: number
): { confidence: number; doorX: number; doorY: number; orientation: 'horizontal' | 'vertical'; arcLength: number } {
  // Check all 4 quadrant orientations
  const quadrants = [
    { startAngle: 0, endAngle: Math.PI / 2, dx: 1, dy: -1 },      // top-right
    { startAngle: Math.PI / 2, endAngle: Math.PI, dx: -1, dy: -1 }, // top-left  
    { startAngle: Math.PI, endAngle: 3 * Math.PI / 2, dx: -1, dy: 1 }, // bottom-left
    { startAngle: 3 * Math.PI / 2, endAngle: 2 * Math.PI, dx: 1, dy: 1 }, // bottom-right
  ];
  
  let bestConfidence = 0;
  let bestDoorX = cx;
  let bestDoorY = cy;
  let bestOrientation: 'horizontal' | 'vertical' = 'horizontal';
  let bestArcLength = 0;
  
  for (const quad of quadrants) {
    // Sample points along the arc
    let arcPixels = 0;
    let totalSamples = 0;
    let consecutiveDark = 0;
    let maxConsecutive = 0;
    
    for (let angle = quad.startAngle; angle <= quad.endAngle; angle += 0.1) {
      const px = Math.round(cx + radius * Math.cos(angle));
      const py = Math.round(cy + radius * Math.sin(angle));
      
      if (px >= 0 && px < width && py >= 0 && py < height) {
        totalSamples++;
        // Check if pixel is dark (part of arc) - threshold for dashed lines
        if (gray[py][px] < 140) {
          arcPixels++;
          consecutiveDark++;
          maxConsecutive = Math.max(maxConsecutive, consecutiveDark);
        } else {
          consecutiveDark = 0;
        }
      }
    }
    
    // For dashed arcs, we expect ~30-60% of samples to hit dark pixels
    const confidence = totalSamples > 0 ? arcPixels / totalSamples : 0;
    
    // Confidence should be in the "dashed line" range, not solid or empty
    // Also check that we have actual arc segments (consecutive dark pixels)
    const hasDashedPattern = maxConsecutive >= 2 && maxConsecutive < totalSamples * 0.8;
    const adjustedConfidence = (confidence > 0.25 && confidence < 0.65 && hasDashedPattern) ? confidence : 0;
    
    if (adjustedConfidence > bestConfidence) {
      bestConfidence = adjustedConfidence;
      // Door position is at the arc's "open" end
      bestDoorX = cx + quad.dx * radius * 0.7;
      bestDoorY = cy + quad.dy * radius * 0.7;
      // Orientation based on which way the door swings
      bestOrientation = (Math.abs(quad.dx) > 0 && quad.dy === -1) || 
                       (Math.abs(quad.dx) > 0 && quad.dy === 1) ? 'vertical' : 'horizontal';
      bestArcLength = radius;
    }
  }
  
  return {
    confidence: bestConfidence,
    doorX: bestDoorX,
    doorY: bestDoorY,
    orientation: bestOrientation,
    arcLength: bestArcLength,
  };
}

/**
 * Flood fill to find a door region's bounds
 * Handles beige/cream and dark brown door colors
 */
function floodFillDoorRegion(
  data: Uint8ClampedArray,
  width: number,
  height: number,
  startX: number,
  startY: number,
  processed: Set<string>
): { centerX: number; centerY: number; width: number; height: number } {
  let minX = startX, maxX = startX;
  let minY = startY, maxY = startY;
  
  const stack = [[startX, startY]];
  
  while (stack.length > 0 && stack.length < 5000) {
    const [x, y] = stack.pop()!;
    const key = `${x},${y}`;
    
    if (processed.has(key)) continue;
    if (x < 0 || x >= width || y < 0 || y >= height) continue;
    
    const i = (y * width + x) * 4;
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    
    // Light beige/cream door OR dark brown
    const isBeige = r > 240 && g > 220 && b > 200 && r > b + 15 && g > b + 5;
    const isBrownDark = r > 80 && r < 180 && g > 40 && g < 130 && b < 80 && r > g && r > b * 1.3;
    const isDoor = isBeige || isBrownDark;
    
    if (!isDoor) continue;
    
    processed.add(key);
    
    minX = Math.min(minX, x);
    maxX = Math.max(maxX, x);
    minY = Math.min(minY, y);
    maxY = Math.max(maxY, y);
    
    stack.push([x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]);
  }
  
  return {
    centerX: (minX + maxX) / 2,
    centerY: (minY + maxY) / 2,
    width: maxX - minX,
    height: maxY - minY,
  };
}

/**
 * Convert detected walls to 3D scene coordinates
 * Note: Image Y goes down, but we want Z to go "into" the scene consistently
 */
export function convertToSceneWalls(
  detection: DetectionResult,
  scaleMeters: number // Total width in meters
): Array<{
  position: [number, number, number];
  scale: [number, number, number];
  rotation: [number, number, number];
}> {
  const { walls, imageWidth, imageHeight } = detection;
  const aspectRatio = imageHeight / imageWidth;
  const scaleZ = scaleMeters * aspectRatio;
  const pixelsPerMeter = imageWidth / scaleMeters;
  const wallHeight = 2.8; // Standard wall height
  const wallThickness = 0.2; // 20cm walls

  return walls.map((wall) => {
    // Convert from image coords (0,0 top-left) to centered scene coords
    const startX = (wall.start.x / imageWidth) * scaleMeters - scaleMeters / 2;
    const startZ = (wall.start.y / imageHeight) * scaleZ - scaleZ / 2;
    const endX = (wall.end.x / imageWidth) * scaleMeters - scaleMeters / 2;
    const endZ = (wall.end.y / imageHeight) * scaleZ - scaleZ / 2;

    const centerX = (startX + endX) / 2;
    const centerZ = (startZ + endZ) / 2;
    const length = wall.length / pixelsPerMeter;

    if (wall.orientation === 'horizontal') {
      return {
        position: [centerX, wallHeight / 2, centerZ] as [number, number, number],
        scale: [length, wallHeight, wallThickness] as [number, number, number],
        rotation: [0, 0, 0] as [number, number, number],
      };
    } else {
      return {
        position: [centerX, wallHeight / 2, centerZ] as [number, number, number],
        scale: [wallThickness, wallHeight, length] as [number, number, number],
        rotation: [0, 0, 0] as [number, number, number],
      };
    }
  });
}

/**
 * Convert detected openings (doors/windows) to 3D scene coordinates
 * Places them on the walls (at the perimeter) not floating inside
 */
export function convertOpeningsToScene(
  openings: DetectedOpening[],
  type: 'door' | 'window',
  detection: DetectionResult,
  scaleMeters: number
): Array<{
  position: [number, number, number];
  scale: [number, number, number];
  rotation: [number, number, number];
}> {
  const { imageWidth, imageHeight } = detection;
  const aspectRatio = imageHeight / imageWidth;
  const scaleZ = scaleMeters * aspectRatio;
  const pixelsPerMeter = imageWidth / scaleMeters;
  
  const doorHeight = 2.1;
  const doorWidth = 0.9;
  const windowHeight = 1.2;
  const windowWidth = 1.0;
  const thickness = 0.15;

  const wallThickness = 0.2;
  
  return openings.map((opening) => {
    // Convert from image coords to centered scene coords
    let x = (opening.position.x / imageWidth) * scaleMeters - scaleMeters / 2;
    let z = (opening.position.y / imageHeight) * scaleZ - scaleZ / 2;
    const detectedWidth = opening.width / pixelsPerMeter;

    const height = type === 'door' ? doorHeight : windowHeight;
    const width = type === 'door' ? Math.max(doorWidth, detectedWidth * 0.5) : Math.max(windowWidth, detectedWidth * 0.5);
    const yPos = type === 'door' ? height / 2 : 1.3 + height / 2; // Windows at 1.3m height

    // Offset to place opening on interior wall surface (not inside wall geometry)
    // Push toward scene center based on position
    const offset = wallThickness / 2 + thickness / 2 + 0.05; // Small extra gap
    
    if (opening.orientation === 'horizontal') {
      // Horizontal opening on horizontal wall - offset in Z
      if (z < 0) z += offset;  // Top wall: push toward interior (+Z)
      else z -= offset;         // Bottom wall: push toward interior (-Z)
      
      return {
        position: [x, yPos, z] as [number, number, number],
        scale: [width, height, thickness] as [number, number, number],
        rotation: [0, 0, 0] as [number, number, number],
      };
    } else {
      // Vertical opening on vertical wall - offset in X
      if (x < 0) x += offset;  // Left wall: push toward interior (+X)
      else x -= offset;         // Right wall: push toward interior (-X)
      
      return {
        position: [x, yPos, z] as [number, number, number],
        scale: [thickness, height, width] as [number, number, number],
        rotation: [0, 0, 0] as [number, number, number],
      };
    }
  });
}
