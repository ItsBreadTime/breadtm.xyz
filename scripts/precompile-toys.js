import { existsSync, readFileSync, writeFileSync, readdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { compile } from 'mdsvex';
import sharp from 'sharp';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const TOYS_DIR = join(__dirname, '../src/content/toys');
const OUTPUT_FILE = join(__dirname, '../src/lib/precompiled-descriptions.json');
const TOY_ASSETS_DIR = join(__dirname, '../static/toys');
const ASSET_MANIFEST_FILE = join(__dirname, '../src/lib/toy-assets.json');
const PLACEHOLDER_FILE = join(__dirname, '../src/lib/toy-placeholders.json');
const ORIGINALS_DIR = join(__dirname, '../static/fullres/toys');
const ORIGINALS_FILE = join(__dirname, '../src/lib/toy-originals.json');
const SOURCE_FILE_PATTERN = /\.(?:jpe?g|png)$/i;
// Long edge of the inline preview. ~24px keeps each data URI a few hundred
// bytes while still carrying the photo's layout and colour.
const PLACEHOLDER_SIZE = 24;
const IMAGE_FILE_PATTERN = /\.(?:avif|webp|jpe?g|png)$/i;

async function precompileDescriptions() {
    console.log('Precompiling toy markdown descriptions...');
    
    const compiledDescriptions = {};
    
    // Get all markdown files in the toys directory
    const files = readdirSync(TOYS_DIR).filter(file => file.endsWith('.md'));
    
    for (const file of files) {
        const slug = file.replace('.md', '');
        const filePath = join(TOYS_DIR, file);
        // mdsvex reads the frontmatter as real YAML, so quoted, folded and multi-line values all work.
        const metadata = (await compile(readFileSync(filePath, 'utf-8')))?.data?.fm ?? {};

        if (typeof metadata.description === 'string' && metadata.description.trim()) {
            const compiled = await compile(metadata.description);
            compiledDescriptions[slug] = compiled?.code || metadata.description;
        }
    }
    
    // Write the precompiled descriptions
    writeFileSync(OUTPUT_FILE, JSON.stringify(compiledDescriptions, null, 2));
    console.log(`Precompiled descriptions for ${Object.keys(compiledDescriptions).length} toys to ${OUTPUT_FILE}`);

    const assetManifest = {};
    const toyDirectories = readdirSync(TOY_ASSETS_DIR, { withFileTypes: true })
        .filter((entry) => entry.isDirectory())
        .sort((a, b) => a.name.localeCompare(b.name));

    for (const directory of toyDirectories) {
        const files = readdirSync(join(TOY_ASSETS_DIR, directory.name), { withFileTypes: true })
            .filter((entry) => entry.isFile() && IMAGE_FILE_PATTERN.test(entry.name))
            .map((entry) => entry.name)
            .sort((a, b) => a.localeCompare(b));

        if (files.length > 0) assetManifest[directory.name] = files;
    }

    writeFileSync(ASSET_MANIFEST_FILE, JSON.stringify(assetManifest, null, 2));
    console.log(`Indexed image assets for ${Object.keys(assetManifest).length} toys to ${ASSET_MANIFEST_FILE}`);

    await buildPlaceholders(assetManifest);
    buildOriginals();
}

// The lightbox download link serves the untouched source photo, whatever its extension.
function buildOriginals() {
    const originals = {};
    const toyDirectories = existsSync(ORIGINALS_DIR)
        ? readdirSync(ORIGINALS_DIR, { withFileTypes: true }).filter((entry) => entry.isDirectory())
        : [];

    for (const directory of toyDirectories) {
        const files = readdirSync(join(ORIGINALS_DIR, directory.name), { withFileTypes: true })
            .filter((entry) => entry.isFile() && SOURCE_FILE_PATTERN.test(entry.name))
            .map((entry) => entry.name)
            .sort((a, b) => a.localeCompare(b));
        for (const file of files) (originals[directory.name] ||= {})[file.replace(/\.[^.]+$/, '')] = file;
    }

    writeFileSync(ORIGINALS_FILE, JSON.stringify(originals, null, 2));
    console.log(`Indexed original photos for ${Object.keys(originals).length} toys to ${ORIGINALS_FILE}`);
}

// Tiny inline previews, one per image key, painted (blurred) under each photo
// so the frame shows the toy immediately instead of an empty skeleton.
async function buildPlaceholders(assetManifest) {
    const placeholders = {};

    for (const [slug, files] of Object.entries(assetManifest)) {
        const keys = new Set(
            files
                .filter((file) => !/-(?:full|card)\.[^.]+$/i.test(file))
                .map((file) => file.replace(/\.[^.]+$/, '').replace(/-thumb$/i, ''))
        );

        for (const key of [...keys].sort()) {
            // The thumbnail is the smallest decode that still covers the whole frame.
            const source = [`${key}-thumb.jpg`, `${key}-card.jpg`, `${key}.jpg`, `${key}-thumb.webp`, `${key}.webp`]
                .find((file) => files.includes(file));
            if (!source) continue;

            try {
                const buffer = await sharp(join(TOY_ASSETS_DIR, slug, source))
                    .resize(PLACEHOLDER_SIZE, PLACEHOLDER_SIZE, { fit: 'inside' })
                    .webp({ quality: 50, smartSubsample: true })
                    .toBuffer();
                (placeholders[slug] ||= {})[key] = `data:image/webp;base64,${buffer.toString('base64')}`;
            } catch (err) {
                console.error(`Error building placeholder for ${slug}/${source}:`, err);
            }
        }
    }

    writeFileSync(PLACEHOLDER_FILE, JSON.stringify(placeholders, null, 2));
    const count = Object.values(placeholders).reduce((total, keys) => total + Object.keys(keys).length, 0);
    console.log(`Built ${count} image placeholders to ${PLACEHOLDER_FILE}`);
}

precompileDescriptions().catch((err) => {
    // Fail the build rather than ship stale descriptions and manifests.
    console.error(err);
    process.exitCode = 1;
});
