import sharp from 'sharp';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const svgPath = path.join(__dirname, 'public', 'icon.svg');
const publicDir = path.join(__dirname, 'public');

async function generateIcons() {
  try {
    console.log('Generating PNG icons from SVG...');
    
    // 192x192 PNG for PWA
    await sharp(svgPath)
      .resize(192, 192)
      .png()
      .toFile(path.join(publicDir, 'icon-192.png'));
    console.log('Generated public/icon-192.png');

    // 512x512 PNG for PWA
    await sharp(svgPath)
      .resize(512, 512)
      .png()
      .toFile(path.join(publicDir, 'icon-512.png'));
    console.log('Generated public/icon-512.png');

    // Apple touch icon (180x180 png is standard for iOS)
    await sharp(svgPath)
      .resize(180, 180)
      .png()
      .toFile(path.join(publicDir, 'apple-touch-icon.png'));
    console.log('Generated public/apple-touch-icon.png');

    console.log('Successfully generated all icons!');
  } catch (error) {
    console.error('Error generating icons:', error);
  }
}

generateIcons();
