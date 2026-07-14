<script lang="ts">
    import { preloadData } from '$app/navigation';
    import { getToyCollectionPrefetchSources } from '$lib/toys/imageLoading';
    import NavItem from './NavItem.svelte';

    let toyCollectionPrefetch: Promise<void> | undefined;
    let prefetchedToyImages: HTMLImageElement[] = [];
    let goldmanFontWarmup: Promise<void> | undefined;

    const GOLDMAN_FONT_URL = '/fonts/Goldman-Bold.woff2';

    function isGoldmanFontReady(): boolean {
        return Array.from(document.fonts).some((font) =>
            font.family.replace(/["']/g, '') === 'Goldman'
            && font.weight === '700'
            && font.status === 'loaded'
        );
    }

    function preloadGoldmanFont() {
        if (goldmanFontWarmup) return goldmanFontWarmup;
        if (isGoldmanFontReady()) {
            goldmanFontWarmup = Promise.resolve();
            return goldmanFontWarmup;
        }

        goldmanFontWarmup = fetch(GOLDMAN_FONT_URL, {
            priority: 'low'
        } as RequestInit & { priority: 'low' })
            .then((response) => {
                if (!response.ok) throw new Error(`Goldman preload failed: ${response.status}`);
                return response.arrayBuffer();
            })
            .then((fontData) => new FontFace('Goldman', fontData, {
                style: 'normal',
                weight: '700'
            }).load())
            .then((font) => {
                document.fonts.add(font);
            })
            .catch(() => {
                goldmanFontWarmup = undefined;
            });

        return goldmanFontWarmup;
    }

    function prefetchToyCollection() {
        if (window.location.pathname.startsWith('/toys')) return;

        void preloadGoldmanFont();
        if (toyCollectionPrefetch) return;

        toyCollectionPrefetch = preloadData('/toys')
            .then((result) => {
                if (result.type !== 'loaded' || result.status !== 200) {
                    toyCollectionPrefetch = undefined;
                    return;
                }

                const toys = Array.isArray(result.data.toys) ? result.data.toys : [];
                const imageFilesMap = result.data.toyImagesMap || {};
                prefetchedToyImages = getToyCollectionPrefetchSources(
                    toys,
                    imageFilesMap
                ).map(({ src, srcset }) => {
                    const image = new Image();
                    image.decoding = 'async';
                    image.fetchPriority = 'low';
                    if (srcset) image.srcset = srcset;
                    image.src = src;
                    return image;
                });
            })
            .catch(() => {
                toyCollectionPrefetch = undefined;
            });
    }
</script>
<div class="py-3 px-2 md:px-6 border-b-8 md:border-8 border-black font-bold text-xl md:text-2xl bg-black text-white shadow-md" id="header">
    <div class="container mx-auto flex justify-center items-center">
        <div class="flex items-center">
            <NavItem route="/">Home</NavItem>
            <NavItem route="/toys" isLast={true} onprefetch={prefetchToyCollection}>Toys</NavItem>
        </div>
    </div>
</div>
