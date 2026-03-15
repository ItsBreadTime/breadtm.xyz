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
  if (!FORCE && state[relPath] && state[relPath].hash === currentHash) {
    let allExist = true;
    for (const ext of FORMATS) {
      try {
        await fs.access(path.join(targetDir, `${outputFilename}.${ext}`));
      } catch {
        allExist = false;
        break;
      }
    }
    if (allExist) return 'skipped';
  }

  if (VERBOSE) console.log(`Processing ${relPath}...`);

  const image = sharp(sourcePath).withMetadata().rotate();
  const metadata = await image.metadata();
  
  // EXIF orientations >= 5 swap width and height
  const orientation = metadata.orientation || 1;
  const originalWidth = orientation >= 5 ? metadata.height : metadata.width;
  
  const halfWidth = Math.max(1, Math.round(originalWidth / 2));
  
  const resized = image.resize({
    width: halfWidth,
    kernel: sharp.kernel.lanczos3,
    fastShrinkOnLoad: true
  });

  const compressions = [];

  // WebP Options (adjusted to reduce size, effort max is 6)
  compressions.push(
    resized.clone().webp({
      quality: 40,
      effort: 6,
      smartSubsample: true
    }).toFile(path.join(targetDir, `${outputFilename}.webp`))
  );

  // AVIF Options (reduced quality scale, max effort 9, 4:4:4 subsampling)
  compressions.push(
    resized.clone().avif({
      quality: 35,
      effort: 9,
      chromaSubsampling: '4:4:4'
    }).toFile(path.join(targetDir, `${outputFilename}.avif`))
  );

  // MozJPEG Options
  compressions.push(
    resized.clone().jpeg({
      quality: 40,
      mozjpeg: true,
      chromaSubsampling: '4:4:4'
    }).toFile(path.join(targetDir, `${outputFilename}.jpg`))
  );

  await Promise.all(compressions);

  state[relPath] = { hash: currentHash, timestamp: Date.now() };
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
