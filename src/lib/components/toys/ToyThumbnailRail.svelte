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
        getImagePath,
        getImagePagePath,
        onselect
    }: Props = $props();

    const mobileContainerClass = [
        'flex overflow-x-auto gap-3 mt-3 sm:mt-4 pb-2',
        'justify-center lg:hidden'
    ].join(' ');
    const desktopContainerClass = [
        'hidden lg:flex flex-wrap gap-3 justify-start overflow-hidden',
        'bg-gray-800/80 backdrop-blur-sm p-4 rounded-lg border-2 border-black shadow-xl'
    ].join(' ');

    const getContainerClass = (): string => variant === 'mobile'
        ? mobileContainerClass
        : desktopContainerClass;

    const getThumbnailClass = (isActive: boolean): string => {
        if (variant === 'mobile') {
            return `flex-shrink-0 w-20 h-20 sm:w-20 sm:h-20 overflow-hidden rounded-md border-2 transition-all duration-300 ${
                isActive
                    ? 'border-rose-400 ring-2 ring-rose-400 shadow-lg'
                    : 'border-gray-700'
            }`;
        }

        return `w-20 h-20 overflow-hidden rounded-md border-2 transition-all duration-300 ${
            isActive
                ? 'border-rose-400 ring-2 ring-rose-400 shadow-lg scale-105'
                : 'border-gray-700 hover:border-gray-400'
        }`;
    };
</script>

{#if imageKeys.length > 1}
    <div class={getContainerClass()}>
        {#each imageKeys as imageKey, index}
            {@const imageSet = getThumbnailSet(imageKey)}
            {@const sources = getPictureSources(imageSet)}

            <a
                href={getImagePagePath(imageKey)}
                class={getThumbnailClass(index === currentImageIndex)}
                onclick={(event) => onselect(event, index)}
                onkeydown={(event) => onselect(event, index)}
                aria-label="View {toyName} image {index + 1}"
                aria-current={index === currentImageIndex ? 'true' : 'false'}
            >
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
                            loading="lazy"
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
    picture {
        display: block;
        width: 100%;
        height: 100%;
    }

    @media (prefers-reduced-motion: reduce) {
        a {
            transition: none;
            transform: none;
        }
    }
</style>
