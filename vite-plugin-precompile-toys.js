import { readFileSync, writeFileSync, readdirSync, existsSync, statSync } from 'fs';
import { join } from 'path';
import { compile } from 'mdsvex';

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

async function precompileDescriptions(toysDir, outputFile) {
    const compiledDescriptions = {};
    
    // Get all markdown files in the toys directory
    const files = readdirSync(toysDir).filter(file => file.endsWith('.md'));
    
    for (const file of files) {
        const slug = file.replace('.md', '');
        const filePath = join(toysDir, file);
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
    writeFileSync(outputFile, JSON.stringify(compiledDescriptions, null, 2));
    console.log(`Precompiled descriptions for ${Object.keys(compiledDescriptions).length} toys`);
    
    return compiledDescriptions;
}

function needsRecompilation(toysDir, outputFile) {
    if (!existsSync(outputFile)) return true;
    
    const outputStat = statSync(outputFile);
    const files = readdirSync(toysDir).filter(file => file.endsWith('.md'));
    
    for (const file of files) {
        const filePath = join(toysDir, file);
        const fileStat = statSync(filePath);
        if (fileStat.mtime > outputStat.mtime) {
            return true;
        }
    }
    
    return false;
}

export function precompileToysPlugin() {
    return {
        name: 'precompile-toys',
        async buildStart() {
            const toysDir = join(process.cwd(), 'src/routes/toys');
            const outputFile = join(process.cwd(), 'src/lib/precompiled-descriptions.json');
            
            if (needsRecompilation(toysDir, outputFile)) {
                console.log('Precompiling toy descriptions...');
                await precompileDescriptions(toysDir, outputFile);
            } else {
                console.log('Toy descriptions are up to date');
            }
        }
    };
}
