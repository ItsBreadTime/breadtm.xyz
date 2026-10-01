<script lang="ts">
    import { onMount } from 'svelte';
    import { page } from '$app/state';
    import {
        imageResolutionCache,
        getImageResolutionCacheKey,
        markImageResolutionCached
    } from '$lib/toys/fullResolutionCache';
    import {
        FULL_RESOLUTION_IDLE_DELAY,
        getFullResolutionSources,
        getPictureSources,
        shouldQueueFullResolution
    } from '$lib/toys/imageLoading';
    import { getBaseFilename } from '$lib/toys/images';
    import { MIN_ZOOM, ZoomPan, swipe } from '$lib/toys/zoomPan.svelte';
    import type { ToyDetailData } from '$lib/toys/detailTypes';
    import ProgressiveToyImage from './ProgressiveToyImage.svelte';
    import ToyDetailInfo from './ToyDetailInfo.svelte';
    import ToyLightbox from './ToyLightbox.svelte';
    import ToyThumbnailRail from './ToyThumbnailRail.svelte';

    let { data }: { data: ToyDetailData } = $props();

    const toy = $derived(data.metadata);
    const slug = $derived(toy.slug);
    const imageSets = $derived(toy.imageSets);
    const thumbnailImageSets = $derived(toy.thumbnailImageSets);
    const sortedImageKeys = $derived(toy.sortedImageKeys);
    const imageCount = $derived(sortedImageKeys.length);
    const cacheKey = (imageKey: string) => getImageResolutionCacheKey(slug, imageKey);

    // svelte-ignore state_referenced_locally
    let currentImageKeyIndex = $state(data.metadata.initialImageIndex);
    const currentImageKey = $derived(sortedImageKeys[currentImageKeyIndex] || '');

    let isImageEnlarged = $state(false);
    let enlargedImageIndex = $state(0);
    let requestedFullResolutionKey: string | null = $state(null);
    const enlargedImageKey = $derived(sortedImageKeys[enlargedImageIndex] || '');
    const fullResolutionRequested = $derived(requestedFullResolutionKey === enlargedImageKey);
    const useFullResolution = $derived(
        enlargedImageKey !== '' && $imageResolutionCache[cacheKey(enlargedImageKey)] === 'full'
    );
    let standardImageReadyKey = $state('');
    // The resolution cache lives in the browser; SSR and hydration render from thumbnails.
    let cacheReady = $state(false);
    onMount(() => { cacheReady = true; });

    const step = (index: number, offset: number) => (index + offset + imageCount) % imageCount;

    // ─── Full resolution: fetched only once the reader has zoomed in and paused.

    let fullResolutionTimer: number | null = null;

    function cancelFullResolutionLoad(): void {
        if (fullResolutionTimer !== null) window.clearTimeout(fullResolutionTimer);
        fullResolutionTimer = null;
        requestedFullResolutionKey = null;
    }

    const wantsFullResolution = (imageKey: string, scale: number) => shouldQueueFullResolution({
        imageKey,
        requestedImageKey: requestedFullResolutionKey,
        usesFullResolution: useFullResolution,
        zoomScale: scale,
        minimumZoom: MIN_ZOOM
    });

    function queueFullResolutionLoad(scale: number): void {
        const imageKey = enlargedImageKey;
        if (!wantsFullResolution(imageKey, scale)) return;
        // Once this image's request has mounted, further zoom frames must not
        // unmount and restart it. Only navigation/reset cancels an active load.
        if (fullResolutionTimer !== null) window.clearTimeout(fullResolutionTimer);
        fullResolutionTimer = window.setTimeout(() => {
            fullResolutionTimer = null;
            if (isImageEnlarged && enlargedImageKey === imageKey && wantsFullResolution(imageKey, zoom.scale)) {
                requestedFullResolutionKey = imageKey;
            }
        }, FULL_RESOLUTION_IDLE_DELAY);
    }

    const zoom = new ZoomPan({
        onswipe: (offset) => showEnlargedImage(step(enlargedImageIndex, offset)),
        onchange: (scale) => {
            if (scale > MIN_ZOOM) queueFullResolutionLoad(scale);
            else if (!useFullResolution) cancelFullResolutionLoad();
        }
    });

    async function decoded(event: Event): Promise<void> {
        // A completed load still counts when decode() is unavailable or fails.
        await (event.currentTarget as HTMLImageElement).decode().catch(() => {});
    }

    async function handleFullResolutionLoad(event: Event, imageKey: string): Promise<void> {
        await decoded(event);
        markImageResolutionCached(cacheKey(imageKey), 'full');
        if (requestedFullResolutionKey === imageKey) requestedFullResolutionKey = null;
    }

    function handleFullResolutionError(imageKey: string): void {
        if (requestedFullResolutionKey === imageKey) requestedFullResolutionKey = null;
    }

    async function handleStandardResolutionLoad(event: Event, imageKey: string): Promise<void> {
        await decoded(event);
        standardImageReadyKey = imageKey;
        markImageResolutionCached(cacheKey(imageKey), 'standard');
    }

    // ─── Gallery and lightbox navigation

    const stageSwipe = swipe((offset) => { if (imageCount) currentImageKeyIndex = step(currentImageKeyIndex, offset); });

    function runGalleryLinkAction(event: MouseEvent | KeyboardEvent, action: () => void): void {
        if (event instanceof KeyboardEvent && event.key !== ' ') return;
        event.preventDefault();
        action();
    }

    function showEnlargedImage(index: number): void {
        cancelFullResolutionLoad();
        enlargedImageIndex = index;
        zoom.reset();
    }

    function openEnlargedImage(index: number): void {
        showEnlargedImage(index);
        isImageEnlarged = true;
    }

    function closeEnlargedImage(): void {
        isImageEnlarged = false;
        cancelFullResolutionLoad();
        zoom.reset();
    }

    // The lightbox handles its own keys; on the page, arrows flip photos unless
    // the reader is typing, using a shortcut, or working another control.
    function handleKeydown(event: KeyboardEvent): void {
        if (isImageEnlarged || !imageCount || event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
        if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
        const target = event.target as HTMLElement | null;
        if (target?.closest('input, textarea, select, [contenteditable="true"]')) return;
        currentImageKeyIndex = step(currentImageKeyIndex, event.key === 'ArrowRight' ? 1 : -1);
    }

    // ─── Paths

    const getImagePath = (filename: string): string => `/toys/${slug}/${filename}`;

    const getImagePagePath = (imageKey: string): string => {
        if (!imageKey) return '#toy-image-viewer';
        const params = new URLSearchParams(page.url.searchParams);
        params.set('image', imageKey);
        return `?${params}#toy-image-viewer`;
    };

    const getFullResolutionBase = (imageKey: string): string => {
        const fallback = getPictureSources(imageSets[imageKey] || []).fallback;
        return fallback ? `${getBaseFilename(fallback)}-full` : '';
    };

    /** The untouched source photo; falls back to the full-size derivative. */
    const getDownloadPath = (imageKey: string): string => {
        const original = toy.originals[imageKey];
        if (original) return `/fullres/toys/${slug}/${original}`;
        const base = getFullResolutionBase(imageKey);
        return base ? getImagePath(`${base}.jpg`) : '#';
    };

    // Rails show the sharpest version already in the browser cache.
    const getThumbnailSet = (imageKey: string): string[] => {
        const cached = cacheReady ? $imageResolutionCache[cacheKey(imageKey)] : undefined;
        const fullResolutionBase = getFullResolutionBase(imageKey);
        if (fullResolutionBase && cached === 'full') {
            const { avif, webp, jpg } = getFullResolutionSources(fullResolutionBase);
            return [avif, webp, jpg].filter((file): file is string => Boolean(file));
        }
        if (cached === 'standard') return imageSets[imageKey] || [];
        return thumbnailImageSets[imageKey] || imageSets[imageKey] || [];
    };

    const currentCachedResolution = $derived(
        cacheReady && currentImageKey ? $imageResolutionCache[cacheKey(currentImageKey)] : undefined
    );
    const currentStandardImageSet = $derived(currentImageKey ? imageSets[currentImageKey] || [] : []);
    const currentThumbnailImageSet = $derived(
        currentImageKey ? thumbnailImageSets[currentImageKey] || currentStandardImageSet : []
    );
    const currentSources = $derived(getPictureSources(currentThumbnailImageSet));

    // A different toy (client navigation reuses this component) starts at its first photo.
    let previousSlug = '';
    $effect(() => {
        if (previousSlug && slug !== previousSlug) {
            currentImageKeyIndex = 0;
            enlargedImageIndex = 0;
        }
        previousSlug = slug;
    });

    onMount(() => () => {
        zoom.destroy();
        cancelFullResolutionLoad();
    });
</script>


<svelte:window onkeydown={handleKeydown} />

<svelte:head>
    {#if isImageEnlarged}
        <title>{toy.name} (image {enlargedImageIndex + 1} of {sortedImageKeys.length}) · Toy Shelf · BreadTM</title>
    {:else}
        <title>{toy.name || 'Toy'} · Toy Shelf · BreadTM</title>
    {/if}
    {#if !isImageEnlarged && currentSources.avif}
        <link rel="preload" as="image" href={getImagePath(currentSources.avif)} type="image/avif" fetchpriority="high" />
    {:else if !isImageEnlarged && currentSources.webp}
        <link rel="preload" as="image" href={getImagePath(currentSources.webp)} type="image/webp" fetchpriority="high" />
    {:else if !isImageEnlarged && currentSources.fallback}
        <link rel="preload" as="image" href={getImagePath(currentSources.fallback)} fetchpriority="high" />
    {/if}
</svelte:head>

        <div class="detail-layout">
            <!-- Desktop film strip: filed into the dossier column between the
                 spec sheet and the field notes, not under the evidence photo. -->
            {#snippet desktopRail()}
                <ToyThumbnailRail
                    variant="desktop"
                    imageKeys={sortedImageKeys}
                    currentImageIndex={currentImageKeyIndex}
                    toyName={toy.name}
                    {getThumbnailSet}
                    placeholders={toy.placeholders}
                    {getImagePath}
                    {getImagePagePath}
                    onselect={(event, index) => runGalleryLinkAction(event, () => currentImageKeyIndex = index)}
                />
            {/snippet}

            {#snippet viewerNav(offset: number, placement: string)}
                <a
                    class="viewer-nav {placement}"
                    href={getImagePagePath(sortedImageKeys[step(currentImageKeyIndex, offset)])}
                    onclick={(event) => runGalleryLinkAction(event, () => currentImageKeyIndex = step(currentImageKeyIndex, offset))}
                    onkeydown={(event) => runGalleryLinkAction(event, () => currentImageKeyIndex = step(currentImageKeyIndex, offset))}
                    aria-label={offset < 0 ? 'Previous image' : 'Next image'}
                >
                    <svg
                        xmlns="http://www.w3.org/2000/svg"
                        class="h-4 w-4 sm:h-5 sm:w-5"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                    >
                        <path stroke-linecap="square" stroke-linejoin="miter" stroke-width="2" d={offset < 0 ? 'M15 19l-7-7 7-7' : 'M9 5l7 7-7 7'} />
                    </svg>
                </a>
            {/snippet}

            <div class="image-column">
                <div class="image-frame group">
                    <div 
                        id="toy-image-viewer"
                        class="image-stage"
                        ontouchstart={stageSwipe.start}
                        ontouchmove={stageSwipe.move}
                        ontouchend={() => stageSwipe.end()}
                        role="group"
                        aria-label="Toy image viewer"
                    >
                        {#if sortedImageKeys.length > 0}
                            <ProgressiveToyImage
                                href={getDownloadPath(currentImageKey)}
                                imageIndex={currentImageKeyIndex}
                                toyName={toy.name}
                                thumbnailImageSet={currentThumbnailImageSet}
                                standardImageSet={currentStandardImageSet}
                                fullResolutionBase={getFullResolutionBase(currentImageKey)}
                                placeholder={toy.placeholders?.[currentImageKey]}
                                cachedResolution={currentCachedResolution}
                                standardReady={standardImageReadyKey === currentImageKey}
                                {getImagePath}
                                onactivate={(event) => runGalleryLinkAction(
                                    event,
                                    () => openEnlargedImage(currentImageKeyIndex)
                                )}
                                onstandardload={(event) => handleStandardResolutionLoad(event, currentImageKey)}
                            />

                            {#if sortedImageKeys.length > 1}
                                {@render viewerNav(-1, 'viewer-nav-overlay viewer-nav-prev')}
                                {@render viewerNav(1, 'viewer-nav-overlay viewer-nav-next')}
                            {/if}
                        {:else}
                            <div class="flex items-center justify-center h-full bg-black/60">
                                <p class="text-rose-300 text-sm sm:text-base">No images available</p>
                            </div>
                        {/if}
                    </div>
                </div>
                
                <ToyThumbnailRail
                    variant="mobile"
                    imageKeys={sortedImageKeys}
                    currentImageIndex={currentImageKeyIndex}
                    toyName={toy.name}
                    {getThumbnailSet}
                    placeholders={toy.placeholders}
                    {getImagePath}
                    {getImagePagePath}
                    onselect={(event, index) => runGalleryLinkAction(event, () => currentImageKeyIndex = index)}
                />
            </div>


            <div class="detail-column" class:awaiting-notes={!data.notes}>
                <ToyDetailInfo
                    {slug}
                    year={toy.year}
                    faction={toy.faction}
                    description={toy.description}
                    notes={data.notes}
                    gallery={desktopRail}
                />
            </div>
        </div>


{#if isImageEnlarged && imageCount > 0}
    <ToyLightbox
        toyName={toy.name || 'Toy'}
        imageKeys={sortedImageKeys}
        {imageSets}
        activeIndex={enlargedImageIndex}
        {zoom}
        {fullResolutionRequested}
        usesFullResolution={useFullResolution}
        {getImagePath}
        {getThumbnailSet}
        {getDownloadPath}
        onclose={closeEnlargedImage}
        onprevious={() => showEnlargedImage(step(enlargedImageIndex, -1))}
        onnext={() => showEnlargedImage(step(enlargedImageIndex, 1))}
        onselect={(index) => index !== enlargedImageIndex && showEnlargedImage(index)}
        onstandardresolutionload={handleStandardResolutionLoad}
        onfullresolutionload={handleFullResolutionLoad}
        onfullresolutionerror={handleFullResolutionError}
    />
{/if}

<style lang="postcss">
    .detail-layout {
        display: flex;
        flex-direction: column;
        gap: clamp(0.75rem, 2vw, 1rem);
        width: 100%;
        min-width: 0;
        min-height: 0;
    }

    .image-column,
    .detail-column {
        width: 100%;
        min-width: 0;
    }

    .image-frame {
        position: relative;
        overflow: hidden;
        background: #050308;
        border: 4px solid var(--toys-ink, #050308);
        border-radius: 0;
        box-shadow: var(--toys-shadow-md, 5px 5px 0 #050308);
    }

    .image-stage {
        touch-action: pan-y pinch-zoom;
        overscroll-behavior-x: auto;
        overscroll-behavior-y: auto;
        position: relative;
        overflow: hidden;
        aspect-ratio: 3 / 4;
        width: 100%;
        max-height: calc(100vh - 11rem);
        max-height: calc(100dvh - 11rem);
        min-height: 20rem;
        border-radius: 0;
        /* Letterbox ground: flat ink with a faint light halftone screen, so the
           strips beside a narrow photo read as printed stage, not empty space. */
        background-color: #050308;
        background-image: radial-gradient(
            circle,
            color-mix(in srgb, #ffffff 10%, transparent) 1.1px,
            transparent 1.2px
        );
        background-size: var(--toys-halftone-size, 8px) var(--toys-halftone-size, 8px);
    }

    /* Ink keyline: a resting inner stroke that inks the photo's edges into
       the frame. */
    .image-stage::after {
        content: "";
        position: absolute;
        inset: 0;
        z-index: 2;
        box-shadow: inset 0 0 0 3px color-mix(in srgb, #050308, transparent 18%);
        pointer-events: none;
    }

    /* Prev/next tabs: solid accent plates edge-mounted on the frame. Large
       screens only; phones and tablets swipe the photo or tap the strip. */
    .viewer-nav {
        position: relative;
        z-index: 20;
        display: flex;
        flex-shrink: 0;
        align-items: center;
        justify-content: center;
        min-width: 2.75rem;
        min-height: 2.75rem;
        padding: 0.5rem;
        color: #050308;
        background: var(--detail-accent);
        border: 3px solid var(--toys-ink, #050308);
        border-radius: 0;
        box-shadow: var(--toys-shadow-sm, 3px 3px 0 #050308);
        transition:
            transform 140ms cubic-bezier(0.22, 1, 0.36, 1),
            border-color 140ms ease,
            background-color 140ms ease,
            box-shadow 140ms ease;
    }

    /* Specular strip along the nav plate's top edge. */
    .viewer-nav::before {
        content: "";
        position: absolute;
        inset: 0 0 auto;
        height: var(--toys-spec-h, 3px);
        background: var(--toys-spec, color-mix(in srgb, #ffffff 35%, transparent));
        pointer-events: none;
    }

    /* Shade line along the nav plate's bottom edge. */
    .viewer-nav::after {
        content: "";
        position: absolute;
        inset: auto 0 0;
        height: 3px;
        background: color-mix(in srgb, var(--detail-accent), var(--toys-ink, #050308) 30%);
        pointer-events: none;
    }

    .viewer-nav-overlay {
        display: none;
        position: absolute;
        top: 50%;
        transform: translateY(-50%);
    }

    .viewer-nav-prev {
        left: 0.6rem;
    }

    .viewer-nav-next {
        right: 0.6rem;
    }

    @media (min-width: 64rem) {
        .viewer-nav-overlay {
            display: flex;
        }
    }

    .viewer-nav:focus-visible {
        outline: 3px solid var(--detail-ink);
        outline-offset: 3px;
    }

    /* With a mouse the plates stay off the photo until the pointer (or
       keyboard focus) is on the stage; touch keeps them visible. */
    @media (hover: hover) and (pointer: fine) {
        .viewer-nav-overlay {
            opacity: 0;
            transition-property: transform, border-color, background-color, box-shadow, opacity;
        }

        .image-stage:hover .viewer-nav-overlay,
        .image-stage:focus-within .viewer-nav-overlay {
            opacity: 1;
        }
    }

    @media (hover: hover) {
        .viewer-nav:hover {
            background: color-mix(in srgb, var(--detail-accent), white 12%);
            transform: translate(-1px, -1px);
            box-shadow: 4px 4px 0 var(--toys-ink, #050308);
        }

        .viewer-nav-overlay:hover {
            transform: translateY(-50%) translate(-1px, -1px);
        }
    }

    .detail-column {
        display: flex;
        flex-direction: column;
        gap: clamp(0.75rem, 2vw, 1rem);
        min-height: 0;
    }

    .detail-layout :global(.text-rose-300),
    .detail-layout :global(.text-rose-200) {
        color: var(--detail-accent);
    }

    @media (min-width: 1024px) {
        .detail-layout {
            display: grid;
            grid-template-columns: minmax(0, 1.1fr) minmax(24rem, 0.9fr);
            align-items: start;
            height: 100%;
        }

        .image-column,
        .detail-column {
            display: flex;
            flex-direction: column;
            min-height: 0;
        }

        /* Without notes, stretch to the photo's height so the empty notes
           panel fills the column instead of trailing off. */
        .detail-column.awaiting-notes {
            align-self: stretch;
        }

        .image-frame {
            flex: 0 1 auto;
            min-height: 0;
        }

        .image-stage {
            height: calc(100vh - 12rem);
            height: calc(100dvh - 12rem);
            min-height: 0;
            max-height: none;
            aspect-ratio: auto;
        }
    }

    @media (max-width: 640px) {
        .image-stage {
            min-height: min(18rem, calc(100vw - 1.75rem));
            max-height: 68vh;
            max-height: 68dvh;
        }
    }

        @media (prefers-reduced-motion: reduce) {
        *, *::before, *::after {
            transition-duration: 0.01ms !important;
            animation-duration: 0.01ms !important;
            animation-iteration-count: 1 !important;
            scroll-behavior: auto !important;
        }
    }
</style>
