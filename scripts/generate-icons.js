/**
 * Generate all required app icons from the source favicon.png
 * - PWA icons (manifest.webmanifest)
 * - Android mipmap icons (for Capacitor)
 * - Adaptive icon foreground layers
 */
const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const SOURCE = path.join(__dirname, '..', 'src', 'favicon.png');

// PWA icon sizes (for manifest.webmanifest)
const PWA_SIZES = [72, 96, 128, 144, 152, 192, 384, 512];
const PWA_OUTPUT_DIR = path.join(__dirname, '..', 'src', 'assets', 'icons');

// Android mipmap sizes (standard Android icon sizes)
const ANDROID_MIPMAP = {
  'mipmap-mdpi': 48,
  'mipmap-hdpi': 72,
  'mipmap-xhdpi': 96,
  'mipmap-xxhdpi': 144,
  'mipmap-xxxhdpi': 192,
};

// Android adaptive icon foreground sizes (108dp * density)
const ANDROID_FOREGROUND = {
  'mipmap-mdpi': 108,
  'mipmap-hdpi': 162,
  'mipmap-xhdpi': 216,
  'mipmap-xxhdpi': 324,
  'mipmap-xxxhdpi': 432,
};

const ANDROID_RES_DIR = path.join(__dirname, '..', 'android', 'app', 'src', 'main', 'res');

async function generatePWAIcons() {
  console.log('🎨 Generating PWA icons...');
  fs.mkdirSync(PWA_OUTPUT_DIR, { recursive: true });

  for (const size of PWA_SIZES) {
    const outputPath = path.join(PWA_OUTPUT_DIR, `icon-${size}x${size}.png`);
    await sharp(SOURCE)
      .resize(size, size, { fit: 'contain', background: { r: 255, g: 255, b: 255, alpha: 1 } })
      .png()
      .toFile(outputPath);
    console.log(`  ✅ icon-${size}x${size}.png`);
  }
}

async function generateAndroidIcons() {
  console.log('🤖 Generating Android mipmap icons...');

  for (const [folder, size] of Object.entries(ANDROID_MIPMAP)) {
    const dir = path.join(ANDROID_RES_DIR, folder);
    fs.mkdirSync(dir, { recursive: true });

    // ic_launcher.png - standard launcher icon
    await sharp(SOURCE)
      .resize(size, size, { fit: 'contain', background: { r: 255, g: 255, b: 255, alpha: 1 } })
      .png()
      .toFile(path.join(dir, 'ic_launcher.png'));
    console.log(`  ✅ ${folder}/ic_launcher.png (${size}x${size})`);

    // ic_launcher_round.png - round launcher icon
    const roundBuffer = await sharp(SOURCE)
      .resize(size, size, { fit: 'cover' })
      .png()
      .toBuffer();

    // Create circular mask
    const circle = Buffer.from(
      `<svg width="${size}" height="${size}">
        <circle cx="${size / 2}" cy="${size / 2}" r="${size / 2}" fill="white"/>
      </svg>`
    );

    await sharp(roundBuffer)
      .composite([{ input: circle, blend: 'dest-in' }])
      .png()
      .toFile(path.join(dir, 'ic_launcher_round.png'));
    console.log(`  ✅ ${folder}/ic_launcher_round.png (${size}x${size})`);
  }
}

async function generateAdaptiveIconForeground() {
  console.log('🔲 Generating Android adaptive icon foreground...');

  for (const [folder, size] of Object.entries(ANDROID_FOREGROUND)) {
    const dir = path.join(ANDROID_RES_DIR, folder);
    fs.mkdirSync(dir, { recursive: true });

    // For adaptive icons, the foreground image should be the logo centered
    // within a larger canvas (108dp with 18dp safe zone on each side = 72dp visible)
    const iconSize = Math.round(size * 0.667); // ~72% of total (safe zone)
    const padding = Math.round((size - iconSize) / 2);

    // Create icon with transparent background, padded for safe zone
    const resizedIcon = await sharp(SOURCE)
      .resize(iconSize, iconSize, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .png()
      .toBuffer();

    await sharp({
      create: {
        width: size,
        height: size,
        channels: 4,
        background: { r: 0, g: 0, b: 0, alpha: 0 },
      },
    })
      .composite([{ input: resizedIcon, left: padding, top: padding }])
      .png()
      .toFile(path.join(dir, 'ic_launcher_foreground.png'));
    console.log(`  ✅ ${folder}/ic_launcher_foreground.png (${size}x${size})`);
  }
}

async function generateSplashIcon() {
  console.log('💦 Generating splash screen icon...');
  const splashDir = path.join(ANDROID_RES_DIR, 'drawable');
  fs.mkdirSync(splashDir, { recursive: true });

  await sharp(SOURCE)
    .resize(512, 512, { fit: 'contain', background: { r: 10, g: 10, b: 10, alpha: 1 } })
    .png()
    .toFile(path.join(splashDir, 'splash.png'));
  console.log('  ✅ drawable/splash.png (512x512)');
}

async function main() {
  console.log('📱 VLS PLUS Icon Generator');
  console.log(`   Source: ${SOURCE}`);
  console.log('');

  await generatePWAIcons();
  console.log('');
  await generateAndroidIcons();
  console.log('');
  await generateAdaptiveIconForeground();
  console.log('');
  await generateSplashIcon();
  console.log('');
  console.log('🎉 All icons generated successfully!');
}

main().catch((err) => {
  console.error('❌ Error generating icons:', err);
  process.exit(1);
});
