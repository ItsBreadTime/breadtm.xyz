<script lang="ts">
    import { getPictureSources } from '$lib/toys/imageLoading';

    type ThumbnailRailVariant = 'mobile' | 'desktop';
    type GalleryActivationEvent = MouseEvent | KeyboardEvent;

    interface Props {
        variant: ThumbnailRailVariant;
        imageKeys: string[];
        currentImageIndex: number;
        toyName?: string;
        getThumbnailSet: (imageKey: string) => string[];
        placeholders?: Record<string, string>;
        getImagePath: (filename: string) => string;
        getImagePagePath: (imageKey: string) => string;
        onselect: (event: GalleryActivationEvent, index: number) => void;
    }

    let {
        variant,
        imageKeys,
        currentImageIndex,
        toyName,
        getThumbnailSet,
        placeholders = {},
        getImagePath,
        getImagePagePath,
        onselect
    }: Props = $props();

    let rail: HTMLDivElement | undefined = $state();

    // Keep the active thumb in view as the reader flips through photos.
    // Scrolls only the rail itself, never the page.
    $effect(() => {
        const thumb = rail?.children[currentImageIndex] as HTMLElement | undefined;
        if (!rail || !thumb || rail.scrollWidth <= rail.clientWidth) return;
        const target = thumb.offsetLeft - (rail.clientWidth - thumb.offsetWidth) / 2;
        const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        rail.scrollTo({ left: target, behavior: reduceMotion ? 'auto' : 'smooth' });
    });
</script>

{#if imageKeys.length > 1}
    <div bind:this={rail} class={variant === 'mobile' ? 'thumb-rail thumb-rail-mobile' : 'thumb-rail thumb-rail-desktop'}>
        {#each imageKeys as imageKey, index}
            {@const imageSet = getThumbnailSet(imageKey)}
            {@const sources = getPictureSources(imageSet)}

            <a
                href={getImagePagePath(imageKey)}
                class="thumb"
                class:active={index === currentImageIndex}
                onclick={(event) => onselect(event, index)}
                onkeydown={(event) => onselect(event, index)}
                aria-label="View {toyName} image {index + 1}"
                aria-current={index === currentImageIndex ? 'true' : 'false'}
            >
                {#if placeholders[imageKey]}
                    <div class="image-placeholder" style:background-image="url({placeholders[imageKey]})" style:--placeholder-blur="6px" aria-hidden="true"></div>
                {/if}
                {#if sources.fallback}
                    <picture>
                        {#if sources.avif}
                            <source srcset={getImagePath(sources.avif)} type="image/avif" />
                        {/if}
                        {#if sources.webp}
                            <source srcset={getImagePath(sources.webp)} type="image/webp" />
                        {/if}
                        {#if sources.jpg}
                            <source srcset={getImagePath(sources.jpg)} type="image/jpeg" />
                        {/if}
                        <img
                            src={getImagePath(sources.preferred || sources.fallback)}
                            alt="{toyName} thumbnail {index + 1}"
                            class="w-full h-full object-cover"
                            loading={index < 4 ? 'eager' : 'lazy'}
                            decoding="async"
                            width="480"
                            height="640"
                        />
                    </picture>
                {/if}
            </a>
        {/each}
    </div>
{/if}

<style>
    .thumb-rail {
        display: flex;
        gap: 0.55rem;
    }

    .thumb-rail-mobile {
        position: relative;
        overflow-x: auto;
        margin-top: 0.75rem;
        padding: 0.2rem 0.2rem 0.45rem;
        justify-content: flex-start;
    }

    .thumb-rail-desktop {
        display: none;
    }

    @media (min-width: 64rem) {
        .thumb-rail-mobile {
            display: none;
        }

        /* Thumbs float free — no container box. */
        .thumb-rail-desktop {
            display: flex;
            flex-wrap: wrap;
            justify-content: flex-start;
            overflow: hidden;
            padding: 0.2rem 0.2rem 0.45rem;
            background: transparent;
            border: 0;
            border-radius: 0;
            box-shadow: none;
        }
    }

    .thumb {
        position: relative;
        flex-shrink: 0;
        width: 5rem;
        height: 5rem;
        overflow: hidden;
        /* Visible slot while the thumbnail decodes, instead of a black hole. */
        background: color-mix(in srgb, var(--toys-ink, #050308), #ffffff 12%);
        border: 2px solid var(--toys-ink, #050308);
        border-radius: 0;
        box-shadow: 2px 2px 0 var(--toys-ink, #050308);
        transition:
            transform 140ms cubic-bezier(0.22, 1, 0.36, 1),
            border-color 140ms ease,
            box-shadow 140ms ease;
    }

    .thumb.active {
        border-color: var(--detail-accent);
        transform: translate(-1px, -1px);
        box-shadow: 3px 3px 0 var(--toys-ink, #050308);
    }

    .thumb:focus-visible {
        outline: none;
        border-color: var(--detail-accent);
        box-shadow: 3px 3px 0 var(--toys-ink, #050308);
    }

    @media (hover: hover) {
        .thumb:not(.active):hover {
            border-color: color-mix(in srgb, var(--detail-accent), white 30%);
            transform: translate(-1px, -1px);
            box-shadow: 3px 3px 0 var(--toys-ink, #050308);
        }
    }

    /* Stacks above the blurred placeholder. */
    picture {
        position: relative;
        display: block;
        width: 100%;
        height: 100%;
    }

    @media (prefers-reduced-motion: reduce) {
        .thumb {
            transition: none;
        }
    }
</style>
