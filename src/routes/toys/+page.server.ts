import { error } from '@sveltejs/kit';

// Define the structure of the returned toy object
interface ToyData {
    name: string;
    image?: string;
    additionalImages?: string[];
    faction?: string;
    series?: string;
    description?: string;
    year?: string;
    slug: string;
}

// Use Vite's glob import feature to import all markdown files at build time
const modules = import.meta.glob('./*.md', { eager: true });

// Import all available images at build time
// This creates a map of which images exist without client-side network requests
const imageModules = import.meta.glob('/static/toys/images/**/*.jpg', { eager: true });

// Create a mapping of toy slugs to their available images
const toyImagesMap: Record<string, string[]> = {};

// Process the image modules to create a mapping
Object.keys(imageModules).forEach(path => {
    // Extract slug and filename from the path
    // Path format: /static/toys/images/[slug]/[filename].jpg
    const match = path.match(/\/static\/toys\/images\/([^\/]+)\/([^\/]+)$/);
    if (match) {
        const [, slug, filename] = match;
        if (!toyImagesMap[slug]) {
            toyImagesMap[slug] = [];
        }
        toyImagesMap[slug].push(filename);
    }
});

export async function load() {
    try {
        // Transform the imported modules into an array of toy data
        const toys = Object.entries(modules).map(([path, module]) => {
            // Extract slug from path (e.g., "./beeghaj.md" -> "beeghaj")
            const slug = path.replace('./', '').replace('.md', '');
            
            // Extract metadata from the module
            const mod = module as { metadata?: Record<string, any> };
            const metadata = mod.metadata || {};
            
            // Find the primary image for this toy
            let primaryImage: string | undefined = undefined;
            
            // If this toy has images in our map
            if (toyImagesMap[slug] && toyImagesMap[slug].length > 0) {
                // Check for main.jpg first
                if (toyImagesMap[slug].includes('main.jpg')) {
                    primaryImage = 'main.jpg';
                } 
                // Then check for 1.jpg
                else if (toyImagesMap[slug].includes('1.jpg')) {
                    primaryImage = '1.jpg';
                }
                // Otherwise use the first available image
                else {
                    primaryImage = toyImagesMap[slug][0];
                }
            }
            
            return {
                ...metadata,
                slug,
                // Include the primary image in the server response
                primaryImage
            } as ToyData & { primaryImage?: string };
        });

        // Sort toys alphabetically by name
        toys.sort((a, b) => a.name?.localeCompare(b.name || '') || 0);

        return { 
            toys,
            // Send the full images map to the client to avoid discovery requests
            toyImagesMap 
        };
    } catch (e) {
        console.error("Error loading toys:", e);
        throw error(500, 'Failed to load toys data.');
    }
}
