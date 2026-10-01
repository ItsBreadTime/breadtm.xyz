/** Optimistic asset loading shared by every page: font preload ordering and
 * hover-time image warmups. Everything here is a hint; failures are ignored. */

export interface FontAsset {
    href: string;
    /** A CSS `font` shorthand that matches the @font-face in app.css. */
    query: string;
}

const INTER: FontAsset = { href: '/fonts/Inter-Latin.woff2', query: '400 1em Inter' };
const INTER_ITALIC: FontAsset = { href: '/fonts/Inter-Italic-Latin.woff2', query: 'italic 400 1em Inter' };
const GOLDMAN: FontAsset = { href: '/fonts/Goldman-Bold.woff2', query: '700 1em Goldman' };
const COMMIT_MONO: FontAsset = { href: '/fonts/CommitMono-Bold.woff2', query: '700 1em CommitMono' };

/** Every font, in the order a page that uses none of them should fetch the
 * spares: Goldman is the likeliest next need (toys, Breadmoji), italics least. */
export const FONTS = [INTER, GOLDMAN, COMMIT_MONO, INTER_ITALIC];

/** Fonts each section renders on first paint; anything else is a spare. */
const ROUTE_FONTS: [prefix: string, fonts: FontAsset[]][] = [
    ['/toys', [INTER, GOLDMAN]],
    ['/breadmoji-writes', [INTER, GOLDMAN, INTER_ITALIC, COMMIT_MONO]],
    ['/blogs', [INTER, INTER_ITALIC, COMMIT_MONO]]
];

const matchesRoute = (pathname: string, prefix: string) =>
    pathname === prefix || pathname.startsWith(`${prefix}/`);

/** All fonts for a page: the ones it uses first, then the spares. */
export function fontPreloadOrder(pathname: string): { font: FontAsset; used: boolean }[] {
    const used = ROUTE_FONTS.find(([prefix]) => matchesRoute(pathname, prefix))?.[1] ?? [INTER];
    return [
        ...used.map((font) => ({ font, used: true })),
        ...FONTS.filter((font) => !used.includes(font)).map((font) => ({ font, used: false }))
    ];
}

/** Turn the preloaded font files into ready faces once the page is idle, so a
 * client-side navigation to a section that needs them paints without a swap. */
export function warmFonts() {
    if (typeof document === 'undefined' || !document.fonts) return;
    const run = () => {
        for (const font of FONTS) void document.fonts.load(font.query).catch(() => undefined);
    };
    if ('requestIdleCallback' in window) requestIdleCallback(run, { timeout: 2000 });
    else setTimeout(run, 200);
}

/** Skip speculative downloads for visitors who asked to save data. */
export function canPrefetch(): boolean {
    const connection = (navigator as Navigator & {
        connection?: { saveData?: boolean; effectiveType?: string };
    }).connection;
    return !connection?.saveData && !['slow-2g', '2g'].includes(connection?.effectiveType || '');
}

export interface ImageHint {
    src: string;
    srcset?: string;
    sizes?: string;
}

// Keep references so in-flight requests are not garbage-collected mid-download.
const warmedImages = new Map<string, HTMLImageElement>();

/** Fetch an image the way the destination page will request it (same srcset
 * and sizes, so the browser picks the same candidate) and decode it. */
export function prefetchImage({ src, srcset, sizes }: ImageHint) {
    const key = `${src}|${srcset ?? ''}|${sizes ?? ''}`;
    if (warmedImages.has(key)) return;
    const image = new Image();
    image.decoding = 'async';
    image.fetchPriority = 'low';
    if (sizes) image.sizes = sizes;
    if (srcset) image.srcset = srcset;
    image.src = src;
    warmedImages.set(key, image);
}

/** Delegated handler: any link carrying `data-prefetch-image` (plus optional
 * `data-prefetch-srcset` / `data-prefetch-sizes`) warms that image on hover,
 * focus or touch, alongside SvelteKit's own hover preload of code and data. */
export function prefetchLinkImage(event: Event) {
    const link = (event.target as Element | null)?.closest?.<HTMLElement>('[data-prefetch-image]');
    if (!link || !canPrefetch()) return;
    const { prefetchImage: src, prefetchSrcset: srcset, prefetchSizes: sizes } = link.dataset;
    if (src) prefetchImage({ src, srcset, sizes });
}
