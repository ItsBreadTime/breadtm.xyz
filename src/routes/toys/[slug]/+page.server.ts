import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import precompiledDescriptions from '$lib/precompiled-descriptions.json';

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

const isThumbnail = (filename: string): boolean => /-thumb\.[^.]+$/i.test(filename);
const isFullResolution = (filename: string): boolean => /-full\.[^.]+$/i.test(filename);

const getThumbnailImageKey = (filename: string): string => {
    return getBaseFilename(filename).replace(/-thumb$/i, '');
};

const compareImageKeys = (a: string, b: string): number => {
    if (a === 'main') return -1;
    if (b === 'main') return 1;

    const numA = Number.parseInt(a.match(/^(\d+)/)?.[1] || '', 10);
    const numB = Number.parseInt(b.match(/^(\d+)/)?.[1] || '', 10);
    const hasNumA = !Number.isNaN(numA);
    const hasNumB = !Number.isNaN(numB);

    if (hasNumA && hasNumB && numA !== numB) return numA - numB;
    if (hasNumA !== hasNumB) return hasNumA ? -1 : 1;

    return a.localeCompare(b);
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
      error(404, `Not found: /toys/${slug}`);
    }
    
    // Get list of available images for this toy
    const allImages = toyImagesMap[slug] || [];
    const availableImages = allImages.filter(filename => !isThumbnail(filename) && !isFullResolution(filename));
    const availableThumbnails = allImages.filter(isThumbnail);
    
    // Group images by base filename (without extension)
    const baseFilenameGroups: Record<string, string[]> = {};
    const thumbnailFilenameGroups: Record<string, string[]> = {};
    
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

    availableThumbnails.forEach(filename => {
        const base = getThumbnailImageKey(filename);
        if (!thumbnailFilenameGroups[base]) {
            thumbnailFilenameGroups[base] = [];
        }
        thumbnailFilenameGroups[base].push(filename);
        thumbnailFilenameGroups[base].sort((a, b) => {
            const extA = getExtension(a);
            const extB = getExtension(b);
            return FORMAT_PRIORITY.indexOf(extA) - FORMAT_PRIORITY.indexOf(extB);
        });
    });
    
    // Get the sorted base filenames: main first, then numeric names, then alpha.
    const sortedBaseFilenames = Object.keys(baseFilenameGroups).sort(compareImageKeys);
    
    // Type the module correctly
    const mod = metadata as { metadata?: Record<string, any>; default?: any };
    
    // Extract only serializable metadata
    const serializedMetadata = { ...mod.metadata || {} };
    
    // Use precompiled description if available
    const precompiled = precompiledDescriptions as Record<string, string>;
    if (precompiled[slug]) {
        serializedMetadata.description = precompiled[slug];
    }

    return {
      metadata: {
        ...serializedMetadata, 
        slug,
        // Pass the grouped images and the sorted keys
        imageSets: baseFilenameGroups, 
        thumbnailImageSets: thumbnailFilenameGroups,
        sortedImageKeys: sortedBaseFilenames
      }
    };
  } catch (e) {
    // If this is already a SvelteKit error, rethrow it
    if (e && typeof e === 'object' && 'status' in e) throw e;
    
    // Otherwise, throw a generic error
    console.error(`Error loading metadata for toy ${slug}:`, e);
    error(500, `Failed to load metadata for ${slug}.`);
  }
};
