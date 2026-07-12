import { browser } from '$app/environment';
import { writable } from 'svelte/store';

export type CachedImageResolution = 'standard' | 'full';
export type ImageResolutionCache = Record<string, CachedImageResolution>;

// v3 invalidates keys that may have been promoted by the former unkeyed
// fullscreen request race. Only completed, image-keyed loads repopulate it.
const STORAGE_KEY = 'breadtm:image-resolution-cache-v3';
const COOKIE_KEY = 'breadtm_image_resolution_cache_v3';

function parseCache(value: string | null): ImageResolutionCache {
    if (!value) return {};

    try {
        const parsed: unknown = JSON.parse(value);
        if (Array.isArray(parsed)) {
            return Object.fromEntries(
                parsed
                    .filter((key): key is string => typeof key === 'string')
                    .map((key) => [key, 'full' as const])
            );
        }
        if (!parsed || typeof parsed !== 'object') return {};

        return Object.fromEntries(
            Object.entries(parsed).filter(
                (entry): entry is [string, CachedImageResolution] =>
                    entry[1] === 'standard' || entry[1] === 'full'
            )
        );
    } catch {
        return {};
    }
}

function readCookie(key: string): string | null {
    const cookie = document.cookie
        .split('; ')
        .find((entry) => entry.startsWith(`${key}=`));
    if (!cookie) return null;

    try {
        return decodeURIComponent(cookie.slice(key.length + 1));
    } catch {
        return null;
    }
}

function readCachedResolutions(): ImageResolutionCache {
    if (!browser) return {};

    try {
        const storedCache = parseCache(window.sessionStorage.getItem(STORAGE_KEY));
        if (Object.keys(storedCache).length > 0) return storedCache;

    } catch {
        // Fall through to the session-cookie marker.
    }

    const cookieCache = parseCache(readCookie(COOKIE_KEY));
    if (Object.keys(cookieCache).length > 0) return cookieCache;
    return {};
}

const cachedResolutions = writable<ImageResolutionCache>(readCachedResolutions());

export const imageResolutionCache = {
    subscribe: cachedResolutions.subscribe
};

export function getImageResolutionCacheKey(slug: string | undefined, imageKey: string): string {
    return `${slug || ''}:${imageKey}`;
}

export function markImageResolutionCached(
    cacheKey: string,
    resolution: CachedImageResolution
): void {
    cachedResolutions.update((cache) => {
        const currentResolution = cache[cacheKey];
        if (currentResolution === 'full' || currentResolution === resolution) return cache;

        const nextCache = { ...cache, [cacheKey]: resolution };
        if (browser) {
            const serializedCache = JSON.stringify(nextCache);
            try {
                window.sessionStorage.setItem(STORAGE_KEY, serializedCache);
            } catch {
                // The cookie and in-memory registry still preserve the promotion.
            }
            try {
                document.cookie = `${COOKIE_KEY}=${encodeURIComponent(serializedCache)}; Path=/; SameSite=Lax`;
            } catch {
                // The in-memory registry still prevents resolution downgrades.
            }
        }
        return nextCache;
    });
}
