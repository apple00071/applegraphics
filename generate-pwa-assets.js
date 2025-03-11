/**
 * PWA Asset Generator Script
 * 
 * This script generates all the necessary icons and splash screens for a PWA.
 * It requires the 'sharp' image processing library.
 * 
 * Installation:
 * npm install sharp
 * 
 * Usage:
 * node generate-pwa-assets.js
 */

import fs from 'fs';
import path from 'path';
import sharp from 'sharp';
import { fileURLToPath } from 'url';

// Add proper directory resolution for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Ensure directories exist
const iconsDir = path.join(__dirname, 'public', 'icons');
const splashDir = path.join(__dirname, 'public', 'splash');

if (!fs.existsSync(iconsDir)) {
  fs.mkdirSync(iconsDir, { recursive: true });
}

if (!fs.existsSync(splashDir)) {
  fs.mkdirSync(splashDir, { recursive: true });
}

// Source image (should be at least 1024x1024 pixels)
const sourceIcon = path.join(__dirname, 'src', 'assets', 'logo.png');

// Generate icons
const iconSizes = [72, 96, 128, 144, 152, 192, 384, 512];

async function generateIcons() {
  console.log('Generating icons...');
  
  for (const size of iconSizes) {
    const outputFile = path.join(iconsDir, `icon-${size}x${size}.png`);
    
    await sharp(sourceIcon)
      .resize(size, size)
      .toFile(outputFile);
    
    console.log(`Created ${outputFile}`);
  }
}

// Generate splash screens
const splashScreens = [
  { width: 2048, height: 2732, name: 'apple-splash-2048-2732.png' }, // iPad Pro 12.9"
  { width: 1668, height: 2388, name: 'apple-splash-1668-2388.png' }, // iPad Pro 11"
  { width: 1536, height: 2048, name: 'apple-splash-1536-2048.png' }, // iPad Air
  { width: 1125, height: 2436, name: 'apple-splash-1125-2436.png' }, // iPhone X/XS
  { width: 1242, height: 2688, name: 'apple-splash-1242-2688.png' }, // iPhone XS Max
  { width: 828, height: 1792, name: 'apple-splash-828-1792.png' },   // iPhone XR
  { width: 750, height: 1334, name: 'apple-splash-750-1334.png' },   // iPhone 8/7/6s/6
  { width: 640, height: 1136, name: 'apple-splash-640-1136.png' },   // iPhone SE
];

async function generateSplashScreens() {
  console.log('Generating splash screens...');
  
  // Create a base splash screen with logo centered
  const baseWidth = 2048;
  const baseHeight = 2732;
  const logoSize = 512;
  
  try {
    // Create a buffer with the background color
    const baseSplash = sharp({
      create: {
        width: baseWidth,
        height: baseHeight,
        channels: 4,
        background: { r: 79, g: 70, b: 229, alpha: 1 } // #4f46e5
      }
    }).png(); // Add this to convert to PNG
    
    // Resize the logo
    const resizedLogo = await sharp(sourceIcon)
      .resize(logoSize, logoSize)
      .toBuffer();
    
    // Calculate position to center the logo
    const logoLeft = Math.floor((baseWidth - logoSize) / 2);
    const logoTop = Math.floor((baseHeight - logoSize) / 2);
    
    // Composite the logo onto the background
    const baseBuffer = await baseSplash
      .composite([
        {
          input: resizedLogo,
          top: logoTop,
          left: logoLeft
        }
      ])
      .toBuffer();
    
    // Generate all splash screen sizes
    for (const screen of splashScreens) {
      const outputFile = path.join(splashDir, screen.name);
      
      await sharp(baseBuffer)
        .resize(screen.width, screen.height)
        .toFile(outputFile);
      
      console.log(`Created ${outputFile}`);
    }
  } catch (error) {
    console.error('Error generating splash screen:', error);
  }
}

// Run the generation
async function generateAssets() {
  try {
    await generateIcons();
    await generateSplashScreens();
    console.log('All PWA assets generated successfully!');
  } catch (error) {
    console.error('Error generating PWA assets:', error);
  }
}

generateAssets(); 