import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

// Define image format priority - highest quality/efficiency first
const FORMAT_PRIORITY = ['avif', 'webp', 'jpg', 'jpeg', 'png'];

// Get metadata by importing markdown files
// This works at build time with Vite
const modules = import.meta.glob('../*.md', { eager: true });

// Import all available images at build time - Updated to support multiple formats
const imageModules = import.meta.glob('/static/toys/**/*.{avif,webp,jpg,jpeg,png}', { eager: true });

// Create a mapping of toy slugs to their available images
const toyImagesMap: Record<string, string[]> = {};

// Helper function to get base filename without extension
const getBaseFilename = (filename: string): string => {
    return filename.split('.').slice(0, -1).join('.');
};

// Helper function to get file extension
const getExtension = (filename: string): string => {
    return filename.split('.').pop()?.toLowerCase() || '';
};

// Process the image modules to create a mapping
Object.keys(imageModules).forEach(path => {
    // Extract slug and filename from the path
    // Path format: /static/toys/[slug]/[filename].[ext]
    const match = path.match(/\/static\/toys\/([^\/]+)\/([^\/]+)$/);
    if (match) {
        const [, slug, filename] = match;
        if (!toyImagesMap[slug]) {
            toyImagesMap[slug] = [];
        }
        toyImagesMap[slug].push(filename);
    }
});

export const load: PageServerLoad = async ({ params }) => {
  const { slug } = params;
  
  try {
    // Look up toy metadata from the map
    const metadata = modules[`../${slug}.md`];
    
    if (!metadata) {
      throw error(404, `Not found: /toys/${slug}`);
    }
    
    // Get list of available images for this toy
    const availableImages = toyImagesMap[slug] || [];
    
    // Group images by base filename (without extension)
    const baseFilenameGroups: Record<string, string[]> = {};
    
    availableImages.forEach(filename => {
        const base = getBaseFilename(filename);
        if (!baseFilenameGroups[base]) {
            baseFilenameGroups[base] = [];
        }
        // Sort formats within the group according to priority
        baseFilenameGroups[base].push(filename);
        baseFilenameGroups[base].sort((a, b) => {
            const extA = getExtension(a);
            const extB = getExtension(b);
            return FORMAT_PRIORITY.indexOf(extA) - FORMAT_PRIORITY.indexOf(extB);
        });
    });
    
    // Get the sorted base filenames (main first, then numeric)
    const sortedBaseFilenames = Object.keys(baseFilenameGroups).sort((a, b) => {
      if (a === 'main') return -1;
      if (b === 'main') return 1;
      
      const numA = parseInt(a.match(/^(\d+)/)?.[1] || '999', 10);
      const numB = parseInt(b.match(/^(\d+)/)?.[1] || '999', 10);
      return numA - numB;
    });
    
    // Type the module correctly
    const mod = metadata as { metadata?: Record<string, any> };
    
    return {
      metadata: {
        ...mod.metadata || {}, 
        slug,
        // Pass the grouped images and the sorted keys
        imageSets: baseFilenameGroups, 
        sortedImageKeys: sortedBaseFilenames,
        // Deprecate availableImages and imageFormats if no longer needed directly
        // availableImages: sortedImages, // Keep if needed elsewhere, otherwise remove
        // imageFormats: FORMAT_PRIORITY // Keep if needed elsewhere, otherwise remove
      }
    };
  } catch (e) {
    // If this is already a SvelteKit error, rethrow it
    if (e && typeof e === 'object' && 'status' in e) throw e;
    
    // Otherwise, throw a generic error
    console.error(`Error loading metadata for toy ${slug}:`, e);
    throw error(500, `Failed to load metadata for ${slug}.`);
  }
};
