// scripts/compress-images.js
import { exec } from 'child_process';
import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { promisify } from 'util';
import os from 'os';
import { spawn } from 'child_process';

// Get directory paths
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');
const fullresDir = path.join(rootDir, 'static', 'fullres', 'toys');
const outputBaseDir = path.join(rootDir, 'static', 'toys');
const tempDir = path.join(rootDir, 'temp');

// Promisify exec for getting image dimensions and running commands
const execPromise = promisify(exec);

// Memory monitoring settings
const MEMORY_CHECK_INTERVAL = 5000; // Check memory every 5 seconds
const MEMORY_THRESHOLD = 0.8; // If system memory usage is > 80%, pause processing
const PAUSE_DURATION = 10000; // Pause for 10 seconds if memory threshold exceeded
let processingPaused = false;

// Parse command line arguments
const args = process.argv.slice(2);
const shouldNotOverride = args.includes('-n') || args.includes('--no-override');

// Add a command-line argument to support a maximum memory target
const maxMemoryArg = args.find(arg => arg.startsWith('--max-memory='));
const customMemoryThreshold = maxMemoryArg 
  ? parseFloat(maxMemoryArg.split('=')[1]) / 100
  : MEMORY_THRESHOLD;

// Additional command line arguments for different functionality
const lowMemoryMode = args.includes('--low-memory');
const verboseMode = args.includes('-v') || args.includes('--verbose');

// Update memory threshold if requested
const effectiveMemoryThreshold = lowMemoryMode 
  ? Math.min(customMemoryThreshold, 0.6) // In low memory mode, cap at 60%
  : customMemoryThreshold;

// Determine the number of concurrent tasks to run
// Dynamically adapt based on available memory - use fewer cores on low-memory systems
const getTotalMemoryGB = () => {
  const totalMemoryBytes = os.totalmem();
  return totalMemoryBytes / (1024 * 1024 * 1024); // Convert to GB
};

const totalMemoryGB = getTotalMemoryGB();
// Determine concurrent tasks based on memory constraints
const getMaxConcurrentTasks = () => {
  // Base calculations on available memory and CPU cores
  const cpuCount = os.cpus().length;
  
  // In low memory mode, use at most 2 tasks or 25% of CPU cores
  if (lowMemoryMode || totalMemoryGB < 4) {
    return Math.max(1, Math.min(2, Math.floor(cpuCount * 0.25)));
  } 
  // For systems with modest memory
  else if (totalMemoryGB < 8) {
    return Math.max(1, Math.floor(cpuCount * 0.33));
  } 
  // For systems with ample memory
  else {
    return Math.max(1, Math.floor(cpuCount * 0.5));
  }
};

const MAX_CONCURRENT_TASKS = getMaxConcurrentTasks();

// Tracking stats
let startTime;
let totalImages = 0;
let processedImages = 0;
let skippedImages = 0;
let failedImages = 0;
let completedTasks = 0; // Track completed tasks separately from processed images

// Image formats to generate
const FORMATS = ['webp', 'avif', 'mozjpeg'];

// Function to get current memory usage
async function getSystemMemoryUsage() {
  try {
    const { stdout } = await execPromise('free -m');
    const lines = stdout.trim().split('\n');
    const memoryLine = lines[1].split(/\s+/);
    
    const total = parseInt(memoryLine[1]);
    const used = parseInt(memoryLine[2]);
    const usageRatio = used / total;
    
    return { 
      total,          // Total memory in MB
      used,           // Used memory in MB
      free: total - used, // Free memory in MB
      usageRatio     // Ratio of used memory (0-1)
    };
  } catch (error) {
    console.error("Error getting memory usage:", error);
    // Return a default that won't trigger throttling
    return { usageRatio: 0.5 };
  }
}

// Process images with squoosh-cli
async function processImages() {
  try {
    startTime = Date.now();
    console.log(`System has ${totalMemoryGB.toFixed(2)}GB total memory.`);
    console.log(`Memory threshold set to ${effectiveMemoryThreshold * 100}% - will pause processing if exceeded.`);
    
    // Start memory monitoring
    const memoryMonitor = startMemoryMonitor();
    
    // Ensure temp directory exists
    try {
      await fs.mkdir(tempDir, { recursive: true });
    } catch (err) {
      if (err.code !== 'EEXIST') {
        console.error(`Error creating temp directory: ${err}`);
      }
    }

    // Ensure output base directory exists
    try {
      await fs.mkdir(outputBaseDir, { recursive: true });
    } catch (err) {
      if (err.code !== 'EEXIST') {
        console.error(`Error creating output base directory: ${err}`);
      }
    }

    // Recursively find all JPG files in the fullres/toys directory
    const imageProcessingTasks = [];
    
    // Scan directories and collect files recursively
    await scanDirectory(fullresDir, outputBaseDir, imageProcessingTasks);
    
    if (imageProcessingTasks.length === 0) {
      console.log('No images to process.');
      clearInterval(memoryMonitor);
      return;
    }
    
    totalImages = imageProcessingTasks.length;
    console.log(`Total queued tasks: ${totalImages}`);
    console.log(`Override mode: ${shouldNotOverride ? 'OFF (skipping existing files)' : 'ON (replacing existing files)'}`);
    console.log(`Using up to ${MAX_CONCURRENT_TASKS} concurrent tasks (based on CPU cores and memory)`);
    
    // Process images in parallel with limited concurrency
    await processImagesInParallel(imageProcessingTasks, MAX_CONCURRENT_TASKS);
    
    // Clean up temp directory
    try {
      const tempFiles = await fs.readdir(tempDir);
      for (const file of tempFiles) {
        await fs.unlink(path.join(tempDir, file));
      }
    } catch (err) {
      console.error('Error cleaning up temp directory:', err);
    }
    
    // Stop memory monitoring
    clearInterval(memoryMonitor);
    
    // Print final summary with timing info only if we've processed all images
    if (completedTasks >= totalImages) {
      const endTime = Date.now();
      const duration = (endTime - startTime) / 1000; // convert to seconds
      
      console.log('\n========== COMPRESSION COMPLETE ==========');
      console.log(`⏱️  Total processing time: ${formatDuration(duration)}`);
      console.log(`✅ Successfully processed: ${processedImages} images`);
      console.log(`⏭️  Skipped (already exist): ${skippedImages} images`);
      
      if (failedImages > 0) {
        console.log(`❌ Failed: ${failedImages} images`);
      }
      
      // Print per-image average time
      if (processedImages > 0) {
        const avgTimePerImage = duration / processedImages;
        console.log(`⌛ Average time per image: ${avgTimePerImage.toFixed(2)} seconds`);
      }
      
      console.log('==========================================\n');
    }
    
  } catch (err) {
    console.error('Error processing images:', err);
    process.exit(1);
  }
}

// Format duration in a human-readable format
function formatDuration(seconds) {
  if (seconds < 60) {
    return `${seconds.toFixed(1)} seconds`;
  } else if (seconds < 3600) {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes} minute${minutes !== 1 ? 's' : ''} ${remainingSeconds.toFixed(0)} second${remainingSeconds !== 1 ? 's' : ''}`;
  } else {
    const hours = Math.floor(seconds / 3600);
    const remainingMinutes = Math.floor((seconds % 3600) / 60);
    return `${hours} hour${hours !== 1 ? 's' : ''} ${remainingMinutes} minute${remainingMinutes !== 1 ? 's' : ''}`;
  }
}

// Start monitoring memory usage
function startMemoryMonitor() {
  return setInterval(async () => {
    try {
      const memoryInfo = await getSystemMemoryUsage();
      
      // Log memory usage periodically
      if (verboseMode || memoryInfo.usageRatio > (effectiveMemoryThreshold * 0.8)) {
        console.log(`Memory usage: ${(memoryInfo.usageRatio * 100).toFixed(1)}% (${memoryInfo.used}MB/${memoryInfo.total}MB)`);
      }
      
      // If memory usage exceeds threshold, pause processing
      if (memoryInfo.usageRatio > effectiveMemoryThreshold && !processingPaused) {
        processingPaused = true;
        console.warn(`⚠️ High memory usage detected (${(memoryInfo.usageRatio * 100).toFixed(1)}%)! Pausing processing for ${PAUSE_DURATION/1000}s to allow memory to be released...`);
        
        // Optionally trigger garbage collection if --expose-gc flag is enabled
        if (global.gc) {
          console.log('Triggering garbage collection...');
          global.gc();
        }
        
        // Resume after pause duration
        setTimeout(() => {
          processingPaused = false;
          console.log('Resuming processing...');
        }, PAUSE_DURATION);
      }
    } catch (error) {
      console.error('Error in memory monitor:', error);
    }
  }, MEMORY_CHECK_INTERVAL);
}

// Recursively scan directories and collect image files
async function scanDirectory(sourceDir, targetDir, tasks) {
  try {
    // Get all items in the source directory
    const items = await fs.readdir(sourceDir, { withFileTypes: true });
    
    // Process directories and files
    for (const item of items) {
      const sourcePath = path.join(sourceDir, item.name);
      const targetPath = path.join(targetDir, item.name);
      
      if (item.isDirectory()) {
        // Create corresponding directory in target
        try {
          await fs.mkdir(targetPath, { recursive: true });
          console.log(`Created directory: ${targetPath}`);
        } catch (err) {
          if (err.code !== 'EEXIST') {
            console.error(`Error creating directory ${targetPath}:`, err);
            continue;
          }
        }
        
        // Recursively scan subdirectories
        await scanDirectory(sourcePath, targetPath, tasks);
      } 
      else if (item.isFile() && (
          item.name.toLowerCase().endsWith('.jpg') || 
          item.name.toLowerCase().endsWith('.jpeg')
      )) {
        // Process JPG/JPEG files
        const outputFilename = path.basename(item.name, path.extname(item.name));
        
        // Get relative path from fullresDir for logging
        const relPath = path.relative(fullresDir, sourceDir);
        
        // Add tasks for each format
        for (const format of FORMATS) {
          tasks.push({
            sourcePath,
            targetDir,
            outputFilename,
            format,
            relPath
          });
        }
      }
    }
    
    // Return count of tasks added
    return tasks.length;
  } catch (err) {
    console.error(`Error scanning directory ${sourceDir}:`, err);
    return 0;
  }
}

// Process images in parallel with limited concurrency
async function processImagesInParallel(tasks, concurrency) {
  // Keep track of completion statistics
  let completed = 0;
  let lastProgressUpdate = Date.now();
  const PROGRESS_UPDATE_INTERVAL = 3000; // 3 seconds
  
  const updateProgress = () => {
    const now = Date.now();
    if (now - lastProgressUpdate >= PROGRESS_UPDATE_INTERVAL) {
      const percent = Math.round((completed / tasks.length) * 100);
      const elapsedSeconds = (now - startTime) / 1000;
      const estimatedTotalSeconds = completed > 0 ? (elapsedSeconds / completed) * tasks.length : 0;
      const remainingSeconds = estimatedTotalSeconds - elapsedSeconds;
      
      console.log(`Progress: ${completed}/${tasks.length} (${percent}%) - EST remaining: ${formatDuration(remainingSeconds)}`);
      lastProgressUpdate = now;
    }
  };
  
  // Create a pool of workers
  const runningPromises = new Set();
  const taskQueue = [...tasks];
  
  // Helper function to start a new task
  const startNextTask = async () => {
    if (taskQueue.length === 0) return;
    
    // If processing is paused due to memory pressure, don't start new tasks
    if (processingPaused) {
      setTimeout(startNextTask, 1000); // Try again in 1 second
      return;
    }
    
    const task = taskQueue.shift();
    const { sourcePath, targetDir, outputFilename, format, relPath } = task;
    
    const promise = (async () => {
      try {
        const result = await compressImage(sourcePath, targetDir, outputFilename, format);
        completed++;
        completedTasks++; // Increment completed tasks counter
        
        // Update our statistical counters based on the result
        if (result === 'skipped') {
          skippedImages++;
        } else if (result === 'success') {
          processedImages++;
        } else {
          failedImages++;
        }
        
        updateProgress();
      } catch (error) {
        console.error(`Error processing ${path.relative(fullresDir, sourcePath)} (${format}):`, error);
        failedImages++;
        completedTasks++; // Still increment completed tasks even if failed
      } finally {
        runningPromises.delete(promise);
        // Start next task when this one finishes
        startNextTask();
      }
    })();
    
    runningPromises.add(promise);
  };
  
  // Start initial batch of tasks up to concurrency limit
  for (let i = 0; i < Math.min(concurrency, tasks.length); i++) {
    startNextTask();
  }
  
  // Wait for all tasks to complete
  while (runningPromises.size > 0) {
    await Promise.race(runningPromises);
    // No need to start new tasks here as they're started in the finally block above
  }
  
  console.log(`Completed ${completed}/${tasks.length} tasks.`);
}

// Get image dimensions and orientation using ImageMagick
async function getImageInfo(imagePath) {
  try {
    // Get dimensions
    const { stdout: dimensionsOutput } = await execPromise(`identify -format "%w %h" "${imagePath}"`);
    const [width, height] = dimensionsOutput.trim().split(' ').map(Number);
    
    // Get orientation value (1-8)
    const { stdout: orientationOutput } = await execPromise(`identify -format "%[orientation]" "${imagePath}"`);
    const orientation = parseInt(orientationOutput.trim()) || 1; // Default to 1 if undefined
    
    return { width, height, orientation };
  } catch (error) {
    console.error(`Error getting image info for ${imagePath}:`, error);
    // Return default values if can't get dimensions
    return { width: 0, height: 0, orientation: 1 };
  }
}

// Function to compress a single image
async function compressImage(sourcePath, targetDir, outputFilename, format) {
  return new Promise(async (resolve, reject) => {
    let tempFilePath = null; // Keep track of temp file path for cleanup
    try {
      const outputExt = format === 'mozjpeg' ? 'jpg' : format;
      const finalOutputFile = path.join(targetDir, `${outputFilename}.${outputExt}`);
      
      if (shouldNotOverride) {
        try {
          await fs.access(finalOutputFile);
          console.log(`File already exists, skipping: ${finalOutputFile}`);
          resolve('skipped');
          return;
        } catch (err) { /* File doesn't exist, continue */ }
      }

      const uuid = Date.now().toString(36) + Math.random().toString(36).substring(2);
      const tempInputFilename = `${uuid}.jpg`;
      tempFilePath = path.join(tempDir, tempInputFilename); // Assign here
      
      const imageInfo = await getImageInfo(sourcePath);
      try {
        console.log(`Processing ${path.basename(sourcePath)} (orientation: ${imageInfo.orientation})...`);
        await execPromise(`convert "${sourcePath}" -auto-orient "${tempFilePath}"`);
      } catch (err) {
        console.error(`Error normalizing orientation: ${err.message}`);
        await fs.copyFile(sourcePath, tempFilePath);
      }
      
      const normalizedInfo = await getImageInfo(tempFilePath);
      const halfWidth = Math.round(normalizedInfo.width / 2);
      const halfHeight = Math.round(normalizedInfo.height / 2);
      const resizeOptions = `{"enabled":true,"width":${halfWidth},"height":${halfHeight},"method":"catrom","fitMethod":"stretch","premultiply":true,"linearRGB":true}`;
      
      // Build the arguments array for spawn - use -d for directory
      const args = [
        '@frostoven/squoosh-cli',
        '--resize', resizeOptions
      ];
      
      if (format === 'webp') {
        const webpOptions = '{"quality":40,"target_size":0,"target_PSNR":0,"method":4,"sns_strength":50,"filter_strength":60,"filter_sharpness":0,"filter_type":1,"partitions":0,"segments":4,"pass":1,"show_compressed":0,"preprocessing":0,"autofilter":0,"partition_limit":0,"alpha_compression":1,"alpha_filtering":1,"alpha_quality":100,"lossless":0,"exact":0,"image_hint":0,"emulate_jpeg_size":0,"thread_level":0,"low_memory":0,"near_lossless":100,"use_delta_palette":0,"use_sharp_yuv":0}';
        args.push('--webp', webpOptions);
      } else if (format === 'avif') {
        const avifOptions = '{"cqLevel":32,"cqAlphaLevel":-1,"subsample":1,"tileColsLog2":0,"tileRowsLog2":0,"speed":6,"chromaDeltaQ":false,"sharpness":2,"denoiseLevel":0,"tune":0}';
        args.push('--avif', avifOptions);
      } else if (format === 'mozjpeg') {
        const mozjpegOptions = '{"quality":40,"baseline":false,"arithmetic":false,"progressive":true,"optimize_coding":true,"smoothing":0,"color_space":3,"quant_table":3,"trellis_multipass":false,"trellis_opt_zero":false,"trellis_opt_table":false,"trellis_loops":1,"auto_subsample":true,"chroma_subsample":2,"separate_chroma_quality":false,"chroma_quality":75}';
        args.push('--mozjpeg', mozjpegOptions);
      }
      
      // Add output directory and input file
      args.push('-d', targetDir, tempFilePath);

      console.log(`Creating ${format.toUpperCase()} for ${path.relative(fullresDir, sourcePath)}...`);
      
      await waitIfProcessingPaused();
      
      const child = spawn('npx', args, {
        stdio: ['ignore', 'pipe', 'pipe']
      });
      
      let stdoutData = '';
      let stderrData = '';
      child.stdout.on('data', (data) => { stdoutData += data.toString(); });
      child.stderr.on('data', (data) => { stderrData += data.toString(); console.error(`[squoosh stderr]: ${data}`); });
      
      child.on('close', async (code) => {
        // Determine the temporary output filename squoosh would create
        const tempOutputFilename = `${path.basename(tempInputFilename, '.jpg')}.${outputExt}`;
        const tempOutputFile = path.join(targetDir, tempOutputFilename);

        // Always try to clean up the input temp file
        if (tempFilePath) {
          try {
            await fs.unlink(tempFilePath);
          } catch (unlinkErr) {
            if (unlinkErr.code !== 'ENOENT') {
              console.error(`Error deleting temp input file ${tempFilePath}:`, unlinkErr);
            }
          }
        }

        if (code !== 0) {
          console.error(`Error compressing ${path.relative(fullresDir, sourcePath)} to ${format}. Exit code: ${code}`);
          reject(new Error(`Process exited with code ${code}`));
          return;
        }
        
        // Squoosh finished, now rename the temp output to the final name
        try {
          await fs.rename(tempOutputFile, finalOutputFile);
          console.log(`✓ Created ${path.relative(outputBaseDir, finalOutputFile)}`);
          resolve('success');
        } catch (renameErr) {
          console.error(`Failed to rename temp output file ${tempOutputFile} to ${finalOutputFile}:`, renameErr);
          console.error(`Stdout: ${stdoutData}`);
          // Try to clean up the temp output file if rename failed
          try {
            await fs.unlink(tempOutputFile);
          } catch (cleanupErr) {
            if (cleanupErr.code !== 'ENOENT') {
              console.error(`Error deleting temp output file ${tempOutputFile} after failed rename:`, cleanupErr);
            }
          }
          reject(new Error(`Failed to rename output file: ${renameErr.message}`));
        }
      });

      child.on('error', (err) => {
        console.error(`Failed to start squoosh process for ${sourcePath}:`, err);
        // Try to clean up temp input file on spawn error too
        if (tempFilePath) {
          fs.unlink(tempFilePath).catch(unlinkErr => {
            if (unlinkErr.code !== 'ENOENT') console.error(`Error deleting temp input file ${tempFilePath} after spawn error:`, unlinkErr);
          });
        }
        reject(err);
      });

    } catch (err) {
      console.error(`Error processing ${path.relative(fullresDir, sourcePath)}:`, err);
      // Try to clean up temp input file on general error
      if (tempFilePath) {
        fs.unlink(tempFilePath).catch(unlinkErr => {
          if (unlinkErr.code !== 'ENOENT') console.error(`Error deleting temp input file ${tempFilePath} after error:`, unlinkErr);
        });
      }
      reject(err);
    }
  });
}

// Helper function to wait if processing is paused
async function waitIfProcessingPaused() {
  if (!processingPaused) return;
  
  return new Promise(resolve => {
    const checkInterval = setInterval(() => {
      if (!processingPaused) {
        clearInterval(checkInterval);
        resolve();
      }
    }, 1000);
  });
}

// Run the main function
processImages();