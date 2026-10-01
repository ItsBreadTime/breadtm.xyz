<script lang="ts">
    import { preloadData } from '$app/navigation';
    import { onMount } from 'svelte';
    import { getFactionTheme } from '$lib/toys/factions';
    import {
        imageResolutionCache,
        getImageResolutionCacheKey,
        markImageResolutionCached
    } from '$lib/toys/fullResolutionCache';
    import { getToyDetailPrefetchPaths } from '$lib/toys/imageLoading';
    import Factions from './Factions.svelte';

    let {
        returnHref = "/toys",
        name, 
        image = undefined, 
        slug, 
        faction = undefined, 
        description = undefined, 
        year = undefined, 
        hasImages = false,
        imageFiles = [],
        placeholder = undefined,
        index = 0
    }: {
        returnHref?: string;
        name: string;
        image?: string;
        slug: string;
        faction?: string;
        description?: string;
        year?: string;
        hasImages?: boolean;
        imageFiles?: string[];
        placeholder?: string;
        index?: number;
    } = $props();
    
    let imageLoaded = $state(false);
    let imageError = $state(false);
    let cacheReady = $state(false);
    let selectedImageExtension = '';
    let detailPrefetchRequested = false;
    let pagePrefetchRequested = false;
    let prefetchedDetailImages: HTMLImageElement[] = [];
    let cardImageElement = $state<HTMLImageElement>();
    let theme = $derived(getFactionTheme(faction));

    onMount(() => {
        cacheReady = true;
    });

    let imagePath = $derived(hasImages && image ? `/toys/${slug}/${image}` : '');
    let baseImagePath = $derived.by(() => {
        if (!hasImages || !image) return '';
        const extMatch = image.match(/\.([^\.]+)$/);
        if (extMatch && ['avif', 'webp', 'jpg', 'jpeg'].includes(extMatch[1].toLowerCase())) {
            return `/toys/${slug}/${image.substring(0, image.lastIndexOf('.'))}`;
        }
        return '';
    });
    const imageKey = $derived.by(() => {
        if (!image) return '';
        return image
            .replace(/\.[^.]+$/, '')
            .replace(/-(?:thumb|full)$/i, '');
    });
    const cachedResolution = $derived(
        cacheReady && imageKey
            ? $imageResolutionCache[getImageResolutionCacheKey(slug, imageKey)]
            : undefined
    );
    const preferredBaseImagePath = $derived.by(() => {
        if (!imageKey) return baseImagePath;
        if (cachedResolution === 'full') return `/toys/${slug}/${imageKey}-full`;
        if (cachedResolution === 'standard') return `/toys/${slug}/${imageKey}`;
        return baseImagePath;
    });
    const cardBaseImagePath = $derived(
        imageKey ? `/toys/${slug}/${imageKey}-card` : ''
    );
    const useResponsiveCardSources = $derived(
        !!cardBaseImagePath && !cachedResolution
    );
    const toyPagePath = $derived(`/toys/${slug}?from=${encodeURIComponent(returnHref + "#toy-" + slug)}`);
    const fetchPriority = $derived(index < 2 ? 'high' : 'auto');

    function prefetchToyDetail() {
        detailPrefetchRequested = true;

        if (!pagePrefetchRequested) {
            pagePrefetchRequested = true;
            void preloadData(toyPagePath).catch(() => {
                pagePrefetchRequested = false;
            });
        }

        const currentCardSource = cardImageElement?.currentSrc || cardImageElement?.src || image || '';
        const preferredExtension = selectedImageExtension
            || currentCardSource.split('.').pop()?.toLowerCase()
            || '';
        if (!preferredExtension || prefetchedDetailImages.length > 0) return;

        prefetchedDetailImages = getToyDetailPrefetchPaths(
            slug,
            imageFiles,
            image,
            preferredExtension
        ).map((path) => {
            const prefetchedImage = new Image();
            prefetchedImage.decoding = 'async';
            prefetchedImage.fetchPriority = 'low';

            const isStandardMainImage = imageKey
                && path.startsWith(`/toys/${slug}/${imageKey}.`);
            if (isStandardMainImage) {
                prefetchedImage.onload = () => {
                    void prefetchedImage.decode()
                        .catch(() => undefined)
                        .then(() => {
                            markImageResolutionCached(
                                getImageResolutionCacheKey(slug, imageKey),
                                'standard'
                            );
                        });
                };
            }

            prefetchedImage.src = path;
            return prefetchedImage;
        });
    }

    function handleImageLoad(event: Event) {
        imageLoaded = true;
        const image = event.currentTarget as HTMLImageElement;
        const pathname = new URL(image.currentSrc || image.src, window.location.href).pathname;
        selectedImageExtension = pathname.split('.').pop()?.toLowerCase() || 'jpg';
        if (detailPrefetchRequested) prefetchToyDetail();
    }
</script>

<a 
    href={toyPagePath} 
    class="toy-card group"
    data-sveltekit-preload-code="eager"
    data-sveltekit-preload-data="hover"
    onmousemove={prefetchToyDetail}
    onfocus={prefetchToyDetail}
    data-faction={faction || 'Unknown'}
    style:--card-accent={theme.accent}
    style:--card-accent-ink={theme.accentInk}
    style:--card-surface={theme.surface}
    style:--card-panel={theme.panel}
    style:--card-panel-ink={theme.panelInk}
    style:--card-shadow={theme.shadow}
    style:--deal-index={Math.min(index, 11)}
>
    <div class="poster-frame">
        <div class="poster-inner">
            {#if placeholder && !imageError}
                <div class="image-placeholder" style:background-image="url({placeholder})" aria-hidden="true"></div>
            {:else if !imageLoaded && (baseImagePath || imagePath)}
                <div class="absolute inset-0 skeleton-pulse js-loading-only z-[1]"></div>
            {/if}

            {#if imageError}
                <div class="missing-image">
                    <span>{name}</span>
                </div>
            {:else if preferredBaseImagePath}
                <picture>
                    {#if useResponsiveCardSources}
                        <source srcset="{cardBaseImagePath}.avif 1x, {preferredBaseImagePath}.avif 2x" type="image/avif" />
                        <source srcset="{cardBaseImagePath}.webp 1x, {preferredBaseImagePath}.webp 2x" type="image/webp" />
                        <source srcset="{cardBaseImagePath}.jpg 1x, {preferredBaseImagePath}.jpg 2x" type="image/jpeg" />
                    {:else}
                        <source srcset="{preferredBaseImagePath}.avif" type="image/avif" />
                        <source srcset="{preferredBaseImagePath}.webp" type="image/webp" />
                        <source srcset="{preferredBaseImagePath}.jpg" type="image/jpeg" />
                    {/if}
                    <img
                        bind:this={cardImageElement}
                        src="{preferredBaseImagePath}.jpg"
                        alt={name}
                        class="toy-image"
                        loading={index < 4 ? 'eager' : 'lazy'}
                        fetchpriority={fetchPriority}
                        decoding="async"
                        width="480"
                        height="640"
                        onload={handleImageLoad}
                        onerror={() => { imageError = true; imageLoaded = true; }}
                    />
                </picture>
            {:else if imagePath}
                <img
                    bind:this={cardImageElement}
                    src={imagePath}
                    alt={name}
                    class="toy-image"
                    loading={index < 4 ? 'eager' : 'lazy'}
                    fetchpriority={fetchPriority}
                    decoding="async"
                    width="480"
                    height="640"
                    onload={handleImageLoad}
                    onerror={() => { imageError = true; imageLoaded = true; }}
                />
            {:else}
                <div class="missing-image">
                    <span>{name}</span>
                </div>
            {/if}
        </div>
    </div>

    <div class="card-copy">
        <h3>{name}</h3>
    </div>

    <div class="info-plate">
        <div class="meta-row">
            {#if faction}
                <Factions faction={faction} />
            {/if}
            {#if year}
                <span class="meta-line">{year}</span>
            {/if}
        </div>

        <div class:description-empty={!description} class="description">
            {#if description}
            <div>
                {@html description}
            </div>
            {/if}
        </div>
    </div>
</a>

<style>
    /* The card is an ink plate: its background is the outline and the row
       separators; a chamfer clips the top-right corner of the whole card. */
    .toy-card {
        display: grid;
        grid-template-rows: auto auto 1fr;
        height: 100%;
        padding: var(--toys-bw-xl, 5px);
        color: white;
        background: var(--toys-ink, #050308);
        clip-path: polygon(
            0 0,
            calc(100% - var(--toys-cut, 14px)) 0,
            100% var(--toys-cut, 14px),
            100% 100%,
            0 100%
        );
        filter: drop-shadow(var(--toys-shadow-md, 5px 5px 0 #050308));
        transform: translate(0, 0);
        /* Held-frame motion: hover and press land in two stepped frames. */
        transition:
            transform 140ms steps(2, jump-end),
            background-color 140ms steps(1, jump-end),
            filter 140ms steps(2, jump-end);
        /* Cards deal onto the shelf one after another (capped stagger). */
        animation: card-deal 300ms steps(3, jump-end) backwards;
        animation-delay: calc(var(--deal-index, 0) * 45ms);
    }

    @keyframes card-deal {
        0% {
            opacity: 0;
            transform: translate(0, 0.9rem) rotate(-1.5deg) scale(0.94);
        }
        60% {
            opacity: 1;
            transform: translate(0, -0.2rem) rotate(0.5deg) scale(1.01);
        }
        100% {
            opacity: 1;
            transform: none;
        }
    }

    .toy-card:focus-visible {
        outline: none;
        background: var(--card-accent);
    }

    .poster-frame {
        position: relative;
        aspect-ratio: 3 / 4;
        overflow: hidden;
        /* The frame's own ink doubles as the keyline around the photo. */
        background: #060409;
        /* The inner chamfer is cut - border*(2 - √2), not cut - border: at
           45°, insetting by the border width alone leaves the diagonal band
           ~30% thinner than the straight edges. */
        clip-path: polygon(
            0 0,
            calc(100% - max(var(--toys-cut, 14px) - var(--toys-bw-xl, 5px) * 0.5858, 0px)) 0,
            100% max(var(--toys-cut, 14px) - var(--toys-bw-xl, 5px) * 0.5858, 0px),
            100% 100%,
            0 100%
        );
    }

    /* Ink keyline: a resting inner stroke that inks the photo's edges into the
       frame, chamfer included. The plate is inset by the keyline width and its
       cut shrinks by another keyline*(2 - √2), keeping the diagonal band as
       wide as the straight edges — a rectangular inset stroke (box-shadow)
       can't follow the chamfer, so the band is drawn by the frame's ink. */
    .poster-inner {
        position: absolute;
        inset: var(--toys-bw-md, 3px);
        overflow: hidden;
        /* Faction-tinted halftone behind the photo: covers the gap between the
           image's load event and its first paint (big AVIFs decode late). */
        background-color: color-mix(in srgb, var(--card-accent, #d58bb0) 35%, var(--card-surface, #09070e));
        background-image: var(--toys-halftone);
        background-size: var(--toys-halftone-size, 8px) var(--toys-halftone-size, 8px);
        clip-path: polygon(
            0 0,
            calc(100% - max(var(--toys-cut, 14px) - (var(--toys-bw-xl, 5px) + var(--toys-bw-md, 3px)) * 0.5858, 0px)) 0,
            100% max(var(--toys-cut, 14px) - (var(--toys-bw-xl, 5px) + var(--toys-bw-md, 3px)) * 0.5858, 0px),
            100% 100%,
            0 100%
        );
    }

    .toy-image {
        position: relative;
        display: block;
        width: 100%;
        height: 100%;
        object-fit: cover;
        object-position: center center;
        transition: transform 160ms steps(2, jump-end);
    }

    .poster-frame picture {
        display: block;
        height: 100%;
    }

    .missing-image {
        display: grid;
        place-items: center;
        width: 100%;
        height: 100%;
        padding: 1rem;
        background: var(--card-surface);
        text-align: center;
    }

    .missing-image span {
        color: var(--card-panel-ink, #f5edf6);
        font-family: Goldman, 'Goldman Fallback', sans-serif;
        font-size: 1rem;
    }


    .card-copy {
        position: relative;
        z-index: 6;
        display: flex;
        align-items: flex-end;
        width: 100%;
        min-height: 4rem;
        padding: 0.62rem 0.72rem calc(0.62rem + 0.4rem);
        color: var(--card-accent-ink);
        background: var(--card-accent);
        border-top: var(--toys-bw-xl, 5px) solid var(--toys-ink, #050308);
        border-bottom: var(--toys-bw-xl, 5px) solid var(--toys-ink, #050308);
        transition: background-color 140ms steps(1, jump-end);
    }

    /* Shade band along the caption's bottom edge: darkened accent, halftone
       dots. (No corner wedge here — the clamped title can reach the corner
       and text never sits on shade.) */
    .card-copy::after {
        content: "";
        position: absolute;
        inset: auto 0 0;
        height: 0.4rem;
        background-color: color-mix(in srgb, var(--card-accent), var(--toys-ink, #050308) 22%);
        background-image: var(--toys-halftone);
        background-size: var(--toys-halftone-size, 8px) var(--toys-halftone-size, 8px);
        pointer-events: none;
    }

    .card-copy h3 {
        overflow: hidden;
        color: var(--card-accent-ink);
        display: -webkit-box;
        -webkit-box-orient: vertical;
        -webkit-line-clamp: 2;
        line-clamp: 2;
        font-family: Goldman, 'Goldman Fallback', sans-serif;
        min-height: 2.1em;
        font-size: clamp(1rem, 1.7vw, 1.15rem);
        font-weight: 700;
        line-height: 1.05;
        letter-spacing: 0;
    }

    .info-plate {
        position: relative;
        display: grid;
        grid-template-rows: auto 1fr;
        gap: 0.55rem;
        min-height: 7.25rem;
        padding: 0.72rem 0.75rem 0.82rem;
        color: var(--card-panel-ink);
        background: var(--card-panel);
    }

    /* Shade wedge: flat darker triangle, bottom-right, halftone-dotted, with a
       deeper solid step along its bottom edge (two-tone wedge). */
    .info-plate::after {
        content: "";
        position: absolute;
        right: 0;
        bottom: 0;
        width: min(48%, 7rem);
        height: 3.2rem;
        background-color: color-mix(in srgb, var(--card-panel), #050308 var(--toys-shade-mix, 30%));
        background-image:
            var(--toys-halftone),
            linear-gradient(color-mix(in srgb, var(--card-panel), #050308 var(--toys-shade-mix-2, 48%)) 0 0);
        background-size:
            var(--toys-halftone-size, 8px) var(--toys-halftone-size, 8px),
            100% 0.7rem;
        background-position: 0 0, left bottom;
        background-repeat: repeat, no-repeat;
        clip-path: polygon(100% 0, 100% 100%, 0 100%);
        pointer-events: none;
        transition: background-color 140ms steps(1, jump-end);
    }

    .meta-row {
        position: relative;
        z-index: 1;
        display: flex;
        flex-wrap: nowrap;
        gap: 0.6rem;
        align-items: center;
        min-width: 0;
        overflow: visible;
    }

    /* Year is plain metadata, not a sticker: one tracked line
       beside the faction badge keeps the plate from turning into a tag cloud. */
    .meta-line {
        min-width: 0;
        overflow: hidden;
        color: var(--card-panel-ink);
        font-family: Goldman, 'Goldman Fallback', sans-serif;
        font-size: 0.85rem;
        letter-spacing: 0.04em;
        line-height: 1.2;
        text-shadow: 1px 1px 0 var(--toys-ink, #050308);
        text-overflow: ellipsis;
        white-space: nowrap;
    }

    .description {
        position: relative;
        z-index: 1;
        min-height: 2.8em;
        padding-top: 0.08rem;
    }

    /* Card copy is short by convention (one line of frontmatter), so it is
       shown whole: a clamp cut it mid-word. Rows equalise via the grid. */
    .description div {
        color: var(--card-panel-ink);
        font-size: 0.875rem;
        font-weight: 500;
        line-height: 1.45;
    }

    .description-empty::after {
        content: "";
        display: block;
        min-height: 2.8em;
    }

    @media (max-width: 63.999rem) {
        .meta-row {
            gap: 0.45rem;
        }

        .meta-row :global(.faction-badge) {
            height: 1.7rem;
            padding-inline: 0.35rem;
            font-size: 0.7rem;
        }

        .meta-line {
            font-size: 0.75rem;
        }
    }

    @media (hover: hover) {
        /* The ink plate recolors to the accent: the hover border follows the
           chamfer instead of being clipped by it. */
        /* Hover pops the card off the shelf: accent under-stroke plus the
           long ink offset, the same sticker stack as the title stamp. */
        .toy-card:hover {
            background: var(--card-accent);
            transform: translate(-3px, -3px);
            filter:
                drop-shadow(3px 3px 0 var(--card-accent))
                drop-shadow(var(--toys-shadow-lg, 7px 7px 0 #050308));
        }

        .toy-card:hover .card-copy {
            background: color-mix(in srgb, var(--card-accent), white 12%);
        }

        .toy-card:hover .info-plate::after {
            background-color: color-mix(in srgb, var(--card-panel), #050308 calc(var(--toys-shade-mix, 30%) + 8%));
        }

        .toy-card:hover .toy-image {
            transform: scale(1.04);
        }
    }

    .toy-card:active {
        transform: translate(1px, 1px);
        filter: drop-shadow(var(--toys-shadow-sm, 3px 3px 0 #050308));
    }

    /* Flat two-frame blink; no gradient sweep. Tinted in the faction accent so
       a loading grid reads as cards, not empty frames. */
    .skeleton-pulse {
        background-color: color-mix(in srgb, var(--card-accent, #d58bb0) 35%, var(--card-surface, #09070e));
        background-image: var(--toys-halftone);
        background-size: var(--toys-halftone-size, 8px) var(--toys-halftone-size, 8px);
        animation: skeleton 1.5s steps(2, jump-none) infinite;
    }

    @keyframes skeleton {
        0%, 100% { opacity: 0.4; }
        50% { opacity: 0.7; }
    }

    /* Mobile: cards drop the description and keep photo / caption / meta. */
    @media (max-width: 47.999rem) {
        .info-plate {
            grid-template-rows: auto;
            min-height: 0;
        }

        .description {
            display: none;
        }
    }

    @media (max-width: 520px) {
        .toy-card {
            grid-template-rows: auto auto auto;
            height: auto;
        }

        .card-copy {
            min-height: 3.75rem;
            padding: 0.58rem 0.65rem calc(0.58rem + 0.4rem);
        }

        /* Narrow two-up cards: allow a third line before truncating. */
        .card-copy h3 {
            -webkit-line-clamp: 3;
            line-clamp: 3;
            min-height: 3.15em;
            font-size: 1rem;
        }

        .info-plate {
            gap: 0.4rem;
            padding: 0.6rem 0.45rem 0.7rem;
        }

        .meta-row {
            --badge-height: 1.5rem;
            --badge-padding-inline: 0.3rem;
            --badge-font-size: 0.7rem;
            --badge-shadow: 2px 2px 0 #050308;
            flex-wrap: wrap;
            gap: 0.3rem 0.45rem;
        }
    }

    @media (max-width: 720px) {
        .toy-card {
            filter: drop-shadow(3px 3px 0 #050308);
        }

        @media (hover: hover) {
            .toy-card:hover {
                filter:
                    drop-shadow(2px 2px 0 var(--card-accent))
                    drop-shadow(4px 4px 0 #050308);
            }
        }
    }

    @media (prefers-reduced-motion: reduce) {
        .toy-card,
        .toy-image,
        .info-plate::after,
        .skeleton-pulse {
            transition: none;
            animation: none;
        }
    }

    @supports not (aspect-ratio: 1 / 1) {
        .poster-frame {
            height: 0;
            padding-bottom: 133.333%;
        }
    }
</style>
