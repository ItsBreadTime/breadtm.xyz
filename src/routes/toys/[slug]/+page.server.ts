import { error } from '@sveltejs/kit';
import { stat, readdir } from 'fs/promises'; // Use promises for async operations
import path from 'path';
import matter from 'gray-matter'; // Need gray-matter to get metadata
import fs from 'fs'; // Need fs sync temporarily for gray-matter
import type { PageServerLoad } from './$types'; // Import the type

const toysPath = path.resolve('src/routes/toys');
const imagesBasePath = path.resolve('static/toys/images');

// Add type annotation for the load function
export const load: PageServerLoad = async ({ params }) => {
    const { slug } = params;
    const filePath = path.join(toysPath, `${slug}.md`);
    const toyImagesPath = path.join(imagesBasePath, slug);

    try {
        // Check if file exists first using async stat
        await stat(filePath);

        // Read file content synchronously (gray-matter is sync)
        const fileContent = fs.readFileSync(filePath, 'utf-8');
        const { data } = matter(fileContent); // Only extract metadata

        // Scan for toy images
        let imageFiles: string[] = [];
        try {
            // Check if the images directory exists
            await stat(toyImagesPath);
            
            // Get all image files from the directory
            const files = await readdir(toyImagesPath);
            
            // Filter to only include image files and sort them properly
            imageFiles = files
                .filter(file => /\.(jpg|jpeg|png|gif|webp)$/i.test(file))
                .sort((a, b) => {
                    // Put 'main' at the beginning
                    if (a.startsWith('main.')) return -1;
                    if (b.startsWith('main.')) return 1;
                    
                    // Parse numeric filenames for proper sorting (1.jpg before 10.jpg)
                    const numA = parseInt(a.split('.')[0]);
                    const numB = parseInt(b.split('.')[0]);
                    if (!isNaN(numA) && !isNaN(numB)) {
                        return numA - numB;
                    }
                    // Fallback to alphabetical sorting
                    return a.localeCompare(b);
                });
        } catch (imgError) {
            console.warn(`No images found for toy: ${slug}. Using default image if available.`);
            // If we have an image from frontmatter, use that
            if (data.image) {
                imageFiles = [data.image];
            }
        }

        // Basic validation for required frontmatter
        if (!data.name) {
             console.warn(`Toy page ${slug}.md is missing required frontmatter (name).`);
             // Potentially throw error(500) if critical
        }

        return {
            // Return serializable metadata with image files
            metadata: {
                ...data,
                imageFiles
            }
        };
    } catch (e: any) { // Add type annotation for 'e'
        // Handle file not found from stat
        if (e?.code === 'ENOENT') { // Use optional chaining
            throw error(404, `Not found: /toys/${slug}`);
        }

        // Handle other errors
        console.error(`Error loading metadata for toy ${slug}:`, e);
        // Re-throw SvelteKit errors if they somehow occur
        if (e?.status) throw e; // Use optional chaining

        // Generic internal error for other issues
        throw error(500, `Failed to load metadata for ${slug}.`);
    }
};
