import fs from 'fs';
import path from 'path';
import sharp from 'sharp';
import { fileURLToPath } from 'url';

// Add proper directory resolution for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Create a simple logo - a purple square with 'PP' text
async function createLogo() {
  try {
    // Create a 1024x1024 purple background
    const logoSize = 1024;
    const background = {
      create: {
        width: logoSize,
        height: logoSize,
        channels: 4,
        background: { r: 79, g: 70, b: 229, alpha: 1 } // #4f46e5 (indigo)
      }
    };

    // Save the logo to the file
    const outputPath = path.join(__dirname, 'logo.png');
    await sharp(background)
      .png()
      .toFile(outputPath);

    console.log(`Created logo at: ${outputPath}`);
  } catch (error) {
    console.error('Error creating logo:', error);
  }
}

createLogo(); 