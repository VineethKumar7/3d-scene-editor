/**
 * Automated Demo Recording Script
 * Records feature demonstrations and converts to GIF
 * 
 * Usage: npx ts-node scripts/record-demos.ts
 * Requires: Dev server running on http://localhost:5173
 */

import { chromium, Page } from '@playwright/test';
import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const BASE_URL = 'http://localhost:5173';
const ASSETS_DIR = path.join(__dirname, '..', 'assets');
const TEMP_DIR = path.join(__dirname, '..', '.temp-recordings');

// Ensure directories exist
if (!fs.existsSync(ASSETS_DIR)) fs.mkdirSync(ASSETS_DIR, { recursive: true });
if (!fs.existsSync(TEMP_DIR)) fs.mkdirSync(TEMP_DIR, { recursive: true });

interface DemoConfig {
  name: string;
  filename: string;
  width: number;
  height: number;
  duration: number; // approx seconds
  record: (page: Page) => Promise<void>;
}

// Helper: wait with visual feedback
const wait = (ms: number) => new Promise(r => setTimeout(r, ms));

// Helper: smooth mouse move
async function smoothMove(page: Page, x: number, y: number, steps = 10) {
  const mouse = page.mouse;
  for (let i = 1; i <= steps; i++) {
    await wait(20);
  }
  await mouse.move(x, y);
}

// Demo: Floor Plan Upload & Auto-Detect
const floorPlanDemo: DemoConfig = {
  name: 'Floor Plan Upload',
  filename: 'floor-plan-upload',
  width: 1280,
  height: 720,
  duration: 8,
  record: async (page: Page) => {
    await page.goto(BASE_URL);
    await wait(1500);
    
    // Click Upload Plan button
    const uploadBtn = page.getByRole('button', { name: /upload plan/i });
    await uploadBtn.scrollIntoViewIfNeeded();
    await wait(500);
    await uploadBtn.click();
    await wait(500);
    
    // Upload a sample floor plan (we'll use a test image)
    const fileInput = page.locator('input[type="file"]');
    const testImage = path.join(__dirname, 'test-floorplan.png');
    
    if (fs.existsSync(testImage)) {
      await fileInput.setInputFiles(testImage);
      await wait(2000);
      
      // Click Auto-Detect Walls
      const detectBtn = page.getByRole('button', { name: /auto-detect/i });
      if (await detectBtn.isVisible()) {
        await detectBtn.click();
        await wait(3000);
      }
    } else {
      console.log('  ⚠️  No test floor plan found, showing empty state');
      await wait(2000);
    }
  }
};

// Demo: Transform Controls
const transformDemo: DemoConfig = {
  name: 'Transform Controls',
  filename: 'transform-controls',
  width: 1280,
  height: 720,
  duration: 10,
  record: async (page: Page) => {
    await page.goto(BASE_URL);
    await wait(1500);
    
    // Add a wall to transform
    const addWallBtn = page.getByRole('button', { name: /wall/i }).first();
    await addWallBtn.click();
    await wait(1000);
    
    // Click on canvas to select (center area)
    await page.mouse.click(640, 400);
    await wait(800);
    
    // Move mode (G key)
    await page.keyboard.press('g');
    await wait(500);
    
    // Drag to move
    await page.mouse.move(640, 380);
    await page.mouse.down();
    await page.mouse.move(700, 380, { steps: 20 });
    await page.mouse.up();
    await wait(800);
    
    // Rotate mode (R key)
    await page.keyboard.press('r');
    await wait(500);
    
    // Drag to rotate
    await page.mouse.move(680, 380);
    await page.mouse.down();
    await page.mouse.move(720, 420, { steps: 20 });
    await page.mouse.up();
    await wait(800);
    
    // Scale mode (S key)
    await page.keyboard.press('s');
    await wait(500);
    
    // Drag to scale
    await page.mouse.move(700, 400);
    await page.mouse.down();
    await page.mouse.move(750, 400, { steps: 20 });
    await page.mouse.up();
    await wait(1000);
    
    // Deselect
    await page.keyboard.press('Escape');
    await wait(500);
  }
};

// Demo: Grid Snapping
const gridSnapDemo: DemoConfig = {
  name: 'Grid Snapping',
  filename: 'grid-snapping',
  width: 1280,
  height: 720,
  duration: 8,
  record: async (page: Page) => {
    await page.goto(BASE_URL);
    await wait(1500);
    
    // Add a column
    const addColBtn = page.getByRole('button', { name: /column/i });
    await addColBtn.click();
    await wait(1000);
    
    // Select it
    await page.mouse.click(640, 400);
    await wait(500);
    
    // Move mode
    await page.keyboard.press('g');
    await wait(500);
    
    // Toggle snap (X key) - show snapping
    await page.keyboard.press('x');
    await wait(300);
    
    // Move with snapping
    await page.mouse.move(640, 380);
    await page.mouse.down();
    await page.mouse.move(750, 380, { steps: 30 });
    await page.mouse.up();
    await wait(800);
    
    // Click snap dropdown and change value
    const snapDropdown = page.locator('select').first();
    if (await snapDropdown.isVisible()) {
      await snapDropdown.selectOption('1');
      await wait(500);
    }
    
    // Move again with new snap value
    await page.mouse.move(720, 380);
    await page.mouse.down();
    await page.mouse.move(640, 380, { steps: 30 });
    await page.mouse.up();
    await wait(800);
    
    // Toggle grid visibility (H key)
    await page.keyboard.press('h');
    await wait(1000);
    await page.keyboard.press('h');
    await wait(500);
  }
};

// Demo: Add Elements
const addElementsDemo: DemoConfig = {
  name: 'Add Elements',
  filename: 'add-elements',
  width: 1280,
  height: 720,
  duration: 10,
  record: async (page: Page) => {
    await page.goto(BASE_URL);
    await wait(1500);
    
    // Add Wall
    await page.getByRole('button', { name: /wall/i }).first().click();
    await wait(800);
    
    // Add Column
    await page.getByRole('button', { name: /column/i }).click();
    await wait(800);
    
    // Add Beam
    await page.getByRole('button', { name: /beam/i }).click();
    await wait(800);
    
    // Add Slab
    await page.getByRole('button', { name: /slab/i }).click();
    await wait(800);
    
    // Add Door
    await page.getByRole('button', { name: /door/i }).click();
    await wait(800);
    
    // Add Window
    await page.getByRole('button', { name: /window/i }).click();
    await wait(1000);
    
    // Orbit camera to show all
    await page.mouse.move(640, 400);
    await page.mouse.down({ button: 'right' });
    await page.mouse.move(800, 300, { steps: 30 });
    await page.mouse.up({ button: 'right' });
    await wait(1500);
  }
};

// All demos
const DEMOS: DemoConfig[] = [
  floorPlanDemo,
  transformDemo,
  gridSnapDemo,
  addElementsDemo,
];

// Convert video to GIF using ffmpeg
function videoToGif(inputPath: string, outputPath: string, fps = 12, width = 800) {
  console.log(`  Converting to GIF...`);
  
  // Generate palette for better quality
  const palettePath = inputPath.replace('.webm', '-palette.png');
  
  execSync(
    `ffmpeg -y -i "${inputPath}" -vf "fps=${fps},scale=${width}:-1:flags=lanczos,palettegen" "${palettePath}"`,
    { stdio: 'pipe' }
  );
  
  execSync(
    `ffmpeg -y -i "${inputPath}" -i "${palettePath}" -lavfi "fps=${fps},scale=${width}:-1:flags=lanczos [x]; [x][1:v] paletteuse" "${outputPath}"`,
    { stdio: 'pipe' }
  );
  
  // Cleanup
  fs.unlinkSync(palettePath);
  fs.unlinkSync(inputPath);
  
  const stats = fs.statSync(outputPath);
  console.log(`  ✅ Created: ${path.basename(outputPath)} (${(stats.size / 1024 / 1024).toFixed(2)} MB)`);
}

// Main recording function
async function recordDemos(demoNames?: string[]) {
  console.log('🎬 3D Scene Editor - Demo Recorder\n');
  
  // Check if server is running
  try {
    await fetch(BASE_URL);
  } catch {
    console.error('❌ Dev server not running! Start with: ./start.sh');
    process.exit(1);
  }
  
  const demosToRecord = demoNames 
    ? DEMOS.filter(d => demoNames.includes(d.filename))
    : DEMOS;
  
  if (demosToRecord.length === 0) {
    console.log('No demos to record. Available:', DEMOS.map(d => d.filename).join(', '));
    return;
  }
  
  console.log(`Recording ${demosToRecord.length} demo(s)...\n`);
  
  const browser = await chromium.launch({
    headless: true, // Headless for CI/automated recording
  });
  
  for (const demo of demosToRecord) {
    console.log(`📹 Recording: ${demo.name}`);
    
    const context = await browser.newContext({
      viewport: { width: demo.width, height: demo.height },
      recordVideo: {
        dir: TEMP_DIR,
        size: { width: demo.width, height: demo.height },
      },
    });
    
    const page = await context.newPage();
    
    try {
      await demo.record(page);
    } catch (err) {
      console.error(`  ❌ Error: ${err}`);
    }
    
    await page.close();
    await context.close();
    
    // Get the video file
    const videos = fs.readdirSync(TEMP_DIR).filter(f => f.endsWith('.webm'));
    if (videos.length > 0) {
      const videoPath = path.join(TEMP_DIR, videos[videos.length - 1]);
      const gifPath = path.join(ASSETS_DIR, `${demo.filename}.gif`);
      
      try {
        videoToGif(videoPath, gifPath);
      } catch (err) {
        console.error(`  ❌ GIF conversion failed: ${err}`);
      }
    }
  }
  
  await browser.close();
  
  // Cleanup temp dir
  fs.rmSync(TEMP_DIR, { recursive: true, force: true });
  
  console.log('\n✅ All demos recorded!');
  console.log(`📁 GIFs saved to: ${ASSETS_DIR}`);
}

// CLI
const args = process.argv.slice(2);
if (args.includes('--help')) {
  console.log(`
Usage: npx ts-node scripts/record-demos.ts [demo-names...]

Available demos:
  ${DEMOS.map(d => `${d.filename.padEnd(20)} - ${d.name}`).join('\n  ')}

Examples:
  npx ts-node scripts/record-demos.ts                    # Record all
  npx ts-node scripts/record-demos.ts transform-controls # Record one
  `);
} else {
  recordDemos(args.length > 0 ? args : undefined);
}
