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
        name, 
        image = undefined, 
        slug, 
        faction = undefined, 
        series = undefined, 
        description = undefined, 
        year = undefined, 
        hasImages = false,
        imageFiles = [],
        index = 0
    }: {
        name: string;
        image?: string;
        slug: string;
        faction?: string;
        series?: string;
        description?: string;
        year?: string;
        hasImages?: boolean;
        imageFiles?: string[];
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
    const toyPagePath = $derived(`/toys/${slug}`);
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
>
    <div class="poster-frame">
        {#if !imageLoaded && (baseImagePath || imagePath)}
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
                    loading="eager"
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
                loading="eager"
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
        
        <div class="card-edge"></div>
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
                <span class="meta-chip">{year}</span>
            {/if}
            {#if series}
                <span class="meta-chip">{series}</span>
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
    .toy-card {
        display: grid;
        grid-template-rows: auto auto 1fr;
        height: 100%;
        overflow: hidden;
        color: white;
        background: var(--card-surface, #09070e);
        border: var(--site-outline-width, 4px) solid var(--site-outline, #050308);
        border-radius: var(--site-radius, 0.65rem);
        box-shadow: 0 0.4rem 0 var(--site-outline, #050308);
        transform: translateY(0);
        transition:
            transform 180ms cubic-bezier(0.22, 1, 0.36, 1),
            border-color 180ms ease,
            box-shadow 180ms ease;
    }

    .toy-card:focus-visible {
        outline: 3px solid var(--card-accent);
        outline-offset: 4px;
        border-color: var(--card-accent);
    }

    .poster-frame {
        position: relative;
        aspect-ratio: 3 / 4;
        overflow: hidden;
        border-radius: calc(var(--site-radius, 0.65rem) - 3px) calc(var(--site-radius, 0.65rem) - 3px) 0 0;
        background: #060409;
    }

    .poster-frame::before {
        content: "";
        position: absolute;
        inset: 0;
        z-index: 4;
        box-shadow: inset 0 0 0 3px var(--card-accent);
        box-shadow: inset 0 0 0 3px color-mix(in srgb, var(--card-accent), #050308 18%);
        pointer-events: none;
    }

    .toy-image {
        display: block;
        width: 100%;
        height: 100%;
        object-fit: cover;
        object-position: center center;
        transition: transform 260ms cubic-bezier(0.22, 1, 0.36, 1), opacity 220ms ease;
    }

    .poster-frame picture {
        display: block;
        height: 100%;
        border-radius: inherit;
        overflow: hidden;
    }

    .skeleton-pulse,
    .toy-image,
    .missing-image,
    .poster-frame::before {
        border-radius: inherit;
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
        font-family: Goldman, sans-serif;
        font-size: 1rem;
    }

    .card-edge {
        position: absolute;
        inset: 0;
        z-index: 5;
        border-radius: inherit;
        box-shadow: inset 0 0 0 4px var(--card-accent);
        opacity: 0;
        transition: opacity 180ms ease;
        pointer-events: none;
    }

    .card-copy {
        position: relative;
        z-index: 6;
        display: flex;
        align-items: flex-end;
        width: 100%;
        min-height: 4rem;
        padding: 0.62rem 0.72rem;
        color: var(--card-accent-ink);
        background: var(--card-accent);
        border-top: 4px solid var(--site-outline, #050308);
        border-bottom: 4px solid var(--site-outline, #050308);
        transition: background-color 180ms ease;
    }

    .card-copy h3 {
        overflow: hidden;
        color: var(--card-accent-ink);
        display: -webkit-box;
        -webkit-box-orient: vertical;
        -webkit-line-clamp: 2;
        line-clamp: 2;
        font-family: Goldman, sans-serif;
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
        border-radius: 0 0 calc(var(--site-radius, 0.65rem) - 4px) calc(var(--site-radius, 0.65rem) - 4px);
    }

    .meta-row {
        display: flex;
        flex-wrap: nowrap;
        gap: 0.4rem;
        align-items: flex-start;
        min-width: 0;
        overflow: visible;
    }

    .meta-chip {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        box-sizing: border-box;
        min-width: 0;
        height: 2rem;
        padding: 0.08rem 0.55rem 0;
        overflow: hidden;
        color: var(--card-panel-ink);
        background: var(--card-surface);
        background: color-mix(in srgb, var(--card-surface), black 18%);
        border: 2px solid #050308;
        border-radius: 0.35rem;
        font-size: 0.875rem;
        font-weight: 800;
        line-height: 1;
        text-overflow: ellipsis;
        white-space: nowrap;
    }

    .description {
        min-height: 2.8em;
        padding-top: 0.08rem;
    }

    .description div {
        overflow: hidden;
        display: -webkit-box;
        -webkit-box-orient: vertical;
        -webkit-line-clamp: 2;
        line-clamp: 2;
        color: var(--card-panel-ink);
        font-size: 0.9rem;
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
            gap: 0.25rem;
        }

        .meta-chip,
        .meta-row :global(.faction-badge) {
            height: 1.7rem;
            padding-inline: 0.35rem;
            font-size: 0.7rem;
        }
    }

    @media (hover: hover) {
        .toy-card:hover {
            transform: translateY(-3px);
            box-shadow: 0 0.55rem 0 var(--site-outline, #050308);
        }

        .toy-card:hover .card-edge {
            opacity: 0.72;
        }

        .toy-card:hover .card-copy {
            background: var(--card-accent);
            background: color-mix(in srgb, var(--card-accent), white 12%);
        }

        .toy-card:hover .toy-image {
            transform: scale(1.035);
        }
    }

    .toy-card:active {
        transform: translateY(1px);
        box-shadow: 0 0.25rem 0 var(--site-outline, #050308);
    }

    .skeleton-pulse {
        background: linear-gradient(110deg, rgba(255, 255, 255, 0.05), rgba(255, 255, 255, 0.14), rgba(255, 255, 255, 0.05));
        animation: skeleton 1.5s ease-in-out infinite;
    }
    
    @keyframes skeleton {
        0%, 100% { opacity: 0.4; }
        50% { opacity: 0.7; }
    }
    @media (max-width: 520px) {
        .toy-card {
            grid-template-rows: auto auto auto;
            height: auto;
        }

        .card-copy {
            min-height: 3.75rem;
            padding: 0.58rem 0.65rem;
        }

        .card-copy h3 {
            font-size: 1rem;
        }

        .info-plate {
            grid-template-rows: auto auto;
            gap: 0.4rem;
            min-height: 0;
            padding: 0.6rem 0.45rem 0.7rem;
        }

        .meta-row {
            --badge-height: 1.4rem;
            --badge-padding-inline: 0.26rem;
            --badge-font-size: 0.58rem;
            --badge-shadow: 0 3px 0 #050308;
            flex-wrap: nowrap;
            gap: 0.2rem;
        }

        .meta-chip {
            height: 1.4rem;
            min-width: 0;
            padding-inline: 0.26rem;
            box-shadow: 0 2px 0 #050308;
            font-size: 0.58rem;
            white-space: nowrap;
        }

        .description div {
            font-size: 0.875rem;
        }
    }

    @media (prefers-reduced-motion: reduce) {
        .toy-card,
        .toy-image,
        .card-edge,
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

        .poster-frame picture,
        .poster-frame > .missing-image,
        .poster-frame > .skeleton-pulse {
            position: absolute;
            inset: 0;
        }
    }
</style>
