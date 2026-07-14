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

export const FULL_RESOLUTION_IDLE_DELAY = 220;

const getExtension = (filename: string): string =>
    filename.split('.').pop()?.toLowerCase() || '';

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
