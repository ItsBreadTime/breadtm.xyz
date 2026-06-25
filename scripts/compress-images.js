// scripts/compress-images.js
import { promises as fs, createReadStream } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import crypto from 'crypto';
import os from 'os';
import sharp from 'sharp';

// Get directory paths
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');
const fullresDir = path.join(rootDir, 'static', 'fullres', 'toys');
const outputBaseDir = path.join(rootDir, 'static', 'toys');
const stateFile = path.join(outputBaseDir, '.compression-state.json');

// Settings
const VERBOSE = process.argv.includes('--verbose') || process.argv.includes('-v');
const FORCE = process.argv.includes('--force') || process.argv.includes('-f');

const getTotalMemoryGB = () => os.totalmem() / (1024 ** 3);
const totalMemoryGB = getTotalMemoryGB();

// Output formats configurations
const FORMATS = ['webp', 'avif', 'jpg'];
const COMPRESSION_SETTINGS_VERSION = 3;
const THUMBNAIL_MAX_DIMENSION = 640;
const OUTPUT_SIZES = [
  {
    suffix: '',
    resize: ({ originalWidth }) => ({
      width: Math.max(1, Math.round(originalWidth / 2))
    })
  },
  {
    suffix: '-thumb',
    resize: ({ originalWidth, originalHeight }) => {
      const largestDimension = Math.max(originalWidth, originalHeight);
      const scale = Math.min(1, THUMBNAIL_MAX_DIMENSION / largestDimension);

      return {
        width: Math.max(1, Math.round(originalWidth * scale)),
        height: Math.max(1, Math.round(originalHeight * scale)),
        fit: sharp.fit.inside
      };
    }
  }
];

const getEncodingOptions = (suffix) => {
  const isThumbnail = suffix === '-thumb';

  return {
    webp: {
      quality: isThumbnail ? 42 : 40,
      effort: 4,
      smartSubsample: true
    },
    avif: {
      quality: isThumbnail ? 34 : 35,
      effort: isThumbnail ? 3 : 4,
      chromaSubsampling: isThumbnail ? '4:2:0' : '4:4:4'
    },
    jpeg: {
      quality: isThumbnail ? 42 : 40,
      mozjpeg: true,
      chromaSubsampling: isThumbnail ? '4:2:0' : '4:4:4'
    }
  };
};

async function readState() {
  try {
    const data = await fs.readFile(stateFile, 'utf8');
    return JSON.parse(data);
  } catch (err) {
    return {};
  }
}

async function writeState(state) {
  try {
    await fs.writeFile(stateFile, JSON.stringify(state, null, 2));
  } catch (err) {
    if (VERBOSE) console.error('Failed to write state file:', err);
  }
}

async function getFileHash(filePath) {
  return new Promise((resolve, reject) => {
    const hash = crypto.createHash('sha256');
    const stream = createReadStream(filePath);
    stream.on('error', err => reject(err));
    stream.on('data', chunk => hash.update(chunk));
    stream.on('end', () => resolve(hash.digest('hex')));
  });
}

async function scanDirectory(sourceDir, targetDir) {
  const tasks = [];
  try {
    const items = await fs.readdir(sourceDir, { withFileTypes: true });
    
    for (const item of items) {
      const sourcePath = path.join(sourceDir, item.name);
      const targetPath = path.join(targetDir, item.name);
      
      if (item.isDirectory()) {
        await fs.mkdir(targetPath, { recursive: true }).catch(err => {
          if (err.code !== 'EEXIST') console.error(`Error creating directory ${targetPath}:`, err);
        });
        tasks.push(...(await scanDirectory(sourcePath, targetPath)));
      } else if (item.isFile() && /\.(jpe?g|png)$/i.test(item.name)) {
        tasks.push({ sourcePath, targetDir, name: item.name });
      }
    }
  } catch (err) {
    console.error(`Error scanning directory ${sourceDir}:`, err);
  }
  return tasks;
}

// Format duration
function formatDuration(seconds) {
  if (seconds < 60) return `${seconds.toFixed(1)} seconds`;
  if (seconds < 3600) {
    const min = Math.floor(seconds / 60);
    return `${min} min ${(seconds % 60).toFixed(0)} sec`;
  }
  const hrs = Math.floor(seconds / 3600);
  const min = Math.floor((seconds % 3600) / 60);
  return `${hrs} hr ${min} min`;
}

async function processImage(task, state) {
  const { sourcePath, targetDir, name } = task;
  const outputFilename = path.basename(name, path.extname(name));
  const relPath = path.relative(fullresDir, sourcePath);

  // Check hash
  const currentHash = await getFileHash(sourcePath);
  if (
    !FORCE &&
    state[relPath] &&
    state[relPath].hash === currentHash &&
    state[relPath].settingsVersion === COMPRESSION_SETTINGS_VERSION
  ) {
    let allExist = true;
    for (const size of OUTPUT_SIZES) {
      for (const ext of FORMATS) {
        try {
          await fs.access(path.join(targetDir, `${outputFilename}${size.suffix}.${ext}`));
        } catch {
          allExist = false;
          break;
        }
      }
      if (!allExist) break;
    }
    if (allExist) return 'skipped';
  }

  if (VERBOSE) console.log(`Processing ${relPath}...`);

  const metadata = await sharp(sourcePath).metadata();
  
  // EXIF orientations >= 5 swap width and height
  const orientation = metadata.orientation || 1;
  const originalWidth = orientation >= 5 ? metadata.height : metadata.width;
  const originalHeight = orientation >= 5 ? metadata.width : metadata.height;
  const image = sharp(sourcePath).rotate();
  
  const compressions = [];

  for (const size of OUTPUT_SIZES) {
    const resizeOptions = size.resize({ originalWidth, originalHeight });
    const resized = image.clone().resize({
      ...resizeOptions,
      withoutEnlargement: true,
      kernel: sharp.kernel.lanczos3,
      fastShrinkOnLoad: true
    });
    const encodingOptions = getEncodingOptions(size.suffix);

    // WebP balances compression and iteration speed.
    compressions.push(
      resized
        .clone()
        .webp(encodingOptions.webp)
        .toFile(path.join(targetDir, `${outputFilename}${size.suffix}.webp`))
    );

    // AVIF is kept at moderate effort so local regeneration stays practical.
    compressions.push(
      resized
        .clone()
        .avif(encodingOptions.avif)
        .toFile(path.join(targetDir, `${outputFilename}${size.suffix}.avif`))
    );

    // MozJPEG Options
    compressions.push(
      resized
        .clone()
        .jpeg(encodingOptions.jpeg)
        .toFile(path.join(targetDir, `${outputFilename}${size.suffix}.jpg`))
    );
  }

  await Promise.all(compressions);

  state[relPath] = {
    hash: currentHash,
    settingsVersion: COMPRESSION_SETTINGS_VERSION,
    timestamp: Date.now()
  };
  return 'processed';
}

async function main() {
  const startTime = Date.now();
  console.log(`System has ${totalMemoryGB.toFixed(2)}GB total memory.`);
  console.log(`Using sharp for image compression...`);

  await fs.mkdir(outputBaseDir, { recursive: true });
  const state = await readState();
  
  const files = await scanDirectory(fullresDir, outputBaseDir);
  if (files.length === 0) {
    console.log('No images found in fullres directory.');
    return;
  }

  let processed = 0, skipped = 0, failed = 0, completed = 0;
  const totalFiles = files.length;
  
  // Base concurrency on available RAM, kept lower to prevent system lag
  // since Sharp also uses internal multithreading via libvips
  const numWorkers = Math.max(1, Math.min(2, Math.floor(totalMemoryGB / 4)));
  console.log(`Using ${numWorkers} concurrent workers for Sharp image compression...`);

  // We pop from the end of the array to feed workers dynamically
  const worker = async () => {
    while (files.length > 0) {
      const task = files.pop();
      try {
        const result = await processImage(task, state);
        if (result === 'skipped') skipped++;
        else processed++;
      } catch (err) {
        console.error(`Error processing ${task.name}:`, err);
        failed++;
      } finally {
        completed++;
        if (completed % 5 === 0 || completed === totalFiles) {
          const pct = Math.round((completed / totalFiles) * 100);
          console.log(`Progress: ${completed}/${totalFiles} (${pct}%)`);
          writeState(state).catch(() => {});
        }
      }
    }
  };

  await Promise.all(Array.from({ length: numWorkers }, () => worker()));

  await writeState(state);

  const duration = (Date.now() - startTime) / 1000;
  console.log('\n========== COMPRESSION COMPLETE ==========');
  console.log(`⏱️  Total time: ${formatDuration(duration)}`);
  console.log(`✅ Processed: ${processed}`);
  console.log(`⏭️  Skipped (unchanged): ${skipped}`);
  if (failed > 0) console.log(`❌ Failed: ${failed}`);
  if (processed > 0) {
    console.log(`⌛ Average time per processed image: ${(duration / processed).toFixed(2)}s`);
  }
  console.log('==========================================\n');
}

main().catch(err => {
  console.error("Fatal error:", err);
  process.exit(1);
});
