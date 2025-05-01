import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

// Get metadata by importing markdown files
// This works at build time with Vite
const modules = import.meta.glob('../*.md', { eager: true });

// Import all available images at build time - Updated to use WebP images for display
const imageModules = import.meta.glob('/static/toys/**/*.webp', { eager: true });

// Create a mapping of toy slugs to their available images
const toyImagesMap: Record<string, string[]> = {};

// Process the image modules to create a mapping
Object.keys(imageModules).forEach(path => {
    // Extract slug and filename from the path
    // Path format: /static/toys/[slug]/[filename].webp
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
    
    // Sort images - main.webp first, then numerical order
    const sortedImages = [...availableImages].sort((a, b) => {
      if (a === 'main.webp') return -1;
      if (b === 'main.webp') return 1;
      
      // Extract numbers from filenames like "1.webp", "2.webp"
      const numA = parseInt(a.match(/^(\d+)/)?.[1] || '999', 10);
      const numB = parseInt(b.match(/^(\d+)/)?.[1] || '999', 10);
      return numA - numB;
    });
    
    // Type the module correctly
    const mod = metadata as { metadata?: Record<string, any> };
    
    return {
      metadata: {
        ...mod.metadata || {}, // Support both SvelteKit's mdsvex format and plain imports
        slug,
        availableImages: sortedImages
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
