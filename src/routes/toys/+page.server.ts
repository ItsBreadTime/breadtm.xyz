import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';
import { error } from '@sveltejs/kit';
import { readdir, stat } from 'fs/promises';

const toysPath = path.resolve('src/routes/toys');
const imagesBasePath = path.resolve('static/toys/images');

// Define an interface for the expected frontmatter structure
interface ToyFrontmatter {
    name: string;
    image?: string;
    additionalImages?: string[];
    faction?: string;
    series?: string;
    description?: string;
    year?: string;
    // Add other potential fields
}

// Define the structure of the returned toy object
interface ToyData extends ToyFrontmatter {
    slug: string;
    imageFiles: string[]; // Changed from optional to required string[]
}

export async function load() {
    try {
        const files = fs.readdirSync(toysPath).filter((file: string) => file.endsWith('.md'));

        const toyPromises = files.map(async (filename: string) => {
            const filePath = path.join(toysPath, filename);
            const fileContent = fs.readFileSync(filePath, 'utf-8');
            const { data } = matter(fileContent) as unknown as { data: ToyFrontmatter }; // Type assertion for gray-matter data
            const slug = filename.replace('.md', '');

            // Basic validation
            if (!data.name) {
                console.warn(`Skipping ${filename}: missing 'name' frontmatter.`);
                return null;
            }

            // Find available images for this toy
            let imageFiles: string[] = [];
            const toyImagesPath = path.join(imagesBasePath, slug);
            
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
                
                // If we found images but no 'image' property is set in frontmatter, 
                // use the first image as the default
                if (imageFiles.length > 0 && !data.image) {
                    data.image = imageFiles[0];
                }
            } catch (imgError) {
                console.warn(`No images found for toy: ${slug}.`);
                // If we have no image directory but frontmatter has an image, keep that
            }
            
            // If no images were found and no image is specified in frontmatter, this is a problem
            if (imageFiles.length === 0 && !data.image) {
                console.warn(`Toy ${slug} has no images and no image specified in frontmatter.`);
                data.image = 'placeholder.jpg'; // Set a placeholder
            }

            return {
                slug,
                ...data, // Spread frontmatter data
                imageFiles // Include available images
            };
        });

        const toys: ToyData[] = (await Promise.all(toyPromises))
            .filter((toy: ToyData | null): toy is ToyData => toy !== null); // Type guard to filter out nulls and refine type

        // Sort toys alphabetically by name
        toys.sort((a: ToyData, b: ToyData) => a.name.localeCompare(b.name));

        return {
            toys
        };
    } catch (e: unknown) { // Type the error as unknown
        // Check if 'e' is an error object with a 'code' property
        if (typeof e === 'object' && e !== null && 'code' in e && (e as { code: string }).code === 'ENOENT') {
            console.warn("'/src/routes/toys' directory not found. Returning empty toys list.");
            return { toys: [] };
        }
        // For other errors, re-throw a SvelteKit error
        console.error("Error loading toys:", e);
        throw error(500, 'Failed to load toys data.');
    }
}
