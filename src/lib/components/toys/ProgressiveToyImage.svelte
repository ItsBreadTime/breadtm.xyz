<script lang="ts">
    import type { CachedImageResolution } from '$lib/toys/fullResolutionCache';
    import { getFullResolutionSources, getPictureSources } from '$lib/toys/imageLoading';

    type GalleryActivationEvent = MouseEvent | KeyboardEvent;

    interface Props {
        href: string;
        imageIndex: number;
        toyName?: string;
        thumbnailImageSet: string[];
        standardImageSet: string[];
        fullResolutionBase?: string;
        cachedResolution?: CachedImageResolution;
        standardReady?: boolean;
        getImagePath: (filename: string) => string;
        onactivate: (event: GalleryActivationEvent) => void;
        onstandardload: (event: Event) => void;
    }

    let {
        href,
        imageIndex,
        toyName,
        thumbnailImageSet,
        standardImageSet,
        fullResolutionBase = '',
        cachedResolution,
        standardReady = false,
        getImagePath,
        onactivate,
        onstandardload
    }: Props = $props();

    const thumbnailSources = $derived(getPictureSources(thumbnailImageSet));
    const standardSources = $derived(getPictureSources(standardImageSet));
    const fullResolutionSources = $derived(getFullResolutionSources(fullResolutionBase));
    const standardIsVisible = $derived(
        standardReady || cachedResolution === 'standard' || cachedResolution === 'full'
    );
</script>

{#if thumbnailSources.fallback}
    <a
        {href}
        class="
            absolute inset-0 cursor-pointer bg-transparent transition-opacity duration-500
            focus:outline-none focus:ring-2 focus:ring-rose-400
        "
        onclick={onactivate}
        onkeydown={onactivate}
        aria-label="Enlarge image {imageIndex + 1}"
    >
        <picture class="image-layer image-layer-thumbnail">
            {#if thumbnailSources.avif}
                <source srcset={getImagePath(thumbnailSources.avif)} type="image/avif" />
            {/if}
            {#if thumbnailSources.webp}
                <source srcset={getImagePath(thumbnailSources.webp)} type="image/webp" />
            {/if}
            {#if thumbnailSources.jpg}
                <source srcset={getImagePath(thumbnailSources.jpg)} type="image/jpeg" />
            {/if}
            <img
                src={getImagePath(thumbnailSources.preferred || thumbnailSources.fallback)}
                alt="{toyName} - view {imageIndex + 1}"
                class="w-full h-full object-contain bg-black/60"
                sizes="(max-width: 1023px) calc(100vw - 2rem), min(48vw, 42rem)"
                loading="eager"
                fetchpriority="high"
                decoding="async"
                width="1728"
                height="2304"
            />
        </picture>

        {#if standardSources.fallback}
            <picture
                class="image-layer image-layer-standard"
                class:active={standardIsVisible}
                aria-hidden="true"
            >
                {#if standardSources.avif}
                    <source srcset={getImagePath(standardSources.avif)} type="image/avif" />
                {/if}
                {#if standardSources.webp}
                    <source srcset={getImagePath(standardSources.webp)} type="image/webp" />
                {/if}
                {#if standardSources.jpg}
                    <source srcset={getImagePath(standardSources.jpg)} type="image/jpeg" />
                {/if}
                <img
                    src={getImagePath(standardSources.preferred || standardSources.fallback)}
                    alt=""
                    sizes="(max-width: 1023px) calc(100vw - 2rem), min(48vw, 42rem)"
                    loading="eager"
                    fetchpriority="auto"
                    decoding="async"
                    width="1728"
                    height="2304"
                    onload={onstandardload}
                />
            </picture>
        {/if}

        {#if cachedResolution === 'full' && fullResolutionBase}
            <picture class="image-layer image-layer-full active" aria-hidden="true">
                <source srcset={getImagePath(fullResolutionSources.avif || '')} type="image/avif" />
                <source srcset={getImagePath(fullResolutionSources.webp || '')} type="image/webp" />
                <source srcset={getImagePath(fullResolutionSources.jpg || '')} type="image/jpeg" />
                <img
                    src={getImagePath(fullResolutionSources.jpg || fullResolutionSources.fallback || '')}
                    alt=""
                    sizes="(max-width: 1023px) calc(100vw - 2rem), min(48vw, 42rem)"
                    loading="eager"
                    fetchpriority="low"
                    decoding="async"
                    width="3456"
                    height="4608"
                />
            </picture>
        {/if}
    </a>
{/if}

<style lang="postcss">
    picture {
        display: block;
        width: 100%;
        height: 100%;
    }

    img {
        width: 100%;
        height: 100%;
        object-fit: contain;
        border-radius: inherit;
    }

    .image-layer {
        position: absolute;
        inset: 0;
        transition: opacity 180ms cubic-bezier(0.22, 1, 0.36, 1);
    }

    .image-layer-thumbnail {
        z-index: 0;
        opacity: 1;
    }

    .image-layer-standard {
        z-index: 1;
        opacity: 0;
    }

    .image-layer-full {
        z-index: 2;
        opacity: 0;
    }

    .image-layer-standard.active,
    .image-layer-full.active {
        opacity: 1;
    }

    @media (prefers-reduced-motion: reduce) {
        .image-layer {
            transition: none;
        }
    }
</style>
