/**
 * Automated 3D Output Validation Test
 * Tests detection → 3D conversion → validates positions
 * 
 * Run: npx ts-node scripts/test-3d-output.ts
 */

import { createCanvas, loadImage } from 'canvas';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ============== TYPES ==============
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

interface Scene3DObject {
  type: 'wall' | 'door' | 'window';
  position: [number, number, number];
  scale: [number, number, number];
  rotation: [number, number, number];
}

// ============== DETECTION (simplified - same as production) ==============

async function detectFromImage(imagePath: string): Promise<DetectionResult> {
  const img = await loadImage(imagePath);
  const canvas = createCanvas(img.width, img.height);
  const ctx = canvas.getContext('2d');
  ctx.drawImage(img, 0, 0);
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  
  const walls = findWalls(imageData, 80);
  const windows = findWindows(imageData);
  const doors = findDoors(imageData);
  
  return { walls, doors, windows, imageWidth: img.width, imageHeight: img.height };
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

  for (let y = 0; y < height; y += Math.ceil(wallThickness / 2)) {
    let startX: number | null = null;
    for (let x = 0; x < width; x++) {
      const isWall = isWallRegion(wallPixels, x, y, wallThickness, width, height);
      if (isWall && startX === null) startX = x;
      else if (!isWall && startX !== null) {
        const length = x - startX;
        if (length >= minWallLength) {
          const key = `h-${Math.round(startX / 10)}-${Math.round(y / 10)}`;
          if (!visited.has(key)) { visited.add(key); walls.push({ start: { x: startX, y }, end: { x, y }, orientation: 'horizontal', length }); }
        }
        startX = null;
      }
    }
  }

  for (let x = 0; x < width; x += Math.ceil(wallThickness / 2)) {
    let startY: number | null = null;
    for (let y = 0; y < height; y++) {
      const isWall = isWallRegion(wallPixels, x, y, wallThickness, width, height);
      if (isWall && startY === null) startY = y;
      else if (!isWall && startY !== null) {
        const length = y - startY;
        if (length >= minWallLength) {
          const key = `v-${Math.round(x / 10)}-${Math.round(startY / 10)}`;
          if (!visited.has(key)) { visited.add(key); walls.push({ start: { x, y: startY }, end: { x, y }, orientation: 'vertical', length }); }
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
      if (px >= 0 && px < width && py >= 0 && py < height) { totalCount++; if (wallPixels[py][px]) darkCount++; }
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
      const dist = current.orientation === 'horizontal' ? Math.abs(walls[j].start.y - current.start.y) : Math.abs(walls[j].start.x - current.start.x);
      if (dist < mergeDistance) {
        if (current.orientation === 'horizontal') { current.start.x = Math.min(current.start.x, walls[j].start.x); current.end.x = Math.max(current.end.x, walls[j].end.x); }
        else { current.start.y = Math.min(current.start.y, walls[j].start.y); current.end.y = Math.max(current.end.y, walls[j].end.y); }
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

  for (let y = 0; y < height; y += 3) {
    for (let x = 0; x < width; x += 3) {
      const key = `${x},${y}`;
      if (processed.has(key)) continue;
      const i = (y * width + x) * 4;
      const r = data[i], g = data[i + 1], b = data[i + 2];
      const isBlue = b > 180 && g > 130 && g < b && r < 120;
      
      if (isBlue) {
        const region = floodFill(data, width, height, x, y, processed, 'blue');
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

function findDoors(imageData: { width: number; height: number; data: Uint8ClampedArray }): DetectedOpening[] {
  const { width, height, data } = imageData;
  const doors: DetectedOpening[] = [];
  const visited = new Set<string>();
  const processed = new Set<string>();
  const maxSize = Math.min(width, height) * 0.12;
  const doorMinSize = Math.min(width, height) * 0.03;

  for (let y = 0; y < height; y += 3) {
    for (let x = 0; x < width; x += 3) {
      const key = `${x},${y}`;
      if (processed.has(key)) continue;
      const i = (y * width + x) * 4;
      const r = data[i], g = data[i + 1], b = data[i + 2];
      const isBeige = r > 240 && g > 220 && b > 200 && r > b + 15 && g > b + 5;
      const isBrownDark = r > 80 && r < 180 && g > 40 && g < 130 && b < 80 && r > g && r > b * 1.3;
      
      if (isBeige || isBrownDark) {
        const region = floodFill(data, width, height, x, y, processed, 'door');
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
  return doors;
}

function floodFill(data: Uint8ClampedArray, width: number, height: number, startX: number, startY: number, processed: Set<string>, colorType: 'blue' | 'door'): { centerX: number; centerY: number; width: number; height: number } {
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
      isMatch = b > 180 && g > 130 && g < b && r < 120;
    } else {
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

// ============== 3D CONVERSION ==============

function convertToScene3D(detection: DetectionResult, scaleMeters: number): Scene3DObject[] {
  const objects: Scene3DObject[] = [];
  const { imageWidth, imageHeight } = detection;
  const aspectRatio = imageHeight / imageWidth;
  const scaleZ = scaleMeters * aspectRatio;
  const pixelsPerMeter = imageWidth / scaleMeters;
  const wallHeight = 2.8;
  const wallThickness = 0.2;

  // Convert walls
  for (const wall of detection.walls) {
    const startX = (wall.start.x / imageWidth) * scaleMeters - scaleMeters / 2;
    const startZ = (wall.start.y / imageHeight) * scaleZ - scaleZ / 2;
    const endX = (wall.end.x / imageWidth) * scaleMeters - scaleMeters / 2;
    const endZ = (wall.end.y / imageHeight) * scaleZ - scaleZ / 2;
    const centerX = (startX + endX) / 2;
    const centerZ = (startZ + endZ) / 2;
    const length = wall.length / pixelsPerMeter;

    objects.push({
      type: 'wall',
      position: [centerX, wallHeight / 2, centerZ],
      scale: wall.orientation === 'horizontal' ? [length, wallHeight, wallThickness] : [wallThickness, wallHeight, length],
      rotation: [0, 0, 0],
    });
  }

  // Convert windows - offset to place on interior wall surface
  const windowHeight = 1.2;
  const windowThickness = 0.15;
  const offset = wallThickness / 2 + windowThickness / 2 + 0.05;
  
  for (const win of detection.windows) {
    let x = (win.position.x / imageWidth) * scaleMeters - scaleMeters / 2;
    let z = (win.position.y / imageHeight) * scaleZ - scaleZ / 2;
    const detectedWidth = win.width / pixelsPerMeter;
    const width = Math.max(1.0, detectedWidth * 0.5);
    const yPos = 1.3 + windowHeight / 2;

    // Offset toward interior
    if (win.orientation === 'horizontal') {
      if (z < 0) z += offset; else z -= offset;
    } else {
      if (x < 0) x += offset; else x -= offset;
    }

    objects.push({
      type: 'window',
      position: [x, yPos, z],
      scale: win.orientation === 'horizontal' ? [width, windowHeight, windowThickness] : [windowThickness, windowHeight, width],
      rotation: [0, 0, 0],
    });
  }

  // Convert doors - offset to place on interior wall surface
  const doorHeight = 2.1;
  const doorThickness = 0.15;
  const doorOffset = wallThickness / 2 + doorThickness / 2 + 0.05;
  
  for (const door of detection.doors) {
    let x = (door.position.x / imageWidth) * scaleMeters - scaleMeters / 2;
    let z = (door.position.y / imageHeight) * scaleZ - scaleZ / 2;
    const detectedWidth = door.width / pixelsPerMeter;
    const width = Math.max(0.9, detectedWidth * 0.5);
    const yPos = doorHeight / 2;

    // Offset toward interior
    if (door.orientation === 'horizontal') {
      if (z < 0) z += doorOffset; else z -= doorOffset;
    } else {
      if (x < 0) x += doorOffset; else x -= doorOffset;
    }

    objects.push({
      type: 'door',
      position: [x, yPos, z],
      scale: door.orientation === 'horizontal' ? [width, doorHeight, doorThickness] : [doorThickness, doorHeight, width],
      rotation: [0, 0, 0],
    });
  }

  return objects;
}

// ============== VALIDATION ==============

interface ValidationResult {
  passed: boolean;
  walls: { count: number; expected: string; pass: boolean };
  doors: { count: number; expected: number; positions: string[]; pass: boolean };
  windows: { count: number; expected: number; positions: string[]; pass: boolean };
  issues: string[];
}

function validate3DOutput(objects: Scene3DObject[], scaleMeters: number): ValidationResult {
  const issues: string[] = [];
  const walls = objects.filter(o => o.type === 'wall');
  const doors = objects.filter(o => o.type === 'door');
  const windows = objects.filter(o => o.type === 'window');

  // Check walls
  const wallsOk = walls.length >= 6 && walls.length <= 15;
  if (!wallsOk) issues.push(`Wall count ${walls.length} outside expected range 6-15`);

  // Check doors - expect 1 external door
  const doorsOk = doors.length >= 1;
  const doorPositions = doors.map(d => `(${d.position[0].toFixed(1)}, ${d.position[2].toFixed(1)})`);
  if (doors.length === 0) issues.push('No doors detected');
  if (doors.length > 3) issues.push(`Too many doors: ${doors.length} (possible false positives)`);

  // Check windows - expect 4-5
  const windowsOk = windows.length >= 3;
  const windowPositions = windows.map(w => `(${w.position[0].toFixed(1)}, ${w.position[2].toFixed(1)})`);
  if (windows.length < 3) issues.push(`Only ${windows.length} windows detected, expected 4-5`);

  // Check for overlapping objects
  for (let i = 0; i < objects.length; i++) {
    for (let j = i + 1; j < objects.length; j++) {
      const a = objects[i], b = objects[j];
      const dist = Math.sqrt(
        Math.pow(a.position[0] - b.position[0], 2) +
        Math.pow(a.position[2] - b.position[2], 2)
      );
      if (dist < 0.3 && a.type !== 'wall' && b.type !== 'wall') {
        issues.push(`Objects overlap: ${a.type} and ${b.type} at dist=${dist.toFixed(2)}m`);
      }
    }
  }

  // Check windows are near walls
  for (const win of windows) {
    const nearWall = walls.some(wall => {
      const distX = Math.abs(win.position[0] - wall.position[0]);
      const distZ = Math.abs(win.position[2] - wall.position[2]);
      return (distX < 1.0 || distZ < 1.0);
    });
    if (!nearWall) {
      issues.push(`Window at (${win.position[0].toFixed(1)}, ${win.position[2].toFixed(1)}) not near any wall`);
    }
  }

  return {
    passed: wallsOk && doorsOk && windowsOk && issues.length === 0,
    walls: { count: walls.length, expected: '6-15', pass: wallsOk },
    doors: { count: doors.length, expected: 1, positions: doorPositions, pass: doorsOk },
    windows: { count: windows.length, expected: 4, positions: windowPositions, pass: windowsOk },
    issues,
  };
}

// ============== TEST RUNNER ==============

async function runTest() {
  const testImage = '/home/vineeth/.clawdbot/media/inbound/841bb089-37c2-4f2e-b0e2-adad233f1938.jpg';
  
  if (!fs.existsSync(testImage)) {
    console.error('❌ Test image not found:', testImage);
    process.exit(1);
  }

  console.log('🔍 3D OUTPUT VALIDATION TEST');
  console.log('═'.repeat(60));
  console.log('Image:', testImage);
  console.log('');

  // Step 1: Detection
  console.log('📷 Step 1: Detecting elements...');
  const detection = await detectFromImage(testImage);
  console.log(`   Detected: ${detection.walls.length} walls, ${detection.doors.length} doors, ${detection.windows.length} windows`);

  // Step 2: 3D Conversion
  const scaleMeters = 10; // 10m width
  console.log('\n🎮 Step 2: Converting to 3D (scale: 10m)...');
  const scene3D = convertToScene3D(detection, scaleMeters);
  console.log(`   Generated: ${scene3D.length} 3D objects`);

  // Step 3: Validation
  console.log('\n✅ Step 3: Validating 3D output...');
  const result = validate3DOutput(scene3D, scaleMeters);

  // Print results
  console.log('\n' + '─'.repeat(60));
  console.log('📊 VALIDATION RESULTS:');
  console.log(`   Walls:   ${result.walls.pass ? '✅' : '❌'} ${result.walls.count} (expected ${result.walls.expected})`);
  console.log(`   Doors:   ${result.doors.pass ? '✅' : '❌'} ${result.doors.count} (expected ${result.doors.expected})`);
  result.doors.positions.forEach(p => console.log(`            └─ ${p}`));
  console.log(`   Windows: ${result.windows.pass ? '✅' : '❌'} ${result.windows.count} (expected ${result.windows.expected})`);
  result.windows.positions.forEach(p => console.log(`            └─ ${p}`));

  if (result.issues.length > 0) {
    console.log('\n⚠️  ISSUES:');
    result.issues.forEach(issue => console.log(`   • ${issue}`));
  }

  console.log('\n' + '─'.repeat(60));
  if (result.passed) {
    console.log('🎉 ALL VALIDATIONS PASSED!');
  } else {
    console.log('❌ VALIDATION FAILED - See issues above');
  }

  // Print 3D positions for debugging
  console.log('\n📍 3D POSITIONS (for manual verification):');
  console.log('   Walls:');
  scene3D.filter(o => o.type === 'wall').forEach((w, i) => {
    console.log(`      ${i+1}. pos=(${w.position.map(p => p.toFixed(2)).join(', ')}) scale=(${w.scale.map(s => s.toFixed(2)).join(', ')})`);
  });
  console.log('   Windows:');
  scene3D.filter(o => o.type === 'window').forEach((w, i) => {
    console.log(`      ${i+1}. pos=(${w.position.map(p => p.toFixed(2)).join(', ')}) scale=(${w.scale.map(s => s.toFixed(2)).join(', ')})`);
  });
  console.log('   Doors:');
  scene3D.filter(o => o.type === 'door').forEach((d, i) => {
    console.log(`      ${i+1}. pos=(${d.position.map(p => p.toFixed(2)).join(', ')}) scale=(${d.scale.map(s => s.toFixed(2)).join(', ')})`);
  });
}

runTest().catch(console.error);
