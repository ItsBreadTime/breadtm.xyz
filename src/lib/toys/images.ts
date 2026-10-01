// Toy image filenames: `<key>.<ext>` is the standard image, with `-thumb`,
// `-card` and `-full` variants, each in AVIF, WebP and JPEG.

/** Best format first. */
export const FORMAT_PRIORITY = ['avif', 'webp', 'jpg', 'jpeg', 'png'];

export const getExtension = (filename: string): string => filename.split('.').pop()?.toLowerCase() || '';
export const getBaseFilename = (filename: string): string => filename.split('.').slice(0, -1).join('.');

export const isThumbnail = (filename: string): boolean => /-thumb\.[^.]+$/i.test(filename);
export const isFullResolution = (filename: string): boolean => /-full\.[^.]+$/i.test(filename);
export const isCardImage = (filename: string): boolean => /-card\.[^.]+$/i.test(filename);
export const isStandardImage = (filename: string): boolean =>
    !isThumbnail(filename) && !isFullResolution(filename) && !isCardImage(filename);

/** The image a variant belongs to: `2-thumb.webp` → `2`. */
export const getImageKey = (filename: string): string => getBaseFilename(filename).replace(/-(?:thumb|card|full)$/i, '');

export const byFormatPriority = (a: string, b: string): number =>
    FORMAT_PRIORITY.indexOf(getExtension(a)) - FORMAT_PRIORITY.indexOf(getExtension(b));

/** `main` first, then numbered images in numeric order, then the rest alphabetically. */
export function compareImageKeys(a: string, b: string): number {
    if (a === 'main') return -1;
    if (b === 'main') return 1;
    const numA = Number.parseInt(a, 10);
    const numB = Number.parseInt(b, 10);
    const hasNumA = !Number.isNaN(numA);
    const hasNumB = !Number.isNaN(numB);
    if (hasNumA && hasNumB && numA !== numB) return numA - numB;
    if (hasNumA !== hasNumB) return hasNumA ? -1 : 1;
    return a.localeCompare(b);
}

/** Group filenames by image key, each group in format priority order. */
export function groupByImageKey(filenames: string[]): Record<string, string[]> {
    const groups: Record<string, string[]> = {};
    for (const filename of filenames) (groups[getImageKey(filename)] ||= []).push(filename);
    for (const group of Object.values(groups)) group.sort(byFormatPriority);
    return groups;
}
