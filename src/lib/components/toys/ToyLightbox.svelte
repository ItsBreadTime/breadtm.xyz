<script module lang="ts">
    export interface ToyLightboxProps {
        toyName: string;
        imageKeys: string[];
        imageSets: Record<string, string[]>;
        activeIndex: number;
        zoomScale: number;
        zoomOffsetX: number;
        zoomOffsetY: number;
        minZoom: number;
        maxZoom: number;
        fullResolutionRequested: boolean;
        usesFullResolution: boolean;
        getImagePath: (filename: string) => string;
        getThumbnailSet: (imageKey: string) => string[];
        getDownloadPath: (imageKey: string) => string;
        onclose: () => void;
        onbackdropclick: (event: MouseEvent) => void;
        onprevious: () => void;
        onnext: () => void;
        onselect: (index: number) => void;
        onzoomout: () => void;
        onzoomin: () => void;
        onresetzoom: () => void;
        ondoubleclick: (event: MouseEvent) => void;
        onwheel: (event: WheelEvent) => void;
        ontouchstart: (event: TouchEvent) => void;
        ontouchmove: (event: TouchEvent) => void;
        ontouchend: (event: TouchEvent) => void;
        onpointerdown: (event: PointerEvent) => void;
        onpointermove: (event: PointerEvent) => void;
        onpointerend: (event: PointerEvent) => void;
        onstandardresolutionload: (event: Event, imageKey: string) => void | Promise<void>;
        onfullresolutionload: (event: Event, imageKey: string) => void | Promise<void>;
        onfullresolutionerror: (imageKey: string) => void;
        onrootready?: (element: HTMLElement | undefined) => void;
    }
</script>

<script lang="ts">
    import { onMount } from 'svelte';
    import { getFullResolutionSources, getPictureSources } from '$lib/toys/imageLoading';

    let {
        toyName,
        imageKeys,
        imageSets,
        activeIndex,
        zoomScale,
        zoomOffsetX,
        zoomOffsetY,
        minZoom,
        maxZoom,
        fullResolutionRequested,
        usesFullResolution,
        getImagePath,
        getThumbnailSet,
        getDownloadPath,
        onclose,
        onbackdropclick,
        onprevious,
        onnext,
        onselect,
        onzoomout,
        onzoomin,
        onresetzoom,
        ondoubleclick,
        onwheel,
        ontouchstart,
        ontouchmove,
        ontouchend,
        onpointerdown,
        onpointermove,
        onpointerend,
        onstandardresolutionload,
        onfullresolutionload,
        onfullresolutionerror,
        onrootready
    }: ToyLightboxProps = $props();

    let rootElement: HTMLElement;

    const activeImageKey = $derived(imageKeys[activeIndex] || '');
    const activeImageSet = $derived(imageSets[activeImageKey] || []);
    const activeSources = $derived(getPictureSources(activeImageSet));
    const fullResolutionBase = $derived(
        activeSources.fallback ? `${getBaseFilename(activeSources.fallback)}-full` : ''
    );
    const fullResolutionSources = $derived(getFullResolutionSources(fullResolutionBase));

    function getBaseFilename(filename: string): string {
        return filename.split('.').slice(0, -1).join('.');
    }

    function handleDialogKeydown(event: KeyboardEvent): void {
        if (event.key !== 'Escape') return;
        event.stopPropagation();
        onclose();
    }

    onMount(() => {
        rootElement.focus();
        onrootready?.(rootElement);

        return () => onrootready?.(undefined);
    });
</script>

<div
    class="lightbox"
    bind:this={rootElement}
    onclick={onbackdropclick}
    onkeydown={handleDialogKeydown}
    role="dialog"
    aria-modal="true"
    aria-labelledby="enlarged-image-title"
    tabindex="0"
>
    <div class="lightbox-shell">
        <div class="lightbox-topbar">
            <h2 id="enlarged-image-title" class="lightbox-title">
                <span>Image {activeIndex + 1} of {imageKeys.length}</span>
                <span>{toyName}</span>
            </h2>
            <span class="lightbox-help">← → Navigate · ESC Close</span>
            <div class="lightbox-actions">
                <a
                    href={getDownloadPath(activeImageKey)}
                    download
                    class="lightbox-action"
                    title="Download full resolution"
                    aria-label="Download full resolution image"
                >
                    <svg
                        xmlns="http://www.w3.org/2000/svg"
                        class="h-5 w-5"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                    >
                        <path
                            stroke-linecap="round"
                            stroke-linejoin="round"
                            stroke-width="2"
                            d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                        />
                    </svg>
                </a>
                <button type="button" class="lightbox-action" onclick={onclose} aria-label="Close enlarged image view">
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                </button>
            </div>
        </div>

        <div class="lightbox-stage-row">
            <div
                class="lightbox-stage"
                class:zoomed={zoomScale > minZoom}
                ontouchstart={ontouchstart}
                ontouchmove={ontouchmove}
                ontouchend={ontouchend}
                onwheel={onwheel}
                ondblclick={ondoubleclick}
                onpointerdown={onpointerdown}
                onpointermove={onpointermove}
                onpointerup={onpointerend}
                onpointercancel={onpointerend}
                role="group"
                aria-label="Enlarged toy image"
            >
                {#key activeImageKey}
                    {#if activeSources.fallback}
                        <picture
                            class="enlarged-picture enlarged-picture-standard"
                            class:inactive={usesFullResolution}
                            data-resolution="standard"
                        >
                            {#if activeSources.avif}
                                <source srcset={getImagePath(activeSources.avif)} type="image/avif" />
                            {/if}
                            {#if activeSources.webp}
                                <source srcset={getImagePath(activeSources.webp)} type="image/webp" />
                            {/if}
                            {#if activeSources.jpg}
                                <source srcset={getImagePath(activeSources.jpg)} type="image/jpeg" />
                            {/if}
                            <img
                                src={getImagePath(activeSources.preferred || activeSources.fallback)}
                                alt="{toyName} - enlarged view {activeIndex + 1}"
                                class="enlarged-image"
                                data-resolution="standard"
                                sizes="100vw"
                                loading="eager"
                                fetchpriority="high"
                                decoding="async"
                                width="1728"
                                height="2304"
                                draggable="false"
                                style={`transform: translate3d(${zoomOffsetX}px, ${zoomOffsetY}px, 0) scale(${zoomScale});`}
                                onload={(event) => onstandardresolutionload(event, activeImageKey)}
                            />
                        </picture>

                        {#if (fullResolutionRequested || usesFullResolution) && fullResolutionBase}
                            <picture
                                class="enlarged-picture enlarged-picture-full"
                                class:active={usesFullResolution}
                                data-resolution="full"
                                aria-hidden="true"
                            >
                                <source srcset={getImagePath(fullResolutionSources.avif || '')} type="image/avif" />
                                <source srcset={getImagePath(fullResolutionSources.webp || '')} type="image/webp" />
                                <source srcset={getImagePath(fullResolutionSources.jpg || '')} type="image/jpeg" />
                                <img
                                    src={getImagePath(fullResolutionSources.jpg || fullResolutionSources.fallback || '')}
                                    alt=""
                                    class="enlarged-image"
                                    data-resolution="full"
                                    sizes="100vw"
                                    loading="eager"
                                    decoding="async"
                                    width="3456"
                                    height="4608"
                                    draggable="false"
                                    style={`transform: translate3d(${zoomOffsetX}px, ${zoomOffsetY}px, 0) scale(${zoomScale});`}
                                    onload={(event) => onfullresolutionload(event, activeImageKey)}
                                    onerror={() => onfullresolutionerror(activeImageKey)}
                                />
                            </picture>
                        {/if}
                    {/if}
                {/key}
            </div>
        </div>

        <div class="lightbox-below-image">
            {#if imageKeys.length > 1}
                <span class="lightbox-hint">Swipe to navigate · Tap outside to close</span>
            {/if}
            <div class="lightbox-controls">
                {#if imageKeys.length > 1}
                    <div class="lightbox-navigation-controls">
                        <button type="button" class="lightbox-nav lightbox-nav-prev" onclick={onprevious} aria-label="Previous image">
                            <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
                            </svg>
                        </button>
                        <span class="lightbox-counter">{activeIndex + 1} / {imageKeys.length}</span>
                        <button type="button" class="lightbox-nav lightbox-nav-next" onclick={onnext} aria-label="Next image">
                            <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
                            </svg>
                        </button>
                    </div>
                {/if}
                <div
                    class="lightbox-zoom-controls"
                    class:standalone={imageKeys.length === 1}
                    aria-label="Zoom controls"
                >
                    <button
                        type="button"
                        class="lightbox-action"
                        onclick={onzoomout}
                        aria-label="Zoom out"
                        disabled={zoomScale === minZoom}
                    >−</button>
                    <button
                        type="button"
                        class="lightbox-zoom-readout"
                        onclick={onresetzoom}
                        aria-label="Current zoom {Math.round(zoomScale * 100)}%. Reset zoom to 100%"
                        aria-live="polite"
                        title="Reset zoom to 100%"
                        disabled={zoomScale === minZoom}
                    >
                        {Math.round(zoomScale * 100)}%
                    </button>
                    <button
                        type="button"
                        class="lightbox-action"
                        onclick={onzoomin}
                        aria-label="Zoom in"
                        disabled={zoomScale === maxZoom}
                    >+</button>
                </div>
            </div>
            {#if imageKeys.length > 1}
                <div class="lightbox-thumbs">
                    {#each imageKeys as thumbnailKey, index}
                        {@const thumbnailSet = getThumbnailSet(thumbnailKey)}
                        {@const thumbnailSources = getPictureSources(thumbnailSet)}

                        <button
                            type="button"
                            class:active={index === activeIndex}
                            class="lightbox-thumb"
                            onclick={() => index !== activeIndex && onselect(index)}
                            aria-label="View image {index + 1}"
                            aria-current={index === activeIndex ? 'true' : 'false'}
                        >
                            {#if thumbnailSources.fallback}
                                <picture>
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
                                        alt="Thumbnail {index + 1}"
                                        loading="lazy"
                                        decoding="async"
                                        width="480"
                                        height="640"
                                    />
                                </picture>
                            {/if}
                        </button>
                    {/each}
                </div>
            {/if}
        </div>
    </div>
</div>

<style lang="postcss">
    .lightbox {
        --lightbox-accent: var(--viewer-accent, #f05278);
        --lightbox-accent-ink: var(--viewer-accent-ink, #210016);
        position: fixed;
        inset: 0;
        z-index: 50;
        box-sizing: border-box;
        display: grid;
        place-items: center;
        height: auto;
        overflow: hidden;
        padding: clamp(0.5rem, 2vw, 1rem);
        background: rgba(0, 0, 0, 0.96);
    }

    .lightbox-shell {
        display: grid;
        grid-template-rows: auto minmax(0, 1fr) auto;
        gap: 0.65rem;
        width: min(100%, 78rem);
        height: 100%;
        min-width: 0;
        min-height: 0;
        overflow: hidden;
    }

    .lightbox-topbar {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 0.75rem;
        flex: 0 0 auto;
        min-width: 0;
        padding: 0.25rem 0.35rem;
        background: #050308;
        border-radius: 0.45rem;
    }

    .lightbox-title {
        display: flex;
        flex: 1 1 auto;
        gap: 0.6rem;
        min-width: 0;
        overflow: hidden;
        color: var(--lightbox-accent);
        color: color-mix(in srgb, var(--lightbox-accent), white 38%);
        font-family: Goldman, sans-serif;
        font-size: clamp(0.78rem, 2vw, 1rem);
        line-height: 1.15;
        white-space: nowrap;
    }

    .lightbox-title span:first-child {
        flex: 0 0 auto;
        width: 7rem;
        font-variant-numeric: tabular-nums;
    }

    .lightbox-title span:last-child {
        overflow: hidden;
        text-overflow: ellipsis;
    }

    .lightbox-actions {
        display: flex;
        gap: 0.45rem;
        flex: 0 0 auto;
    }

    .lightbox-action,
    .lightbox-nav {
        display: grid;
        place-items: center;
        min-width: 2.75rem;
        height: 2.75rem;
        min-height: 2.75rem;
        color: var(--lightbox-accent);
        color: color-mix(in srgb, var(--lightbox-accent), white 38%);
        background: rgba(5, 3, 8, 0.92);
        border: 2px solid var(--lightbox-accent);
        border: 2px solid color-mix(in srgb, var(--lightbox-accent), white 38%);
        box-shadow: none;
        transition:
            transform 180ms cubic-bezier(0.22, 1, 0.36, 1),
            color 180ms ease,
            background-color 180ms ease,
            opacity 180ms ease;
    }

    .lightbox-action {
        border-radius: 0.45rem;
    }

    .lightbox-nav {
        flex: 0 0 auto;
        border-radius: 999px;
        box-shadow: none;
    }

    .lightbox-stage-row {
        display: grid;
        grid-template-columns: minmax(0, 1fr);
        align-items: center;
        justify-content: center;
        gap: clamp(0.35rem, 1.6vw, 0.7rem);
        min-width: 0;
        min-height: 0;
        overflow: hidden;
    }

    .lightbox-stage {
        position: relative;
        touch-action: none;
        overscroll-behavior: contain;
        user-select: none;
        display: flex;
        align-items: center;
        justify-content: center;
        flex: 1 1 auto;
        align-self: stretch;
        width: 100%;
        max-width: none;
        min-width: 0;
        min-height: 0;
        overflow: hidden;
        background: #050308;
        border: 4px solid #050308;
        border-radius: 0.65rem;
        box-shadow: none;
        cursor: zoom-in;
    }

    .lightbox-stage.zoomed {
        cursor: grab;
    }

    .lightbox-stage.zoomed:active {
        cursor: grabbing;
    }

    .lightbox-below-image {
        display: grid;
        justify-items: center;
        gap: 0.48rem;
        flex: 0 0 auto;
        width: 100%;
        min-width: 0;
    }

    .lightbox-controls {
        display: flex;
        align-items: center;
        justify-content: center;
        flex-wrap: nowrap;
        gap: 1rem;
        width: 100%;
        min-width: 0;
    }

    .lightbox-navigation-controls {
        display: inline-flex;
        align-items: center;
        gap: 0.45rem;
    }

    .lightbox-zoom-controls {
        display: inline-flex;
        align-items: center;
        gap: 0.35rem;
        margin-left: 0.25rem;
        padding-left: 0.75rem;
        border-left: 1px solid var(--lightbox-accent);
        border-left: 1px solid color-mix(in srgb, var(--lightbox-accent), transparent 40%);
    }

    .lightbox-zoom-controls.standalone {
        margin-left: 0;
        padding-left: 0;
        border-left: 0;
    }

    .lightbox-zoom-readout {
        display: inline-grid;
        place-items: center;
        min-width: 3.4rem;
        height: 2.75rem;
        min-height: 2.75rem;
        padding: 0.35rem 0.5rem;
        color: var(--lightbox-accent);
        color: color-mix(in srgb, var(--lightbox-accent), white 38%);
        background: rgba(5, 3, 8, 0.92);
        border: 2px solid var(--lightbox-accent);
        border: 2px solid color-mix(in srgb, var(--lightbox-accent), white 38%);
        border-radius: 0.45rem;
        font-family: Goldman, sans-serif;
        font-size: 0.76rem;
        line-height: 1;
        cursor: pointer;
    }

    .lightbox-action:disabled,
    .lightbox-zoom-readout:disabled {
        cursor: not-allowed;
        opacity: 0.4;
    }

    .lightbox-hint {
        display: none;
        padding: 0.28rem 0.55rem;
        color: #fff7f8;
        background: rgba(5, 3, 8, 0.78);
        border: 1px solid rgba(255, 255, 255, 0.16);
        border-radius: 0.35rem;
        font-size: 0.72rem;
    }

    .lightbox-counter {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        flex: 0 0 4.25rem;
        box-sizing: border-box;
        width: 4.25rem;
        min-width: 4.25rem;
        max-width: 4.25rem;
        height: 2.75rem;
        min-height: 2.75rem;
        padding: 0.35rem 0.7rem;
        color: var(--lightbox-accent-ink);
        background: var(--lightbox-accent);
        border: 3px solid #050308;
        border-radius: 0.36rem;
        box-shadow: 0 3px 0 rgba(0, 0, 0, 0.4);
        font-family: Goldman, sans-serif;
        font-size: 0.82rem;
        font-variant-numeric: tabular-nums;
        line-height: 1;
        text-align: center;
        white-space: nowrap;
    }

    .lightbox-thumbs {
        display: flex;
        flex-wrap: wrap;
        justify-content: center;
        gap: 0.45rem;
        width: 100%;
        overflow: hidden;
        padding: 0.5rem;
        background: rgba(5, 3, 8, 0.94);
        border: 3px solid #050308;
        border-radius: 0.45rem;
        box-shadow: none;
    }

    .lightbox-thumb {
        flex: 0 0 auto;
        width: 3.25rem;
        height: 3.25rem;
        overflow: hidden;
        background: #050308;
        border: 3px solid #050308;
        border-radius: 0.35rem;
        box-shadow: 0 3px 0 rgba(0, 0, 0, 0.42);
        opacity: 0.76;
        transition: transform 180ms ease, opacity 180ms ease, border-color 180ms ease;
    }

    .lightbox-thumb.active {
        border-color: #f4edf5;
        opacity: 1;
        transform: translateY(-3px);
    }

    .lightbox-thumb picture,
    .lightbox-thumb img {
        display: block;
        width: 100%;
        height: 100%;
    }

    .lightbox-thumb img {
        object-fit: cover;
    }

    .lightbox-help {
        display: none;
        flex: 0 0 auto;
        color: #aaa1af;
        font-size: 0.75rem;
        line-height: 1;
        white-space: nowrap;
    }

    .lightbox-action:focus-visible,
    .lightbox-nav:focus-visible,
    .lightbox-zoom-readout:focus-visible,
    .lightbox-thumb:focus-visible {
        outline: 3px solid var(--lightbox-accent);
        outline: 3px solid color-mix(in srgb, var(--lightbox-accent), white 15%);
        outline-offset: 3px;
    }

    @media (hover: hover) {
        .lightbox-action:hover,
        .lightbox-nav:hover {
            color: #050308;
            background: var(--lightbox-accent);
            background: color-mix(in srgb, var(--lightbox-accent), white 18%);
            transform: translateY(-2px);
        }

        .lightbox-thumb:hover {
            border-color: #aaa1af;
            opacity: 1;
            transform: translateY(-2px);
        }
    }

    @media (min-width: 768px) {
        .lightbox-help {
            display: inline-flex;
        }
    }

    @media (min-width: 900px) and (min-height: 520px) and (min-aspect-ratio: 4/3) {
        .lightbox-shell {
            grid-template-areas:
                "topbar topbar topbar"
                "thumbs stage controls";
            grid-template-columns: 4.75rem minmax(0, 1fr) 5rem;
            grid-template-rows: auto minmax(0, 1fr);
            width: min(100%, max(90rem, calc(133.333vh + 3.125rem)));
            width: min(100%, max(90rem, calc(133.333dvh + 3.125rem)));
        }

        .lightbox-topbar {
            grid-area: topbar;
        }

        .lightbox-stage-row {
            grid-area: stage;
        }

        .lightbox-below-image {
            display: contents;
        }

        .lightbox-controls {
            grid-area: controls;
            align-self: center;
            flex-direction: column;
            gap: 0.75rem;
            width: auto;
            min-height: 0;
        }

        .lightbox-navigation-controls,
        .lightbox-zoom-controls {
            flex-direction: column;
        }

        .lightbox-navigation-controls > .lightbox-nav,
        .lightbox-zoom-controls > .lightbox-action,
        .lightbox-counter,
        .lightbox-zoom-readout {
            box-sizing: border-box;
            width: 4.25rem;
            min-width: 4.25rem;
            max-width: 4.25rem;
        }

        .lightbox-navigation-controls > .lightbox-nav {
            height: 4.25rem;
            min-height: 4.25rem;
        }

        .lightbox-zoom-controls {
            margin-top: 0.25rem;
            margin-left: 0;
            padding-top: 0.75rem;
            padding-left: 0;
            border-top: 1px solid var(--lightbox-accent);
            border-top: 1px solid color-mix(in srgb, var(--lightbox-accent), transparent 40%);
            border-left: 0;
        }

        .lightbox-zoom-controls.standalone {
            margin-top: 0;
            padding-top: 0;
            border-top: 0;
        }

        .lightbox-thumbs {
            grid-area: thumbs;
            align-items: center;
            align-self: stretch;
            flex-direction: column;
            flex-wrap: nowrap;
            justify-content: safe center;
            width: auto;
            min-height: 0;
            overflow-x: hidden;
            overflow-y: auto;
            overscroll-behavior: contain;
            scrollbar-gutter: stable;
        }

        .lightbox-thumb.active {
            transform: none;
        }

        @media (hover: hover) {
            .lightbox-thumb:hover {
                transform: translateX(2px);
            }
        }
    }

    @media (max-width: 767px) {
        .lightbox {
            place-items: start center;
            overflow-x: hidden;
            overflow-y: auto;
            overscroll-behavior-y: contain;
        }

        .lightbox-shell {
            grid-template-rows: auto minmax(0, auto) auto;
            align-content: start;
            height: auto;
            min-height: 100%;
            overflow: visible;
        }

        .lightbox-hint {
            display: block;
        }

        .lightbox-stage-row {
            position: relative;
            align-self: center;
            width: 100%;
            height: auto;
            max-height: none;
            aspect-ratio: 3 / 4;
            grid-template-columns: minmax(0, 1fr);
        }

        .lightbox-nav {
            position: static;
            z-index: 2;
            transform: none;
        }

        .lightbox-nav-prev {
            left: auto;
        }

        .lightbox-nav-next {
            right: auto;
        }

        .lightbox-stage {
            max-width: none;
            overflow: hidden;
            background: #050308;
            border: 0;
            border-radius: 0;
            box-shadow: none;
        }

        .lightbox-stage .enlarged-image {
            width: 100%;
            height: 100%;
            max-width: 100%;
            max-height: 100%;
        }
    }

    @media (max-width: 520px) {
        .lightbox-shell {
            gap: 0.5rem;
        }

        .lightbox-title {
            gap: 0.45rem;
            font-size: 0.72rem;
        }

        .lightbox-action,
        .lightbox-nav {
            width: 2.25rem;
            min-width: 2.25rem;
            height: 2.25rem;
            min-height: 2.25rem;
        }

        .lightbox-controls {
            gap: 0.35rem;
        }

        .lightbox-navigation-controls,
        .lightbox-zoom-controls {
            gap: 0.2rem;
        }

        .lightbox-zoom-controls {
            margin-left: 0.15rem;
            padding-left: 0.35rem;
        }

        .lightbox-counter,
        .lightbox-zoom-readout {
            height: 2.25rem;
            min-height: 2.25rem;
        }

        .lightbox-counter {
            padding-inline: 0.45rem;
        }

        .lightbox-zoom-readout {
            min-width: 3rem;
            padding-inline: 0.35rem;
            font-size: 0.65rem;
        }

        .lightbox-thumb {
            width: 2.85rem;
            height: 2.85rem;
        }
    }

    .enlarged-picture {
        position: absolute;
        inset: 0;
        display: block;
        width: 100%;
        height: 100%;
        min-width: 0;
        min-height: 0;
        z-index: 0;
    }

    .enlarged-picture-full {
        z-index: 1;
        opacity: 0;
        pointer-events: none;
    }

    .enlarged-picture-full.active {
        opacity: 1;
    }

    .enlarged-picture-standard.inactive {
        visibility: hidden;
    }

    .enlarged-image {
        display: block;
        width: 100%;
        height: 100%;
        object-fit: contain;
        object-position: center center;
        transform-origin: center center;
        user-select: none;
        -webkit-user-drag: none;
        will-change: transform;
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
