import { readFileSync, writeFileSync, readdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { compile } from 'mdsvex';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const TOYS_DIR = join(__dirname, '../src/routes/toys');
const OUTPUT_FILE = join(__dirname, '../src/lib/precompiled-descriptions.json');

// Simple frontmatter parser
function parseFrontmatter(content) {
    const lines = content.split('\n');
    if (lines[0] !== '---') return { metadata: {}, content };
    
    let endIndex = -1;
    for (let i = 1; i < lines.length; i++) {
        if (lines[i] === '---') {
            endIndex = i;
            break;
        }
    }
    
    if (endIndex === -1) return { metadata: {}, content };
    
    const frontmatterLines = lines.slice(1, endIndex);
    const metadata = {};
    
    for (const line of frontmatterLines) {
        const match = line.match(/^([^:]+):\s*(.*)$/);
        if (match) {
            const [, key, value] = match;
            // Remove quotes if present
            metadata[key.trim()] = value.trim().replace(/^["']|["']$/g, '');
        }
    }
    
    const remainingContent = lines.slice(endIndex + 1).join('\n');
    return { metadata, content: remainingContent };
}

async function precompileDescriptions() {
    console.log('Precompiling toy markdown descriptions...');
    
    const compiledDescriptions = {};
    
    // Get all markdown files in the toys directory
    const files = readdirSync(TOYS_DIR).filter(file => file.endsWith('.md'));
    
    for (const file of files) {
        const slug = file.replace('.md', '');
        const filePath = join(TOYS_DIR, file);
        const content = readFileSync(filePath, 'utf-8');
        
        // Parse frontmatter
        const { metadata } = parseFrontmatter(content);
        
        if (metadata.description && typeof metadata.description === 'string') {
            try {
                const compiled = await compile(metadata.description);
                if (compiled && compiled.code) {
                    compiledDescriptions[slug] = compiled.code;
                } else {
                    compiledDescriptions[slug] = metadata.description;
                }
            } catch (err) {
                console.error(`Error compiling markdown for ${slug}:`, err);
                compiledDescriptions[slug] = metadata.description;
            }
        }
    }
    
    // Write the precompiled descriptions
    writeFileSync(OUTPUT_FILE, JSON.stringify(compiledDescriptions, null, 2));
    console.log(`Precompiled descriptions for ${Object.keys(compiledDescriptions).length} toys to ${OUTPUT_FILE}`);
}

precompileDescriptions().catch(console.error);
