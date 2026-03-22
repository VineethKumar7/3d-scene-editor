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
 * Find windows by detecting blue-colored segments
 */
function findWindows(imageData: ImageData): DetectedOpening[] {
  const { width, height, data } = imageData;
  const windows: DetectedOpening[] = [];
  const visited = new Set<string>();
  const minSize = Math.min(width, height) * 0.02;

  // Scan for blue pixels (windows are typically marked in blue)
  for (let y = 0; y < height; y += 5) {
    let startX: number | null = null;
    
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4;
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      
      // Check if pixel is blue (window marker)
      const isBlue = b > 150 && b > r * 1.5 && b > g * 1.2;
      
      if (isBlue && startX === null) {
        startX = x;
      } else if (!isBlue && startX !== null) {
        const windowWidth = x - startX;
        if (windowWidth >= minSize) {
          const key = `${Math.round(startX / 20)}-${Math.round(y / 20)}`;
          if (!visited.has(key)) {
            visited.add(key);
            windows.push({
              position: { x: startX + windowWidth / 2, y },
              width: windowWidth,
              type: 'window',
              orientation: 'horizontal',
            });
          }
        }
        startX = null;
      }
    }
  }

  // Also scan vertically for vertical windows
  for (let x = 0; x < width; x += 5) {
    let startY: number | null = null;
    
    for (let y = 0; y < height; y++) {
      const i = (y * width + x) * 4;
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      
      const isBlue = b > 150 && b > r * 1.5 && b > g * 1.2;
      
      if (isBlue && startY === null) {
        startY = y;
      } else if (!isBlue && startY !== null) {
        const windowHeight = y - startY;
        if (windowHeight >= minSize) {
          const key = `v-${Math.round(x / 20)}-${Math.round(startY / 20)}`;
          if (!visited.has(key)) {
            visited.add(key);
            windows.push({
              position: { x, y: startY + windowHeight / 2 },
              width: windowHeight,
              type: 'window',
              orientation: 'vertical',
            });
          }
        }
        startY = null;
      }
    }
  }

  return windows;
}

/**
 * Find doors by detecting brown/orange colored regions only
 * This is the most reliable method for architectural floor plans
 */
function findDoors(walls: DetectedWall[], imageData: ImageData): DetectedOpening[] {
  const { width, height, data } = imageData;
  const doors: DetectedOpening[] = [];
  const visited = new Set<string>();
  const minSize = Math.min(width, height) * 0.015; // Smaller minimum for door markers
  const maxSize = Math.min(width, height) * 0.12;

  // Find brown/orange colored regions (door markers)
  // Scan in a grid pattern and flood-fill to find door regions
  const processed = new Set<string>();
  
  for (let y = 0; y < height; y += 3) {
    for (let x = 0; x < width; x += 3) {
      const key = `${x},${y}`;
      if (processed.has(key)) continue;
      
      const i = (y * width + x) * 4;
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      
      // Check if pixel is brown/orange (door marker)
      // Brown: high red, medium green, low blue
      // Orange: high red, medium-high green, low blue
      const isBrown = r > 150 && g > 50 && g < 180 && b < 100 && r > b * 1.5;
      
      if (isBrown) {
        // Flood fill to find the extent of this door region
        const region = floodFillRegion(data, width, height, x, y, processed);
        
        if (region.width >= minSize && region.height >= minSize && 
            region.width <= maxSize && region.height <= maxSize) {
          const doorKey = `d-${Math.round(region.centerX / 30)}-${Math.round(region.centerY / 30)}`;
          if (!visited.has(doorKey)) {
            visited.add(doorKey);
            
            // Determine orientation based on aspect ratio
            const orientation = region.width > region.height ? 'horizontal' : 'vertical';
            
            doors.push({
              position: { x: region.centerX, y: region.centerY },
              width: Math.max(region.width, region.height),
              type: 'door',
              orientation,
            });
          }
        }
      }
    }
  }

  return doors;
}

/**
 * Flood fill to find a colored region's bounds
 */
function floodFillRegion(
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
  const tolerance = 50; // Color tolerance for flood fill
  
  // Get the starting color
  const startI = (startY * width + startX) * 4;
  const startR = data[startI];
  const startG = data[startI + 1];
  const startB = data[startI + 2];
  
  while (stack.length > 0 && stack.length < 5000) { // Limit iterations
    const [x, y] = stack.pop()!;
    const key = `${x},${y}`;
    
    if (processed.has(key)) continue;
    if (x < 0 || x >= width || y < 0 || y >= height) continue;
    
    const i = (y * width + x) * 4;
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    
    // Check if color is similar (brown/orange family)
    const isSimilar = r > 100 && g > 30 && b < 150 && 
                      Math.abs(r - startR) < tolerance &&
                      Math.abs(g - startG) < tolerance &&
                      Math.abs(b - startB) < tolerance;
    
    if (!isSimilar) continue;
    
    processed.add(key);
    
    // Update bounds
    minX = Math.min(minX, x);
    maxX = Math.max(maxX, x);
    minY = Math.min(minY, y);
    maxY = Math.max(maxY, y);
    
    // Add neighbors (4-connected)
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

  return openings.map((opening) => {
    // Convert from image coords to centered scene coords
    const x = (opening.position.x / imageWidth) * scaleMeters - scaleMeters / 2;
    const z = (opening.position.y / imageHeight) * scaleZ - scaleZ / 2;
    const detectedWidth = opening.width / pixelsPerMeter;

    const height = type === 'door' ? doorHeight : windowHeight;
    const width = type === 'door' ? Math.max(doorWidth, detectedWidth * 0.5) : Math.max(windowWidth, detectedWidth * 0.5);
    const yPos = type === 'door' ? height / 2 : 1.3 + height / 2; // Windows at 1.3m height

    if (opening.orientation === 'horizontal') {
      return {
        position: [x, yPos, z] as [number, number, number],
        scale: [width, height, thickness] as [number, number, number],
        rotation: [0, 0, 0] as [number, number, number],
      };
    } else {
      return {
        position: [x, yPos, z] as [number, number, number],
        scale: [thickness, height, width] as [number, number, number],
        rotation: [0, 0, 0] as [number, number, number],
      };
    }
  });
}
