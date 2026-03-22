/**
 * Visibility Validation Test
 * Checks that all detected objects are positioned correctly for visibility
 * 
 * Run: npx ts-node scripts/validate-visibility.ts
 */

import { createCanvas, loadImage } from 'canvas';
import * as fs from 'fs';

interface DetectedOpening {
  position: { x: number; y: number };
  width: number;
  type: 'door' | 'window';
  orientation: 'horizontal' | 'vertical';
}

interface ValidationIssue {
  object: string;
  issue: string;
  actual: string;
  expected: string;
}

async function detectDoors(imagePath: string): Promise<DetectedOpening[]> {
  const img = await loadImage(imagePath);
  const canvas = createCanvas(img.width, img.height);
  const ctx = canvas.getContext('2d');
  ctx.drawImage(img, 0, 0);
  const data = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
  const { width, height } = canvas;
  
  const doors: DetectedOpening[] = [];
  const processed = new Set<string>();
  const visited = new Set<string>();
  
  for (let y = 0; y < height; y += 3) {
    for (let x = 0; x < width; x += 3) {
      const key = `${x},${y}`;
      if (processed.has(key)) continue;
      const i = (y * width + x) * 4;
      const r = data[i], g = data[i + 1], b = data[i + 2];
      const isBrownDark = r > 80 && r < 180 && g > 40 && g < 130 && b < 80 && r > g && r > b * 1.3;
      
      if (isBrownDark) {
        // Flood fill to find region
        let minX = x, maxX = x, minY = y, maxY = y;
        const stack = [[x, y]];
        while (stack.length > 0 && stack.length < 5000) {
          const [px, py] = stack.pop()!;
          const pkey = `${px},${py}`;
          if (processed.has(pkey) || px < 0 || px >= width || py < 0 || py >= height) continue;
          const pi = (py * width + px) * 4;
          const pr = data[pi], pg = data[pi + 1], pb = data[pi + 2];
          const pBrown = pr > 80 && pr < 180 && pg > 40 && pg < 130 && pb < 80 && pr > pg && pr > pb * 1.3;
          if (!pBrown) continue;
          processed.add(pkey);
          minX = Math.min(minX, px); maxX = Math.max(maxX, px);
          minY = Math.min(minY, py); maxY = Math.max(maxY, py);
          stack.push([px + 1, py], [px - 1, py], [px, py + 1], [px, py - 1]);
        }
        
        const regionWidth = maxX - minX;
        const regionHeight = maxY - minY;
        if (regionWidth >= 10 && regionHeight >= 3) {
          const doorKey = `d-${Math.round((minX + maxX) / 2 / 30)}-${Math.round((minY + maxY) / 2 / 30)}`;
          if (!visited.has(doorKey)) {
            visited.add(doorKey);
            doors.push({
              position: { x: (minX + maxX) / 2, y: (minY + maxY) / 2 },
              width: Math.max(regionWidth, regionHeight),
              type: 'door',
              orientation: regionWidth > regionHeight ? 'horizontal' : 'vertical',
            });
          }
        }
      }
    }
  }
  return doors;
}

function convertDoorTo3D(door: DetectedOpening, imageWidth: number, imageHeight: number, scaleMeters: number) {
  const aspectRatio = imageHeight / imageWidth;
  const scaleZ = scaleMeters * aspectRatio;
  const pixelsPerMeter = imageWidth / scaleMeters;
  const wallThickness = 0.2;
  const doorThickness = 0.15;
  const doorHeight = 2.1;
  const doorWidthMin = 0.8;
  const offset = wallThickness / 2 + 0.02;
  
  let x = (door.position.x / imageWidth) * scaleMeters - scaleMeters / 2;
  let z = (door.position.y / imageHeight) * scaleZ - scaleZ / 2;
  const detectedWidth = door.width / pixelsPerMeter;
  const width = Math.max(doorWidthMin, detectedWidth * 0.8);
  const yPos = doorHeight / 2;
  
  // Apply offset
  if (door.orientation === 'horizontal') {
    if (z < 0) z += offset; else z -= offset;
  } else {
    if (x < 0) x += offset; else x -= offset;
  }
  
  return {
    position: [x, yPos, z] as [number, number, number],
    scale: door.orientation === 'horizontal' 
      ? [width, doorHeight, doorThickness] as [number, number, number]
      : [doorThickness, doorHeight, width] as [number, number, number],
  };
}

async function validate() {
  const imagePath = '/home/vineeth/.clawdbot/media/inbound/841bb089-37c2-4f2e-b0e2-adad233f1938.jpg';
  
  if (!fs.existsSync(imagePath)) {
    console.error('❌ Image not found');
    process.exit(1);
  }
  
  console.log('🔍 VISIBILITY VALIDATION');
  console.log('═'.repeat(60));
  
  const img = await loadImage(imagePath);
  const imageWidth = img.width;
  const imageHeight = img.height;
  const scaleMeters = 10;
  
  // Detect and convert doors
  const doors = await detectDoors(imagePath);
  console.log(`\n📍 Detected ${doors.length} door(s) in image`);
  
  const issues: ValidationIssue[] = [];
  const wallHeight = 2.8;
  
  for (let i = 0; i < doors.length; i++) {
    const door = doors[i];
    const d3d = convertDoorTo3D(door, imageWidth, imageHeight, scaleMeters);
    
    console.log(`\n🚪 Door ${i + 1}:`);
    console.log(`   Image pos: (${door.position.x.toFixed(0)}, ${door.position.y.toFixed(0)}) px`);
    console.log(`   Image width: ${door.width.toFixed(0)} px`);
    console.log(`   Orientation: ${door.orientation}`);
    console.log(`   3D position: (${d3d.position[0].toFixed(2)}, ${d3d.position[1].toFixed(2)}, ${d3d.position[2].toFixed(2)}) m`);
    console.log(`   3D scale: (${d3d.scale[0].toFixed(2)}, ${d3d.scale[1].toFixed(2)}, ${d3d.scale[2].toFixed(2)}) m`);
    
    // Validation checks
    const [posX, posY, posZ] = d3d.position;
    const [scaleX, scaleY, scaleZ] = d3d.scale;
    
    // Check 1: Door Y position should be at half door height
    if (Math.abs(posY - 1.05) > 0.1) {
      issues.push({
        object: `Door ${i + 1}`,
        issue: 'Y position incorrect',
        actual: `Y = ${posY.toFixed(2)}m`,
        expected: 'Y = 1.05m (half door height)',
      });
    } else {
      console.log(`   ✅ Y position correct (${posY.toFixed(2)}m)`);
    }
    
    // Check 2: Door height should be ~2.1m
    if (Math.abs(scaleY - 2.1) > 0.1) {
      issues.push({
        object: `Door ${i + 1}`,
        issue: 'Height incorrect',
        actual: `Height = ${scaleY.toFixed(2)}m`,
        expected: 'Height = 2.1m',
      });
    } else {
      console.log(`   ✅ Height correct (${scaleY.toFixed(2)}m)`);
    }
    
    // Check 3: Door should be within scene bounds
    const halfWidth = scaleMeters / 2;
    const halfDepth = (scaleMeters * imageHeight / imageWidth) / 2;
    if (Math.abs(posX) > halfWidth || Math.abs(posZ) > halfDepth) {
      issues.push({
        object: `Door ${i + 1}`,
        issue: 'Outside scene bounds',
        actual: `Position (${posX.toFixed(2)}, ${posZ.toFixed(2)})`,
        expected: `Within ±${halfWidth.toFixed(1)}m x ±${halfDepth.toFixed(1)}m`,
      });
    } else {
      console.log(`   ✅ Within scene bounds`);
    }
    
    // Check 4: Door width should be reasonable (0.6-1.5m)
    const doorWidth = door.orientation === 'horizontal' ? scaleX : scaleZ;
    if (doorWidth < 0.6 || doorWidth > 1.5) {
      issues.push({
        object: `Door ${i + 1}`,
        issue: 'Width unrealistic',
        actual: `Width = ${doorWidth.toFixed(2)}m`,
        expected: 'Width between 0.6-1.5m',
      });
    } else {
      console.log(`   ✅ Width realistic (${doorWidth.toFixed(2)}m)`);
    }
    
    // Check 5: Door thickness should be visible (>0.05m)
    const doorThickness = door.orientation === 'horizontal' ? scaleZ : scaleX;
    if (doorThickness < 0.05) {
      issues.push({
        object: `Door ${i + 1}`,
        issue: 'Thickness too thin (invisible)',
        actual: `Thickness = ${doorThickness.toFixed(3)}m`,
        expected: 'Thickness > 0.05m',
      });
    } else {
      console.log(`   ✅ Thickness visible (${doorThickness.toFixed(2)}m)`);
    }
  }
  
  // Summary
  console.log('\n' + '─'.repeat(60));
  if (issues.length === 0) {
    console.log('🎉 ALL VISIBILITY CHECKS PASSED!');
  } else {
    console.log(`❌ ${issues.length} ISSUE(S) FOUND:\n`);
    issues.forEach(issue => {
      console.log(`   ${issue.object}: ${issue.issue}`);
      console.log(`      Actual: ${issue.actual}`);
      console.log(`      Expected: ${issue.expected}`);
    });
  }
  
  // Expected rendering in scene
  console.log('\n📐 EXPECTED DOOR RENDERING:');
  doors.forEach((door, i) => {
    const d3d = convertDoorTo3D(door, imageWidth, imageHeight, scaleMeters);
    console.log(`   Door ${i + 1}:`);
    console.log(`      Bottom edge: Y = ${(d3d.position[1] - d3d.scale[1]/2).toFixed(2)}m (should be ~0)`);
    console.log(`      Top edge: Y = ${(d3d.position[1] + d3d.scale[1]/2).toFixed(2)}m (should be ~2.1m)`);
    console.log(`      Should be visible: ${d3d.scale[1] >= 1.5 ? '✅ YES' : '❌ NO (too short)'}`);
  });
}

validate().catch(console.error);
