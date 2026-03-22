/**
 * Automated Floor Plan Detection Test
 * Run: npx ts-node scripts/test-detection.ts
 * 
 * Tests the detection algorithm and outputs results without needing browser.
 */

import { createCanvas, loadImage } from 'canvas';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ============== DETECTION LOGIC (copied from floorPlanDetector.ts) ==============

interface DetectedWall {
  start: { x: number; y: number };
  end: { x: number; y: number };
  orientation: 'horizontal' | 'vertical';
  length: number;
}

interface DetectedOpening {
  position: { x: number; y: number };
  width: number;
  type: 'door' | 'window';
  orientation: 'horizontal' | 'vertical';
}

interface DetectionResult {
  walls: DetectedWall[];
  doors: DetectedOpening[];
  windows: DetectedOpening[];
  imageWidth: number;
  imageHeight: number;
}

async function detectFromImage(imagePath: string, threshold: number = 80): Promise<DetectionResult> {
  const img = await loadImage(imagePath);
  const canvas = createCanvas(img.width, img.height);
  const ctx = canvas.getContext('2d');
  
  ctx.drawImage(img, 0, 0);
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  
  const walls = findWalls(imageData, threshold);
  const windows = findWindows(imageData);
  const doors = findDoors(walls, imageData);
  
  return {
    walls,
    doors,
    windows,
    imageWidth: img.width,
    imageHeight: img.height,
  };
}

function findWalls(imageData: { width: number; height: number; data: Uint8ClampedArray }, threshold: number): DetectedWall[] {
  const { width, height, data } = imageData;
  
  const wallPixels: boolean[][] = [];
  for (let y = 0; y < height; y++) {
    wallPixels[y] = [];
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4;
      const brightness = (data[i] + data[i + 1] + data[i + 2]) / 3;
      wallPixels[y][x] = brightness < threshold;
    }
  }

  const walls: DetectedWall[] = [];
  const visited = new Set<string>();
  const minWallLength = Math.min(width, height) * 0.03;
  const wallThickness = Math.min(width, height) * 0.02;

  // Horizontal walls
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
            walls.push({ start: { x: startX, y }, end: { x, y }, orientation: 'horizontal', length });
          }
        }
        startX = null;
      }
    }
  }

  // Vertical walls
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
            walls.push({ start: { x, y: startY }, end: { x, y }, orientation: 'vertical', length });
          }
        }
        startY = null;
      }
    }
  }

  return mergeNearbyWalls(walls, wallThickness * 2);
}

function isWallRegion(wallPixels: boolean[][], x: number, y: number, thickness: number, width: number, height: number): boolean {
  const halfThick = Math.ceil(thickness / 2);
  let darkCount = 0, totalCount = 0;
  for (let dy = -halfThick; dy <= halfThick; dy++) {
    for (let dx = -halfThick; dx <= halfThick; dx++) {
      const px = x + dx, py = y + dy;
      if (px >= 0 && px < width && py >= 0 && py < height) {
        totalCount++;
        if (wallPixels[py][px]) darkCount++;
      }
    }
  }
  return totalCount > 0 && darkCount / totalCount > 0.3;
}

function mergeNearbyWalls(walls: DetectedWall[], mergeDistance: number): DetectedWall[] {
  const merged: DetectedWall[] = [];
  const used = new Set<number>();
  for (let i = 0; i < walls.length; i++) {
    if (used.has(i)) continue;
    let current = { ...walls[i] };
    used.add(i);
    for (let j = i + 1; j < walls.length; j++) {
      if (used.has(j) || walls[j].orientation !== current.orientation) continue;
      const dist = current.orientation === 'horizontal'
        ? Math.abs(walls[j].start.y - current.start.y)
        : Math.abs(walls[j].start.x - current.start.x);
      if (dist < mergeDistance) {
        if (current.orientation === 'horizontal') {
          current.start.x = Math.min(current.start.x, walls[j].start.x);
          current.end.x = Math.max(current.end.x, walls[j].end.x);
        } else {
          current.start.y = Math.min(current.start.y, walls[j].start.y);
          current.end.y = Math.max(current.end.y, walls[j].end.y);
        }
        current.length = current.orientation === 'horizontal' ? current.end.x - current.start.x : current.end.y - current.start.y;
        used.add(j);
      }
    }
    merged.push(current);
  }
  return merged;
}

function findWindows(imageData: { width: number; height: number; data: Uint8ClampedArray }): DetectedOpening[] {
  const { width, height, data } = imageData;
  const windows: DetectedOpening[] = [];
  const visited = new Set<string>();
  const processed = new Set<string>();
  const minSize = Math.min(width, height) * 0.015;
  const maxSize = Math.min(width, height) * 0.15;
  
  let blueFound = 0;

  for (let y = 0; y < height; y += 3) {
    for (let x = 0; x < width; x += 3) {
      const key = `${x},${y}`;
      if (processed.has(key)) continue;
      
      const i = (y * width + x) * 4;
      const r = data[i], g = data[i + 1], b = data[i + 2];
      
      // Blue detection: cyan/sky blue windows
      // Actual colors: RGB(80, 165, 253) - high blue, medium green, low red
      const isBlue = b > 180 && g > 130 && g < b && r < 120;
      
      // Debug: check around known window location - focus on y=99
      if (x >= 150 && x <= 180 && y === 99) {
        console.log(`   DEBUG y=99 (${x},${y}): RGB(${r},${g},${b}) isBlue=${isBlue}`);
      }
      
      if (isBlue) {
        const region = floodFillColor(data, width, height, x, y, processed, 'blue');
        console.log(`   FLOOD FILL at (${x},${y}): region=${region.width.toFixed(0)}x${region.height.toFixed(0)} minSize=${minSize.toFixed(0)} maxSize=${maxSize.toFixed(0)}`);
        // Windows can be thin lines - check that the LARGER dimension meets minimum
        // and that neither dimension is too big
        const largerDim = Math.max(region.width, region.height);
        const smallerDim = Math.min(region.width, region.height);
        if (largerDim >= minSize && largerDim <= maxSize * 1.5 && smallerDim >= 2) {
          const windowKey = `w-${Math.round(region.centerX / 30)}-${Math.round(region.centerY / 30)}`;
          if (!visited.has(windowKey)) {
            visited.add(windowKey);
            windows.push({
              position: { x: region.centerX, y: region.centerY },
              width: Math.max(region.width, region.height),
              type: 'window',
              orientation: region.width > region.height ? 'horizontal' : 'vertical',
            });
          }
        }
      }
    }
  }
  return windows;
}

function findDoors(walls: DetectedWall[], imageData: { width: number; height: number; data: Uint8ClampedArray }): DetectedOpening[] {
  const { width, height, data } = imageData;
  const doors: DetectedOpening[] = [];
  const visited = new Set<string>();
  const minSize = Math.min(width, height) * 0.015;
  const maxSize = Math.min(width, height) * 0.12;

  // Gray matrix for arc detection
  const gray: number[][] = [];
  for (let y = 0; y < height; y++) {
    gray[y] = [];
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4;
      gray[y][x] = (data[i] + data[i + 1] + data[i + 2]) / 3;
    }
  }

  // METHOD 1: Brown/orange regions (external doors)
  const processed = new Set<string>();
  let doorDebugCount = 0;
  for (let y = 0; y < height; y += 3) {
    for (let x = 0; x < width; x += 3) {
      const key = `${x},${y}`;
      if (processed.has(key)) continue;
      const i = (y * width + x) * 4;
      const r = data[i], g = data[i + 1], b = data[i + 2];
      // Door detection:
      // 1. Light beige/cream: RGB ~(255, 237, 220)
      const isBeige = r > 240 && g > 220 && b > 200 && r > b + 15 && g > b + 5;
      // 2. Dark brown: RGB ~(119, 75, 48) - actual door interior
      const isBrownDark = r > 80 && r < 180 && g > 40 && g < 130 && b < 80 && r > g && r > b * 1.3;
      const isBrown = isBeige || isBrownDark;
      
      // Debug: check around known door location (504, 494)
      if (x >= 500 && x <= 520 && y >= 492 && y <= 498 && doorDebugCount < 10) {
        console.log(`   DOOR DEBUG (${x},${y}): RGB(${r},${g},${b}) isBeige=${isBeige} r>240:${r>240} g>220:${g>220} b>200:${b>200} r>b+20:${r>b+20} g>b+10:${g>b+10}`);
        doorDebugCount++;
      }
      
      if (isBrown) {
        const region = floodFillColor(data, width, height, x, y, processed, 'brown');
        // Doors should be larger - minimum 20px in larger dimension
        const largerDim = Math.max(region.width, region.height);
        const smallerDim = Math.min(region.width, region.height);
        const doorMinSize = Math.min(width, height) * 0.03; // 3% minimum
        if (largerDim >= 15 && largerDim >= doorMinSize && largerDim <= maxSize * 1.5 && smallerDim >= 3) {
          console.log(`   DOOR ACCEPTED at (${x},${y}): ${region.width.toFixed(0)}x${region.height.toFixed(0)}`);
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

  // METHOD 2: Arc detection for interior doors
  const doorRadius = Math.min(width, height) * 0.06;
  const minRadius = Math.min(width, height) * 0.04;
  const searchStep = Math.floor(doorRadius / 2);
  const edgeMarginX = width * 0.1;
  const edgeMarginY = height * 0.1;

  for (let cy = searchStep; cy < height - searchStep; cy += searchStep) {
    for (let cx = searchStep; cx < width - searchStep; cx += searchStep) {
      const inCorner = (cx < edgeMarginX || cx > width - edgeMarginX) && (cy < edgeMarginY || cy > height - edgeMarginY);
      if (inCorner) continue;
      
      if (!isNearWallIntersection(gray, cx, cy, width, height)) continue;
      
      const arcResult = detectDoorArc(gray, cx, cy, doorRadius, width, height);
      
      // Debug arc detection - log all arcs with any confidence
      if (arcResult.confidence > 0.15) {
        console.log(`   ARC at (${cx},${cy}): conf=${arcResult.confidence.toFixed(2)} len=${arcResult.arcLength.toFixed(0)}`);
      }
      
      // Higher threshold to avoid wall corner false positives
      // Wall corners typically hit 0.31-0.38, so require > 0.50
      if (arcResult.confidence > 0.50 && arcResult.arcLength > minRadius) {
        const doorKey = `arc-${Math.round(cx / 50)}-${Math.round(cy / 50)}`;
        if (!visited.has(doorKey)) {
          visited.add(doorKey);
          doors.push({
            position: { x: arcResult.doorX, y: arcResult.doorY },
            width: doorRadius * 1.5,
            type: 'door',
            orientation: arcResult.orientation,
          });
        }
      }
    }
  }

  return doors;
}

function floodFillColor(
  data: Uint8ClampedArray, width: number, height: number,
  startX: number, startY: number, processed: Set<string>, colorType: 'blue' | 'brown'
): { centerX: number; centerY: number; width: number; height: number } {
  let minX = startX, maxX = startX, minY = startY, maxY = startY;
  const stack = [[startX, startY]];
  
  while (stack.length > 0 && stack.length < 5000) {
    const [x, y] = stack.pop()!;
    const key = `${x},${y}`;
    if (processed.has(key) || x < 0 || x >= width || y < 0 || y >= height) continue;
    
    const i = (y * width + x) * 4;
    const r = data[i], g = data[i + 1], b = data[i + 2];
    
    let isMatch = false;
    if (colorType === 'blue') {
      // Cyan/sky blue: high blue, medium green, low red
      isMatch = b > 180 && g > 130 && g < b && r < 120;
    } else {
      // Light beige/cream door OR dark brown
      const isBeige = r > 240 && g > 220 && b > 200 && r > b + 15 && g > b + 5;
      const isBrownDark = r > 80 && r < 180 && g > 40 && g < 130 && b < 80 && r > g && r > b * 1.3;
      isMatch = isBeige || isBrownDark;
    }
    
    if (!isMatch) continue;
    processed.add(key);
    minX = Math.min(minX, x); maxX = Math.max(maxX, x);
    minY = Math.min(minY, y); maxY = Math.max(maxY, y);
    stack.push([x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]);
  }
  
  return { centerX: (minX + maxX) / 2, centerY: (minY + maxY) / 2, width: maxX - minX, height: maxY - minY };
}

function isNearWallIntersection(gray: number[][], cx: number, cy: number, width: number, height: number): boolean {
  const checkRadius = 15;
  let darkCount = 0, totalChecked = 0;
  for (let dy = -checkRadius; dy <= checkRadius; dy += 3) {
    for (let dx = -checkRadius; dx <= checkRadius; dx += 3) {
      const x = cx + dx, y = cy + dy;
      if (x >= 0 && x < width && y >= 0 && y < height) {
        totalChecked++;
        if (gray[y][x] < 100) darkCount++;
      }
    }
  }
  const ratio = darkCount / totalChecked;
  return ratio > 0.1 && ratio < 0.6;
}

function detectDoorArc(
  gray: number[][], cx: number, cy: number, radius: number, width: number, height: number
): { confidence: number; doorX: number; doorY: number; orientation: 'horizontal' | 'vertical'; arcLength: number } {
  const quadrants = [
    { startAngle: 0, endAngle: Math.PI / 2, dx: 1, dy: -1 },
    { startAngle: Math.PI / 2, endAngle: Math.PI, dx: -1, dy: -1 },
    { startAngle: Math.PI, endAngle: 3 * Math.PI / 2, dx: -1, dy: 1 },
    { startAngle: 3 * Math.PI / 2, endAngle: 2 * Math.PI, dx: 1, dy: 1 },
  ];
  
  let bestConfidence = 0, bestDoorX = cx, bestDoorY = cy;
  let bestOrientation: 'horizontal' | 'vertical' = 'horizontal';
  let bestArcLength = 0;
  
  for (const quad of quadrants) {
    let arcPixels = 0, totalSamples = 0, consecutiveDark = 0, maxConsecutive = 0;
    
    for (let angle = quad.startAngle; angle <= quad.endAngle; angle += 0.1) {
      const px = Math.round(cx + radius * Math.cos(angle));
      const py = Math.round(cy + radius * Math.sin(angle));
      if (px >= 0 && px < width && py >= 0 && py < height) {
        totalSamples++;
        if (gray[py][px] < 140) {
          arcPixels++;
          consecutiveDark++;
          maxConsecutive = Math.max(maxConsecutive, consecutiveDark);
        } else {
          consecutiveDark = 0;
        }
      }
    }
    
    const confidence = totalSamples > 0 ? arcPixels / totalSamples : 0;
    const hasDashedPattern = maxConsecutive >= 2 && maxConsecutive < totalSamples * 0.8;
    const adjustedConfidence = (confidence > 0.25 && confidence < 0.65 && hasDashedPattern) ? confidence : 0;
    
    if (adjustedConfidence > bestConfidence) {
      bestConfidence = adjustedConfidence;
      bestDoorX = cx + quad.dx * radius * 0.7;
      bestDoorY = cy + quad.dy * radius * 0.7;
      bestOrientation = (Math.abs(quad.dx) > 0 && quad.dy === -1) || (Math.abs(quad.dx) > 0 && quad.dy === 1) ? 'vertical' : 'horizontal';
      bestArcLength = radius;
    }
  }
  
  return { confidence: bestConfidence, doorX: bestDoorX, doorY: bestDoorY, orientation: bestOrientation, arcLength: bestArcLength };
}

// ============== TEST RUNNER ==============

async function sampleColors(imagePath: string) {
  const img = await loadImage(imagePath);
  const canvas = createCanvas(img.width, img.height);
  const ctx = canvas.getContext('2d');
  ctx.drawImage(img, 0, 0);
  const data = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
  const width = canvas.width;
  const height = canvas.height;
  
  console.log('\n🎨 SCANNING FOR COLORED PIXELS:');
  
  // Scan entire image for blue and brown pixels
  let bluePixels: Array<{x: number, y: number, r: number, g: number, b: number}> = [];
  let brownPixels: Array<{x: number, y: number, r: number, g: number, b: number}> = [];
  
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4;
      const r = data[i], g = data[i + 1], b = data[i + 2];
      
      // Relaxed blue detection
      const isBlue = b > 120 && b > r + 20 && b > g;
      // Relaxed brown detection  
      const isBrown = r > 120 && r > b + 30 && g < r;
      
      if (isBlue && bluePixels.length < 10) {
        bluePixels.push({x, y, r, g, b});
      }
      if (isBrown && brownPixels.length < 10) {
        brownPixels.push({x, y, r, g, b});
      }
    }
  }
  
  console.log(`\n   Blue pixels found: ${bluePixels.length > 0 ? bluePixels.length + '+' : '0'}`);
  bluePixels.slice(0, 5).forEach(p => {
    console.log(`      (${p.x},${p.y}): RGB(${p.r},${p.g},${p.b})`);
  });
  
  console.log(`\n   Brown pixels found: ${brownPixels.length > 0 ? brownPixels.length + '+' : '0'}`);
  brownPixels.slice(0, 5).forEach(p => {
    console.log(`      (${p.x},${p.y}): RGB(${p.r},${p.g},${p.b})`);
  });
  
  // Also check for any non-gray colorful pixels
  let colorfulPixels: Array<{x: number, y: number, r: number, g: number, b: number}> = [];
  for (let y = 0; y < height; y += 5) {
    for (let x = 0; x < width; x += 5) {
      const i = (y * width + x) * 4;
      const r = data[i], g = data[i + 1], b = data[i + 2];
      // Check if pixel has color (not grayscale)
      const maxDiff = Math.max(Math.abs(r - g), Math.abs(g - b), Math.abs(r - b));
      if (maxDiff > 30 && colorfulPixels.length < 20) {
        colorfulPixels.push({x, y, r, g, b});
      }
    }
  }
  
  console.log(`\n   Colorful (non-gray) pixels: ${colorfulPixels.length}`);
  colorfulPixels.slice(0, 10).forEach(p => {
    const hex = `#${p.r.toString(16).padStart(2,'0')}${p.g.toString(16).padStart(2,'0')}${p.b.toString(16).padStart(2,'0')}`;
    console.log(`      (${p.x},${p.y}): RGB(${p.r},${p.g},${p.b}) ${hex}`);
  });
}

async function runTest() {
  // Find test image
  const testImages = [
    '/home/vineeth/.clawdbot/media/inbound/841bb089-37c2-4f2e-b0e2-adad233f1938.jpg', // Latest floor plan
    path.join(__dirname, '../public/sample-floorplan.png'),
  ];
  
  let imagePath = '';
  for (const p of testImages) {
    if (fs.existsSync(p)) {
      imagePath = p;
      break;
    }
  }
  
  if (!imagePath) {
    console.error('❌ No test image found!');
    process.exit(1);
  }
  
  console.log('🔍 Testing detection on:', imagePath);
  console.log('─'.repeat(60));
  
  // Debug: sample colors first
  await sampleColors(imagePath);
  
  const result = await detectFromImage(imagePath);
  
  console.log(`\n📐 Image: ${result.imageWidth} x ${result.imageHeight} pixels\n`);
  
  // Expected results for the apartment floor plan
  // Note: Interior doors (dashed arcs) need ML for reliable detection
  const expected = {
    walls: '~8-12',
    doors: 1,  // 1 external (color-based) - interior doors need ML
    windows: 4 // Detected via blue color flood-fill
  };
  
  console.log('🧱 WALLS DETECTED:', result.walls.length);
  console.log('   Expected:', expected.walls);
  result.walls.forEach((w, i) => {
    console.log(`   ${i + 1}. ${w.orientation} | len=${Math.round(w.length)}px | (${Math.round(w.start.x)},${Math.round(w.start.y)}) → (${Math.round(w.end.x)},${Math.round(w.end.y)})`);
  });
  
  console.log('\n🚪 DOORS DETECTED:', result.doors.length);
  console.log('   Expected:', expected.doors);
  result.doors.forEach((d, i) => {
    console.log(`   ${i + 1}. ${d.orientation} | w=${Math.round(d.width)}px | pos=(${Math.round(d.position.x)},${Math.round(d.position.y)})`);
  });
  
  console.log('\n🪟 WINDOWS DETECTED:', result.windows.length);
  console.log('   Expected:', expected.windows);
  result.windows.forEach((w, i) => {
    console.log(`   ${i + 1}. ${w.orientation} | w=${Math.round(w.width)}px | pos=(${Math.round(w.position.x)},${Math.round(w.position.y)})`);
  });
  
  console.log('\n' + '─'.repeat(60));
  
  // Summary
  const wallsOk = result.walls.length >= 6 && result.walls.length <= 15;
  const doorsOk = result.doors.length >= 1; // At least external door
  const windowsOk = result.windows.length >= 3; // Allow some variance
  
  console.log('📊 SUMMARY:');
  console.log(`   Walls:   ${wallsOk ? '✅' : '❌'} ${result.walls.length} (expected ${expected.walls})`);
  console.log(`   Doors:   ${doorsOk ? '✅' : '❌'} ${result.doors.length} (expected ${expected.doors})`);
  console.log(`   Windows: ${windowsOk ? '✅' : '❌'} ${result.windows.length} (expected ${expected.windows})`);
  
  if (wallsOk && doorsOk && windowsOk) {
    console.log('\n🎉 ALL TESTS PASSED!');
  } else {
    console.log('\n⚠️  NEEDS ADJUSTMENT');
  }
}

runTest().catch(console.error);
