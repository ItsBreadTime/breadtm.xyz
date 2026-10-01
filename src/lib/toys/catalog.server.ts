// The toy shelf's data: Markdown metadata joined with the image manifests the
// precompile script writes (scripts/precompile-toys.js).
import precompiledDescriptions from '$lib/precompiled-descriptions.json';
import toyAssets from '$lib/toy-assets.json';
import toyPlaceholders from '$lib/toy-placeholders.json';
import toyOriginals from '$lib/toy-originals.json';
import { compareImageKeys, groupByImageKey, isStandardImage, isThumbnail } from './images';
import type { ToyDetailMetadata } from './detailTypes';
import type { Toy } from './types';

type ToyMetadata = Record<string, unknown> & { name?: string; order?: number };

const metadataModules = import.meta.glob<ToyMetadata | undefined>('/src/content/toys/*.md', { eager: true, import: 'metadata' });
const sources = import.meta.glob<string>('/src/content/toys/*.md', { eager: true, query: '?raw', import: 'default' });

/** Every toy's image filenames, keyed by slug. */
export const toyImageFiles = toyAssets as Record<string, string[]>;
const placeholders = toyPlaceholders as Record<string, Record<string, string>>;
const originals = toyOriginals as Record<string, Record<string, string>>;
const descriptions = precompiledDescriptions as Record<string, string>;

const slugOf = (path: string) => path.slice(path.lastIndexOf('/') + 1, -'.md'.length);
const metadataBySlug = new Map(Object.entries(metadataModules).map(([path, metadata]) => [slugOf(path), metadata ?? {}]));
const PLACEHOLDER_BODY = /^This is a placeholder[.!]?$/i;

function metadataFor(slug: string): ToyMetadata {
    const metadata = { ...metadataBySlug.get(slug) };
    if (descriptions[slug]) metadata.description = descriptions[slug];
    return metadata;
}

/** Whether the toy's Markdown body holds real field notes rather than the stub. */
function hasNotes(slug: string): boolean {
    const body = (sources[`/src/content/toys/${slug}.md`] ?? '').replace(/^---[\s\S]*?---/, '').trim();
    return Boolean(body) && !PLACEHOLDER_BODY.test(body);
}

function imageSetsFor(slug: string) {
    const files = toyImageFiles[slug] ?? [];
    const imageSets = groupByImageKey(files.filter(isStandardImage));
    return {
        imageSets,
        thumbnailImageSets: groupByImageKey(files.filter(isThumbnail)),
        sortedImageKeys: Object.keys(imageSets).sort(compareImageKeys)
    };
}

/** Ordered toys first (by `order`), then the rest by name. */
function compareToys(a: ToyMetadata, b: ToyMetadata): number {
    if (a.order !== undefined && b.order !== undefined) return a.order - b.order;
    if (a.order !== undefined) return -1;
    if (b.order !== undefined) return 1;
    return (a.name ?? '').localeCompare(b.name ?? '');
}

export function listToys(): Toy[] {
    return [...metadataBySlug.keys()].map((slug) => {
        const { imageSets, thumbnailImageSets, sortedImageKeys } = imageSetsFor(slug);
        // The card shows `main`, else `1`, else the first image in shelf order.
        const primaryKey = ['main', '1'].find((key) => imageSets[key]) ?? sortedImageKeys[0];
        const primaryImage = primaryKey ? imageSets[primaryKey][0] : undefined;
        return {
            ...metadataFor(slug),
            slug,
            primaryImage,
            thumbnailImage: primaryKey ? thumbnailImageSets[primaryKey]?.[0] ?? primaryImage : undefined,
            placeholder: primaryKey ? placeholders[slug]?.[primaryKey] : undefined
        } as Toy & ToyMetadata;
    }).sort(compareToys);
}

export function getToy(slug: string, requestedImageKey = ''): ToyDetailMetadata | null {
    if (!metadataBySlug.has(slug)) return null;
    const images = imageSetsFor(slug);
    return {
        ...metadataFor(slug),
        slug,
        ...images,
        placeholders: placeholders[slug] ?? {},
        originals: originals[slug] ?? {},
        initialImageIndex: Math.max(0, images.sortedImageKeys.indexOf(requestedImageKey)),
        hasNotes: hasNotes(slug)
    };
}
