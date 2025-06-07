import { error } from '@sveltejs/kit';
import precompiledDescriptions from '$lib/precompiled-descriptions.json';

// Define the structure of the returned toy object
interface ToyData {
    name: string;
    image?: string;
    additionalImages?: string[];
    faction?: string;
    series?: string;
    description?: string;
    year?: string;
    order?: number;
    slug: string;
}

// Define image format priority - highest quality/efficiency first
const FORMAT_PRIORITY = ['avif', 'webp', 'jpg', 'jpeg', 'png'];

// Use Vite's glob import feature to import all markdown files at build time
const modules = import.meta.glob('./*.md', { eager: true });

// Import all available images at build time - Updated to support multiple formats
const imageModules = import.meta.glob('/static/toys/**/*.{avif,webp,jpg,jpeg,png}', { eager: true });

// Create a mapping of toy slugs to their available images
const toyImagesMap: Record<string, string[]> = {};

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

// Helper function to get base filename without extension
const getBaseFilename = (filename: string): string => {
    return filename.split('.').slice(0, -1).join('.');
};

// Helper function to get file extension
const getExtension = (filename: string): string => {
    return filename.split('.').pop()?.toLowerCase() || '';
};

export async function load() {
    try {
        // Create the toy data objects with precompiled descriptions
        const moduleEntries = Object.entries(modules);
        const toys = moduleEntries.map(([path, module]) => {
            // Extract slug from path (e.g., "./beeghaj.md" -> "beeghaj")
            const slug = path.replace('./', '').replace('.md', '');
            
            // Extract metadata from the module
            const mod = module as { metadata?: Record<string, any> };
            const metadata = { ...mod.metadata } || {}; 
            
            // Use precompiled description if available
            const precompiled = precompiledDescriptions as Record<string, string>;
            if (precompiled[slug]) {
                metadata.description = precompiled[slug];
            }
            
            // Find the primary image for this toy
            let primaryImage: string | undefined = undefined;
            
            // If this toy has images in our map
            if (toyImagesMap[slug] && toyImagesMap[slug].length > 0) {
                // Group images by base filename (without extension)
                const baseFilenameGroups: Record<string, string[]> = {};
                
                toyImagesMap[slug].forEach(filename => {
                    const base = getBaseFilename(filename);
                    if (!baseFilenameGroups[base]) {
                        baseFilenameGroups[base] = [];
                    }
                    baseFilenameGroups[base].push(filename);
                });
                
                // Find the "main" image in the best available format
                let mainImages = baseFilenameGroups['main'] || [];
                if (mainImages.length > 0) {
                    // Sort by format priority
                    mainImages.sort((a, b) => {
                        const extA = getExtension(a);
                        const extB = getExtension(b);
                        return FORMAT_PRIORITY.indexOf(extA) - FORMAT_PRIORITY.indexOf(extB);
                    });
                    primaryImage = mainImages[0];
                }
                // If no "main" image, try for images named "1" in best format
                else {
                    const oneImages = baseFilenameGroups['1'] || [];
                    if (oneImages.length > 0) {
                        oneImages.sort((a, b) => {
                            const extA = getExtension(a);
                            const extB = getExtension(b);
                            return FORMAT_PRIORITY.indexOf(extA) - FORMAT_PRIORITY.indexOf(extB);
                        });
                        primaryImage = oneImages[0];
                    }
                    // Otherwise use the first available image
                    else {
                        // Get all base filenames
                        const allBaseFilenames = Object.keys(baseFilenameGroups);
                        // Sort numerically if possible
                        allBaseFilenames.sort((a, b) => {
                            const numA = parseInt(a, 10);
                            const numB = parseInt(b, 10);
                            if (!isNaN(numA) && !isNaN(numB)) {
                                return numA - numB;
                            }
                            return a.localeCompare(b);
                        });
                        
                        if (allBaseFilenames.length > 0) {
                            const firstBaseFilename = allBaseFilenames[0];
                            const firstFormatImages = baseFilenameGroups[firstBaseFilename];
                            
                            // Sort by format priority
                            firstFormatImages.sort((a, b) => {
                                const extA = getExtension(a);
                                const extB = getExtension(b);
                                return FORMAT_PRIORITY.indexOf(extA) - FORMAT_PRIORITY.indexOf(extB);
                            });
                            
                            primaryImage = firstFormatImages[0];
                        }
                    }
                }
            }
            
            return {
                ...metadata,
                slug,
                // Include the primary image in the server response
                primaryImage
            } as ToyData & { primaryImage?: string };
        });

        // Define the structure with order field
        interface ToyWithOrder extends ToyData {
            primaryImage?: string;
            order?: number;
        }

        const toysWithOrder = toys as ToyWithOrder[];

        // Sort toys: first by order (if specified), then alphabetically by name
        toysWithOrder.sort((a, b) => {
            // If both have order values, sort by order
            if (a.order !== undefined && b.order !== undefined) {
                return a.order - b.order;
            }
            // If only one has an order value, prioritize it
            if (a.order !== undefined && b.order === undefined) {
                return -1;
            }
            if (a.order === undefined && b.order !== undefined) {
                return 1;
            }
            // If neither has an order value, sort alphabetically by name
            return a.name?.localeCompare(b.name || '') || 0;
        });

        return { 
            toys: toysWithOrder,
            // Send the full images map to the client to avoid discovery requests
            toyImagesMap 
        };
    } catch (e) {
        console.error("Error loading toys:", e);
        throw error(500, 'Failed to load toys data.');
    }
}
