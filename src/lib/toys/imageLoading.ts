import { compareImageKeys, getExtension, getImageKey, isCardImage, isFullResolution, isThumbnail } from './images.ts';

export interface PictureSources {
    avif?: string;
    webp?: string;
    jpg?: string;
    fallback?: string;
    preferred?: string;
}

export interface FullResolutionRequestState {
    imageKey: string;
    requestedImageKey: string | null;
    usesFullResolution: boolean;
    zoomScale: number;
    minimumZoom: number;
}

export interface ToyCollectionPrefetchItem {
    slug: string;
    thumbnailImage?: string;
}

export interface ToyCollectionPrefetchSource {
    src: string;
    srcset?: string;
}

export const FULL_RESOLUTION_IDLE_DELAY = 220;

const selectPrefetchSource = (imageSet: string[], preferredExtension: string): string | undefined => {
    const matchingSource = imageSet.find(
        (filename) => getExtension(filename) === preferredExtension.toLowerCase()
    );

    return matchingSource || getPictureSources(imageSet).preferred;
};

export function getPictureSources(imageSet: string[]): PictureSources {
    const avif = imageSet.find((image) => getExtension(image) === 'avif');
    const webp = imageSet.find((image) => getExtension(image) === 'webp');
    const jpg = imageSet.find((image) => ['jpg', 'jpeg'].includes(getExtension(image)));
    const fallback = jpg || imageSet[0];

    return {
        avif,
        webp,
        jpg,
        fallback,
        preferred: avif || webp || fallback
    };
}

export function getFullResolutionSources(baseFilename: string): PictureSources {
    if (!baseFilename) return {};
    return getPictureSources([
        `${baseFilename}.avif`,
        `${baseFilename}.webp`,
        `${baseFilename}.jpg`
    ]);
}

export function getToyDetailPrefetchPaths(
    slug: string,
    filenames: string[],
    primaryImage: string | undefined,
    preferredExtension: string
): string[] {
    const standardImageSets: Record<string, string[]> = {};
    const thumbnailImageSets: Record<string, string[]> = {};

    for (const filename of filenames) {
        if (isFullResolution(filename) || isCardImage(filename)) continue;
        const imageSets = isThumbnail(filename) ? thumbnailImageSets : standardImageSets;
        (imageSets[getImageKey(filename)] ||= []).push(filename);
    }

    const primaryKey = primaryImage ? getImageKey(primaryImage) : '';
    const standardKeys = Object.keys(standardImageSets).sort(compareImageKeys);
    const mainKey = primaryKey && standardImageSets[primaryKey] ? primaryKey : standardKeys[0];
    const selectedFilenames = [
        mainKey
            ? selectPrefetchSource(standardImageSets[mainKey], preferredExtension)
            : undefined,
        ...Object.keys(thumbnailImageSets)
            .sort(compareImageKeys)
            .map((key) => selectPrefetchSource(thumbnailImageSets[key], preferredExtension))
    ].filter((filename): filename is string => Boolean(filename));

    return [...new Set(selectedFilenames)].map((filename) => `/toys/${slug}/${filename}`);
}

export function getToyCollectionPrefetchSources(
    toys: ToyCollectionPrefetchItem[],
    imageFilesMap: Record<string, string[]>
): ToyCollectionPrefetchSource[] {
    return toys.flatMap((toy) => {
        const thumbnailImage = toy.thumbnailImage;
        if (!thumbnailImage) return [];

        const availableImages = imageFilesMap[toy.slug] || [];
        if (!availableImages.includes(thumbnailImage)) return [];

        const extension = getExtension(thumbnailImage);
        const imageKey = getImageKey(thumbnailImage);
        const cardImage = `${imageKey}-card.${extension}`;
        const thumbnailPath = `/toys/${toy.slug}/${thumbnailImage}`;
        const cardPath = `/toys/${toy.slug}/${cardImage}`;

        return [{
            src: thumbnailPath,
            srcset: availableImages.includes(cardImage)
                ? `${cardPath} 1x, ${thumbnailPath} 2x`
                : undefined
        }];
    });
}

export function shouldQueueFullResolution({
    imageKey,
    requestedImageKey,
    usesFullResolution,
    zoomScale,
    minimumZoom
}: FullResolutionRequestState): boolean {
    return Boolean(imageKey)
        && requestedImageKey !== imageKey
        && !usesFullResolution
        && zoomScale > minimumZoom;
}
