<script lang="ts">
    import { error } from '@sveltejs/kit';
    import { page } from '$app/stores'; 
    import { getFactionTheme } from '$lib/toys/factions';
    import {
        imageResolutionCache,
        getImageResolutionCacheKey,
        markImageResolutionCached
    } from '$lib/toys/fullResolutionCache';
    import Nav from '../../sections/Nav.svelte';
    import Factions from '../../components/Factions.svelte';
    
    let { data }: { 
        data: {
            metadata: { 
                name?: string; 
                imageTemplate?: string;
                slug?: string;
                image?: string;
                series?: string; 
                year?: string; 
                faction?: string; 
                description?: string;
                imageSets?: Record<string, string[]>; // Grouped images { 'main': ['main.avif', 'main.webp', 'main.jpg'], '1': [...] }
                thumbnailImageSets?: Record<string, string[]>; // Thumbnail variants grouped by image key
                sortedImageKeys?: string[]; // Sorted keys ['main', '1', '2', ...]
            };
            component?: any; // The compiled markdown content component
        }
    } = $props(); 

    const toy = $derived.by(() => {
        if (!data.metadata) {
            throw error(404, 'Toy metadata not found');
        }
        return data.metadata;
    });
    const slug = $derived(toy.slug || $page.params.slug);
    const fullscreenTheme = $derived(getFactionTheme(toy.faction));

    // Get the compiled content from client data
    let contentComponent = $derived(data.component);
    let loadError: string | null = null; 
    
    const imageSets = $derived(toy.imageSets || {});
    const thumbnailImageSets = $derived(toy.thumbnailImageSets || {});
    const sortedImageKeys = $derived(toy.sortedImageKeys || []);
    let currentImageKeyIndex: number = $state(0);
    const currentImageKey = $derived(sortedImageKeys[currentImageKeyIndex] || '');

    let isImageEnlarged: boolean = $state(false);
    let enlargedImageIndex: number = $state(0);
    let zoomScale: number = $state(1);
    let zoomOffsetX: number = $state(0);
    let zoomOffsetY: number = $state(0);
    let requestedFullResolutionKey: string | null = $state(null);
    const enlargedImageKey = $derived(sortedImageKeys[enlargedImageIndex] || '');
    const fullResolutionRequested = $derived(requestedFullResolutionKey === enlargedImageKey);
    const useFullResolution = $derived(
        enlargedImageKey !== ''
        && $imageResolutionCache[getImageResolutionCacheKey(slug, enlargedImageKey)] === 'full'
    );
    let previousImageSignature = '';

    let touchStartX: number = 0;
    let touchEndX: number = 0;
    let touchStartY: number = 0;
    let touchEndY: number = 0;
    let panStartX: number = 0;
    let panStartY: number = 0;
    let panStartOffsetX: number = 0;
    let panStartOffsetY: number = 0;
    let pinchStartDistance: number = 0;
    let pinchStartScale: number = 1;
    let pinchStartCenterX: number = 0;
    let pinchStartCenterY: number = 0;
    let pinchStartOffsetX: number = 0;
    let pinchStartOffsetY: number = 0;
    let pointerPanActive = false;
    const MIN_SWIPE_DISTANCE = 50;
    const MIN_ZOOM = 1;
    const MAX_ZOOM = 6;
    const ZOOM_BUTTON_STEP = 0.75;
    const WHEEL_ZOOM_SENSITIVITY = 0.0035;
    const FULL_RESOLUTION_IDLE_DELAY = 220;

    let zoomFrame: number | null = null;
    let panFrame: number | null = null;
    let fullResolutionTimer: number | null = null;
    let pendingZoomScale = MIN_ZOOM;
    let pendingZoomClientX: number | null = null;
    let pendingZoomClientY: number | null = null;
    let pendingZoomOffsetX: number | null = null;
    let pendingZoomOffsetY: number | null = null;
    let pendingPanOffsetX = 0;
    let pendingPanOffsetY = 0;

    function handleTouchStart(e: TouchEvent): void {
        touchStartX = e.touches[0].clientX;
    }

    function handleTouchMove(e: TouchEvent): void {
        touchEndX = e.touches[0].clientX;
    }

    function handleTouchEnd(e: TouchEvent): void {
        if (!touchStartX || !touchEndX) return;
        
        const swipeDistance = touchEndX - touchStartX;
        if (Math.abs(swipeDistance) >= MIN_SWIPE_DISTANCE) {
            if (swipeDistance > 0) {
                prevImage();
            } else {
                nextImage();
            }
        }
        
        touchStartX = 0;
        touchEndX = 0;
    }

    function handleEnlargedTouchStart(e: TouchEvent): void {
        if (e.touches.length >= 2) {
            pinchStartDistance = getTouchDistance(e.touches[0], e.touches[1]);
            pinchStartScale = zoomScale;
            pinchStartCenterX = (e.touches[0].clientX + e.touches[1].clientX) / 2;
            pinchStartCenterY = (e.touches[0].clientY + e.touches[1].clientY) / 2;
            pinchStartOffsetX = zoomOffsetX;
            pinchStartOffsetY = zoomOffsetY;
            touchStartX = 0;
            touchEndX = 0;
            return;
        }

        const touch = e.touches[0];
        if (!touch) return;
        touchStartX = touch.clientX;
        touchEndX = touch.clientX;
        touchStartY = touch.clientY;
        touchEndY = touch.clientY;
        panStartX = touch.clientX;
        panStartY = touch.clientY;
        panStartOffsetX = zoomOffsetX;
        panStartOffsetY = zoomOffsetY;
    }

    function handleEnlargedTouchMove(e: TouchEvent): void {
        if (e.touches.length >= 2) {
            const firstTouch = e.touches[0];
            const secondTouch = e.touches[1];
            const distance = getTouchDistance(firstTouch, secondTouch);
            if (pinchStartDistance > 0) {
                const targetScale = Math.max(
                    MIN_ZOOM,
                    Math.min(MAX_ZOOM, pinchStartScale * (distance / pinchStartDistance))
                );
                const stage = e.currentTarget as HTMLElement;
                const rect = stage.getBoundingClientRect();
                const currentCenterX = (firstTouch.clientX + secondTouch.clientX) / 2;
                const currentCenterY = (firstTouch.clientY + secondTouch.clientY) / 2;
                const focalX = pinchStartCenterX - (rect.left + rect.width / 2);
                const focalY = pinchStartCenterY - (rect.top + rect.height / 2);
                const scaleRatio = targetScale / pinchStartScale;
                const nextOffsetX = currentCenterX - pinchStartCenterX
                    + focalX
                    + (pinchStartOffsetX - focalX) * scaleRatio;
                const nextOffsetY = currentCenterY - pinchStartCenterY
                    + focalY
                    + (pinchStartOffsetY - focalY) * scaleRatio;
                scheduleZoom(targetScale, null, null, nextOffsetX, nextOffsetY);
            }
            return;
        }

        const touch = e.touches[0];
        if (!touch) return;

        if (zoomScale > MIN_ZOOM) {
            schedulePan(
                panStartOffsetX + touch.clientX - panStartX,
                panStartOffsetY + touch.clientY - panStartY
            );
        } else {
            touchEndX = touch.clientX;
            touchEndY = touch.clientY;
        }
    }

    function handleEnlargedTouchEnd(e: TouchEvent): void {
        if (pinchStartDistance > 0) {
            if (e.touches.length < 2) {
                pinchStartDistance = 0;
                const remainingTouch = e.touches[0];
                if (remainingTouch) {
                    panStartX = remainingTouch.clientX;
                    panStartY = remainingTouch.clientY;
                    panStartOffsetX = pendingZoomOffsetX ?? zoomOffsetX;
                    panStartOffsetY = pendingZoomOffsetY ?? zoomOffsetY;
                }
            }
            return;
        }

        if (zoomScale > MIN_ZOOM) {
            touchStartX = 0;
            touchEndX = 0;
            return;
        }

        if (!touchStartX || !touchEndX) return;
        
        const swipeDistance = touchEndX - touchStartX;
        if (Math.abs(swipeDistance) >= MIN_SWIPE_DISTANCE) {
            if (swipeDistance > 0) {
                prevEnlargedImage();
            } else {
                nextEnlargedImage();
            }
        }
        
        touchStartX = 0;
        touchEndX = 0;
        touchStartY = 0;
        touchEndY = 0;
    }

    function getTouchDistance(first: Touch, second: Touch): number {
        return Math.hypot(second.clientX - first.clientX, second.clientY - first.clientY);
    }

    function clampPan(value: number, axis: 'x' | 'y', scale = zoomScale): number {
        const stage = document.querySelector<HTMLElement>('.lightbox-stage');
        if (!stage) return value;
        const image = stage.querySelector<HTMLImageElement>('.enlarged-picture .enlarged-image');
        const naturalWidth = image?.naturalWidth || Number(image?.getAttribute('width')) || stage.clientWidth;
        const naturalHeight = image?.naturalHeight || Number(image?.getAttribute('height')) || stage.clientHeight;
        const imageRatio = naturalWidth / naturalHeight;
        const stageWidth = stage.clientWidth;
        const stageHeight = stage.clientHeight;
        const containedWidth = Math.min(stageWidth, stageHeight * imageRatio);
        const containedHeight = Math.min(stageHeight, stageWidth / imageRatio);
        const stageSize = axis === 'x' ? stageWidth : stageHeight;
        const containedSize = axis === 'x' ? containedWidth : containedHeight;
        const limit = Math.max(0, (containedSize * scale - stageSize) / 2);
        return Math.max(-limit, Math.min(limit, value));
    }

    function cancelInteractionFrames(): void {
        if (zoomFrame !== null) {
            window.cancelAnimationFrame(zoomFrame);
            zoomFrame = null;
        }
        if (panFrame !== null) {
            window.cancelAnimationFrame(panFrame);
            panFrame = null;
        }
        pendingZoomScale = zoomScale;
        pendingZoomClientX = null;
        pendingZoomClientY = null;
        pendingZoomOffsetX = null;
        pendingZoomOffsetY = null;
        pendingPanOffsetX = zoomOffsetX;
        pendingPanOffsetY = zoomOffsetY;
    }

    function cancelFullResolutionTimer(): void {
        if (fullResolutionTimer !== null) {
            window.clearTimeout(fullResolutionTimer);
            fullResolutionTimer = null;
        }
    }

    function cancelFullResolutionLoad(): void {
        cancelFullResolutionTimer();
        requestedFullResolutionKey = null;
    }

    function resetFullResolution(): void {
        cancelFullResolutionLoad();
    }

    function queueFullResolutionLoad(scale: number): void {
        const requestedImageKey = enlargedImageKey;
        if (!requestedImageKey || useFullResolution || scale <= MIN_ZOOM) return;
        // Once this image's request has mounted, further zoom frames must not
        // unmount and restart it. Only navigation/reset cancels an active load.
        if (requestedFullResolutionKey === requestedImageKey) return;

        cancelFullResolutionTimer();
        fullResolutionTimer = window.setTimeout(() => {
            fullResolutionTimer = null;
            if (
                isImageEnlarged
                && enlargedImageKey === requestedImageKey
                && zoomScale > MIN_ZOOM
                && !useFullResolution
            ) {
                requestedFullResolutionKey = requestedImageKey;
            }
        }, FULL_RESOLUTION_IDLE_DELAY);
    }

    async function handleFullResolutionLoad(e: Event, imageKey: string): Promise<void> {
        const image = e.currentTarget as HTMLImageElement;
        try {
            await image.decode();
        } catch {
            // A completed load can still be promoted when decode() is unavailable.
        }

        markImageResolutionCached(getImageResolutionCacheKey(slug, imageKey), 'full');
        if (requestedFullResolutionKey === imageKey) requestedFullResolutionKey = null;
    }

    function handleFullResolutionError(imageKey: string): void {
        if (requestedFullResolutionKey === imageKey) requestedFullResolutionKey = null;
    }

    async function handleStandardResolutionLoad(e: Event, imageKey: string): Promise<void> {
        const image = e.currentTarget as HTMLImageElement;
        try {
            await image.decode();
        } catch {
            // A completed load still counts when decode() is unavailable.
        }

        markImageResolutionCached(getImageResolutionCacheKey(slug, imageKey), 'standard');
    }

    function scheduleZoom(
        nextScale: number,
        clientX: number | null = null,
        clientY: number | null = null,
        explicitOffsetX: number | null = null,
        explicitOffsetY: number | null = null
    ): void {
        pendingZoomScale = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, nextScale));
        pendingZoomClientX = clientX;
        pendingZoomClientY = clientY;
        pendingZoomOffsetX = explicitOffsetX;
        pendingZoomOffsetY = explicitOffsetY;
        if (zoomFrame !== null) return;

        zoomFrame = window.requestAnimationFrame(() => {
            zoomFrame = null;
            const focalClientX = pendingZoomClientX;
            const focalClientY = pendingZoomClientY;
            const nextOffsetX = pendingZoomOffsetX;
            const nextOffsetY = pendingZoomOffsetY;
            pendingZoomClientX = null;
            pendingZoomClientY = null;
            pendingZoomOffsetX = null;
            pendingZoomOffsetY = null;
            setZoom(pendingZoomScale, focalClientX, focalClientY, nextOffsetX, nextOffsetY);
        });
    }

    function schedulePan(nextOffsetX: number, nextOffsetY: number): void {
        pendingPanOffsetX = nextOffsetX;
        pendingPanOffsetY = nextOffsetY;
        if (panFrame !== null) return;

        panFrame = window.requestAnimationFrame(() => {
            panFrame = null;
            zoomOffsetX = clampPan(pendingPanOffsetX, 'x');
            zoomOffsetY = clampPan(pendingPanOffsetY, 'y');
        });
    }

    function resetZoom(): void {
        cancelInteractionFrames();
        if (!useFullResolution) cancelFullResolutionLoad();
        zoomScale = MIN_ZOOM;
        zoomOffsetX = 0;
        zoomOffsetY = 0;
        pinchStartDistance = 0;
        pendingZoomScale = MIN_ZOOM;
        pendingPanOffsetX = 0;
        pendingPanOffsetY = 0;
    }

    function setZoom(
        nextScale: number,
        clientX: number | null = null,
        clientY: number | null = null,
        explicitOffsetX: number | null = null,
        explicitOffsetY: number | null = null
    ): void {
        const clampedScale = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, nextScale));
        const previousScale = zoomScale;
        let nextOffsetX = explicitOffsetX ?? zoomOffsetX;
        let nextOffsetY = explicitOffsetY ?? zoomOffsetY;

        if (
            explicitOffsetX === null
            && explicitOffsetY === null
            && clientX !== null
            && clientY !== null
            && previousScale > 0
        ) {
            const stage = document.querySelector<HTMLElement>('.lightbox-stage');
            if (stage) {
                const rect = stage.getBoundingClientRect();
                const focalX = clientX - (rect.left + rect.width / 2);
                const focalY = clientY - (rect.top + rect.height / 2);
                const scaleRatio = clampedScale / previousScale;
                nextOffsetX = focalX + (zoomOffsetX - focalX) * scaleRatio;
                nextOffsetY = focalY + (zoomOffsetY - focalY) * scaleRatio;
            }
        }

        zoomScale = clampedScale;
        pendingZoomScale = clampedScale;
        if (clampedScale === MIN_ZOOM) {
            zoomOffsetX = 0;
            zoomOffsetY = 0;
            pendingPanOffsetX = 0;
            pendingPanOffsetY = 0;
            if (!useFullResolution) cancelFullResolutionLoad();
            return;
        }
        zoomOffsetX = clampPan(nextOffsetX, 'x', clampedScale);
        zoomOffsetY = clampPan(nextOffsetY, 'y', clampedScale);
        pendingPanOffsetX = zoomOffsetX;
        pendingPanOffsetY = zoomOffsetY;
        queueFullResolutionLoad(clampedScale);
    }

    function zoomIn(): void {
        setZoom(zoomScale + ZOOM_BUTTON_STEP);
    }

    function zoomOut(): void {
        setZoom(zoomScale - ZOOM_BUTTON_STEP);
    }

    function toggleZoom(e: MouseEvent): void {
        e.stopPropagation();
        setZoom(zoomScale === MIN_ZOOM ? 2 : MIN_ZOOM, e.clientX, e.clientY);
    }

    function handleZoomWheel(e: WheelEvent): void {
        e.preventDefault();

        const hasDominantHorizontalDelta = Math.abs(e.deltaX) > 1
            && Math.abs(e.deltaX) > Math.abs(e.deltaY) * 0.75;
        const isTrackpadPan = zoomScale > MIN_ZOOM
            && !e.ctrlKey
            && hasDominantHorizontalDelta;

        if (isTrackpadPan) {
            const baseX = panFrame === null ? zoomOffsetX : pendingPanOffsetX;
            const baseY = panFrame === null ? zoomOffsetY : pendingPanOffsetY;
            schedulePan(baseX - e.deltaX, baseY - e.deltaY);
            return;
        }

        let zoomDelta = e.deltaY;
        if (e.deltaMode === WheelEvent.DOM_DELTA_LINE) {
            zoomDelta *= 16;
        } else if (e.deltaMode === WheelEvent.DOM_DELTA_PAGE) {
            zoomDelta *= (e.currentTarget as HTMLElement).clientHeight;
        }

        // Physical wheels can report tiny pixel deltas (for example 4 or 5),
        // which previously produced a barely visible 2% change. Normalize
        // non-pinch wheel notches while keeping Ctrl/trackpad pinch continuous.
        if (!e.ctrlKey && zoomDelta !== 0) {
            zoomDelta = Math.sign(zoomDelta)
                * Math.min(64, Math.max(20, Math.abs(zoomDelta)));
        }

        const scaleFactor = Math.exp(-zoomDelta * WHEEL_ZOOM_SENSITIVITY);
        const baseScale = zoomFrame === null ? zoomScale : pendingZoomScale;
        scheduleZoom(baseScale * scaleFactor, e.clientX, e.clientY);
    }

    function handlePointerDown(e: PointerEvent): void {
        if (zoomScale === MIN_ZOOM) return;
        e.preventDefault();
        e.stopPropagation();
        pointerPanActive = true;
        panStartX = e.clientX;
        panStartY = e.clientY;
        panStartOffsetX = zoomOffsetX;
        panStartOffsetY = zoomOffsetY;
        (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    }

    function handlePointerMove(e: PointerEvent): void {
        if (!pointerPanActive) return;
        e.preventDefault();
        schedulePan(
            panStartOffsetX + e.clientX - panStartX,
            panStartOffsetY + e.clientY - panStartY
        );
    }

    function handlePointerEnd(e: PointerEvent): void {
        e.preventDefault();
        pointerPanActive = false;
        const target = e.currentTarget as HTMLElement;
        if (target.hasPointerCapture(e.pointerId)) target.releasePointerCapture(e.pointerId);
    }

    function nextImage(): void {
        if (sortedImageKeys.length === 0) return;
        currentImageKeyIndex = (currentImageKeyIndex + 1) % sortedImageKeys.length;
    }
    
    function prevImage(): void {
        if (sortedImageKeys.length === 0) return;
        currentImageKeyIndex = (currentImageKeyIndex - 1 + sortedImageKeys.length) % sortedImageKeys.length;
    }

    function openEnlargedImage(index: number): void {
        resetFullResolution();
        enlargedImageIndex = index;
        resetZoom();
        isImageEnlarged = true;
        document.body.classList.add('overflow-hidden');
        document.documentElement.classList.add('overflow-hidden');
    }

    function closeEnlargedImage(): void {
        isImageEnlarged = false;
        resetFullResolution();
        resetZoom();
        document.body.classList.remove('overflow-hidden');
        document.documentElement.classList.remove('overflow-hidden');
    }

    function handleLightboxBackdropClick(e: MouseEvent): void {
        const target = e.target;
        if (!(target instanceof Element)) return;
        if (target.closest('button, a, .enlarged-image, .lightbox-thumbs')) return;
        closeEnlargedImage();
    }

    function nextEnlargedImage(): void {
        if (sortedImageKeys.length === 0) return;
        resetFullResolution();
        enlargedImageIndex = (enlargedImageIndex + 1) % sortedImageKeys.length;
        resetZoom();
    }

    function prevEnlargedImage(): void {
        if (sortedImageKeys.length === 0) return;
        resetFullResolution();
        enlargedImageIndex = (enlargedImageIndex - 1 + sortedImageKeys.length) % sortedImageKeys.length;
        resetZoom();
    }

    function handleKeydown(e: KeyboardEvent): void {
        if (e.key === 'Escape' && isImageEnlarged) {
            closeEnlargedImage();
        } else if (e.key === 'ArrowRight') {
            if (isImageEnlarged) {
                if (sortedImageKeys.length > 0) nextEnlargedImage();
            } else {
                if (sortedImageKeys.length > 0) nextImage();
            }
        } else if (e.key === 'ArrowLeft') {
            if (isImageEnlarged) {
                if (sortedImageKeys.length > 0) prevEnlargedImage();
            } else {
                if (sortedImageKeys.length > 0) prevImage();
            }
        }
    }

    const getBaseFilename = (filename: string): string => {
        return filename.split('.').slice(0, -1).join('.');
    };

    const getExtension = (filename: string): string => {
        return filename.split('.').pop()?.toLowerCase() || '';
    };

    const imageBasePath = $derived(`/toys/${slug}/`);

    const getImagePath = (filename: string): string => {
        return imageBasePath + filename;
    };

    const getThumbnailSet = (imageKey: string): string[] => {
        const cachedResolution = $imageResolutionCache[getImageResolutionCacheKey(slug, imageKey)];
        const fullResolutionBase = getFullResolutionBase(imageKey);
        if (fullResolutionBase && cachedResolution === 'full') {
            return [
                `${fullResolutionBase}.avif`,
                `${fullResolutionBase}.webp`,
                `${fullResolutionBase}.jpg`
            ];
        }
        if (cachedResolution === 'standard') return imageSets[imageKey] || [];
        return thumbnailImageSets[imageKey] || imageSets[imageKey] || [];
    };

    const getFullResolutionBase = (imageKey: string): string => {
        const set = imageSets[imageKey] || [];
        const jpg = set.find(img => getExtension(img) === 'jpg' || getExtension(img) === 'jpeg');
        const fallback = jpg || set[0];
        return fallback ? `${getBaseFilename(fallback)}-full` : '';
    };

    const currentImageSet = $derived.by(() => {
        if (!currentImageKey) return [];

        const cachedResolution = $imageResolutionCache[
            getImageResolutionCacheKey(slug, currentImageKey)
        ];
        const fullResolutionBase = getFullResolutionBase(currentImageKey);
        if (cachedResolution === 'full' && fullResolutionBase) {
            return [
                `${fullResolutionBase}.avif`,
                `${fullResolutionBase}.webp`,
                `${fullResolutionBase}.jpg`
            ];
        }

        return imageSets[currentImageKey] || [];
    });

    const currentAvif = $derived(currentImageSet.find(img => getExtension(img) === 'avif'));
    const currentWebp = $derived(currentImageSet.find(img => getExtension(img) === 'webp'));
    const currentJpg = $derived(currentImageSet.find(img => getExtension(img) === 'jpg' || getExtension(img) === 'jpeg'));
    const currentFallback = $derived(currentJpg || currentImageSet[0]);
    const currentPreferred = $derived(currentAvif || currentWebp || currentFallback);
    
    const fullResPath = (imageKey: string): string => {
        const set = imageSets[imageKey] || [];
        if (set.length === 0) return '#';
        const jpgVersion = set.find(img => getExtension(img) === 'jpg');
        const fallbackFilename = jpgVersion ? getBaseFilename(jpgVersion) + '.jpg' : getBaseFilename(set[0]) + '.jpg';
        return `/fullres/toys/${slug}/${fallbackFilename}`;
    };

    $effect(() => {
        const imageKeySignature = `${slug}:${sortedImageKeys.join('|')}`;
        if (imageKeySignature !== previousImageSignature) {
            previousImageSignature = imageKeySignature;
            currentImageKeyIndex = 0;
            enlargedImageIndex = 0;
        }
    });

    $effect(() => {
        window.addEventListener('keydown', handleKeydown);
        
        return () => {
            cancelInteractionFrames();
            cancelFullResolutionLoad();
            window.removeEventListener('keydown', handleKeydown);
            document.body.classList.remove('overflow-hidden');
            document.documentElement.classList.remove('overflow-hidden');
        };
    });

</script>

<svelte:head>
    <link
        rel="preload"
        href="/fonts/Goldman-Bold.woff2"
        as="font"
        type="font/woff2"
        crossorigin="anonymous"
    />
    {#if isImageEnlarged}
        <title>Viewing {toy.name} - Image {enlargedImageIndex + 1} of {sortedImageKeys.length}</title>
    {:else}
        <title>{toy.name || 'Toy Detail'} | Bread's Toy Collection</title>
    {/if}
    {#if !isImageEnlarged && currentAvif}
        <link rel="preload" as="image" href={getImagePath(currentAvif)} type="image/avif" fetchpriority="high" />
    {:else if !isImageEnlarged && currentWebp}
        <link rel="preload" as="image" href={getImagePath(currentWebp)} type="image/webp" fetchpriority="high" />
    {:else if !isImageEnlarged && currentFallback}
        <link rel="preload" as="image" href={getImagePath(currentFallback)} fetchpriority="high" />
    {/if}
</svelte:head>

<div id="toy-page" data-faction={toy.faction || 'Mixed'}>
    <div id="toy-content">
        <Nav />
        <main id="toy-details">
            <div class="toy-detail-shell">
        <header class="toy-detail-title">
            <a href="/toys" class="title-back-link" aria-label="Back to toy gallery">
                <svg viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M19 12H5m6-6-6 6 6 6" />
                </svg>
            </a>
            <div class="title-plate">
                <h1>{toy.name || 'Unnamed Toy'}</h1>
                {#if toy.faction}
                    <span>{toy.faction}</span>
                {/if}
            </div>
        </header>

        <div class="detail-layout">
            <div class="image-column">
                <div class="image-frame group">
                    <div 
                        class="image-stage"
                        ontouchstart={handleTouchStart}
                        ontouchmove={handleTouchMove}
                        ontouchend={handleTouchEnd}
                        role="group"
                        aria-label="Toy image viewer"
                    >
                        {#if sortedImageKeys.length > 0}
                            {#if currentFallback}
                                <button 
                                    class="absolute inset-0 cursor-pointer bg-transparent transition-opacity duration-500 focus:outline-none focus:ring-2 focus:ring-rose-400" 
                                    onclick={() => openEnlargedImage(currentImageKeyIndex)}
                                    aria-label="Enlarge image {currentImageKeyIndex + 1}"
                                >
                                    <picture>
                                        {#if currentAvif}
                                            <source srcset={getImagePath(currentAvif)} type="image/avif" />
                                        {/if}
                                        {#if currentWebp}
                                            <source srcset={getImagePath(currentWebp)} type="image/webp" />
                                        {/if}
                                        {#if currentJpg}
                                            <source srcset={getImagePath(currentJpg)} type="image/jpeg" />
                                        {/if}
                                        <img src={getImagePath(currentPreferred)} 
                                             alt="{toy.name} - view {currentImageKeyIndex + 1}" 
                                             class="w-full h-full object-contain bg-black/60"
                                             sizes="(max-width: 1023px) calc(100vw - 2rem), min(48vw, 42rem)"
                                             loading="eager"
                                             fetchpriority="high"
                                             decoding="async"
                                             width="1728"
                                             height="2304"
                                             onload={(e) => handleStandardResolutionLoad(e, currentImageKey)} />
                                    </picture>
                                </button>
                            {/if}
                            
                            {#if sortedImageKeys.length > 1}
                                <button class="absolute left-0 top-1/2 z-20 flex min-h-11 min-w-11 -translate-y-1/2 items-center justify-center rounded-r-md bg-black/30 p-2 text-white shadow-sm transition-all duration-300 hover:bg-black/50 hover:shadow-md"
                                        onclick={prevImage}
                                        aria-label="Previous image">
                                    <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 sm:h-5 sm:w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
                                    </svg>
                                </button>
                                <button class="absolute right-0 top-1/2 z-20 flex min-h-11 min-w-11 -translate-y-1/2 items-center justify-center rounded-l-md bg-black/30 p-2 text-white shadow-sm transition-all duration-300 hover:bg-black/50 hover:shadow-md"
                                        onclick={nextImage}
                                        aria-label="Next image">
                                    <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 sm:h-5 sm:w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
                                    </svg>
                                </button>
                                
                                <div class="photo-tabs">
                                    {#each sortedImageKeys as _, i}
                                        <button
                                                class="photo-tab"
                                                onclick={(e) => {
                                                    e.stopPropagation();
                                                    currentImageKeyIndex = i;
                                                }}
                                                aria-label="View image {i+1}"
                                                aria-current={i === currentImageKeyIndex ? 'true' : 'false'}>
                                            {i + 1}
                                        </button>
                                    {/each}
                                </div>
                            {/if}
                        {:else}
                            <div class="flex items-center justify-center h-full bg-black/60">
                                <p class="text-rose-300 text-sm sm:text-base">No images available</p>
                            </div>
                        {/if}
                    </div>
                </div>
                
                <!-- Show thumbnails carousel in mobile view only -->
                {#if sortedImageKeys.length > 1}
                    <div class="flex overflow-x-auto gap-3 mt-3 sm:mt-4 pb-2 justify-center lg:hidden">
                        {#each sortedImageKeys as imageKey, i}
                            {@const currentSet = getThumbnailSet(imageKey)}
                            {@const avifSrc = currentSet.find(img => getExtension(img) === 'avif')}
                            {@const webpSrc = currentSet.find(img => getExtension(img) === 'webp')}
                            {@const jpgSrc = currentSet.find(img => getExtension(img) === 'jpg' || getExtension(img) === 'jpeg')}
                            {@const fallbackSrc = jpgSrc || currentSet[0]}
                            
                            <button 
                                class="flex-shrink-0 w-20 h-20 sm:w-20 sm:h-20 overflow-hidden rounded-md border-2 transition-all duration-300
                                       {i === currentImageKeyIndex ? 'border-rose-400 ring-2 ring-rose-400 shadow-lg' : 'border-gray-700'}"
                                onclick={() => currentImageKeyIndex = i}
                                aria-label="View {toy.name} image {i + 1}"
                                aria-current={i === currentImageKeyIndex ? 'true' : 'false'}>
                                {#if fallbackSrc}
                                    <picture>
                                        {#if avifSrc}
                                            <source srcset={getImagePath(avifSrc)} type="image/avif" />
                                        {/if}
                                        {#if webpSrc}
                                            <source srcset={getImagePath(webpSrc)} type="image/webp" />
                                        {/if}
                                        {#if jpgSrc}
                                            <source srcset={getImagePath(jpgSrc)} type="image/jpeg" />
                                        {/if}
                                        <img src={getImagePath(avifSrc || webpSrc || fallbackSrc)} alt="{toy.name} thumbnail {i + 1}" class="w-full h-full object-cover" loading="lazy" decoding="async" width="480" height="640" />
                                    </picture>
                                {/if}
                            </button>
                        {/each}
                    </div>
                {/if}
            </div>

            <div class="detail-column">
                <div class="detail-panel">
                    <dl class="meta-list">
                        {#if toy.series}
                            <div class="meta-row">
                                <dt>Series</dt>
                                <dd>{toy.series}</dd>
                            </div>
                        {/if}
                        {#if toy.year}
                            <div class="meta-row">
                                <dt>Year</dt>
                                <dd>{toy.year}</dd>
                            </div>
                        {/if}
                        {#if toy.faction}
                            <div class="meta-row">
                                <dt>Faction</dt>
                                <dd>{toy.faction}</dd>
                            </div>
                        {/if}
                    </dl>

                    {#if toy.description}
                        <div class="detail-description">
                            <span>Description</span>
                            <div>{@html toy.description}</div>
                        </div>
                    {/if}
                </div>

                <div class="notes-panel prose prose-sm sm:prose-base max-w-none">
                    <div class="prose-content-wrapper">
                        {#if contentComponent}
                            {@render contentComponent()}
                        {:else if loadError}
                            <p class="text-red-400 font-medium">{loadError}</p>
                        {:else}
                            <p class="text-gray-400 italic py-4">No additional content available for this toy.</p>
                        {/if}
                    </div>
                </div>
                
                <!-- Show thumbnails carousel on desktop view only, underneath the details card -->
                {#if sortedImageKeys.length > 1}
                    <div class="hidden lg:flex flex-wrap gap-3 justify-start overflow-hidden bg-gray-800/80 backdrop-blur-sm p-4 rounded-lg border-2 border-black shadow-xl">
                        {#each sortedImageKeys as imageKey, i}
                            {@const currentSet = getThumbnailSet(imageKey)}
                            {@const avifSrc = currentSet.find(img => getExtension(img) === 'avif')}
                            {@const webpSrc = currentSet.find(img => getExtension(img) === 'webp')}
                            {@const jpgSrc = currentSet.find(img => getExtension(img) === 'jpg' || getExtension(img) === 'jpeg')}
                            {@const fallbackSrc = jpgSrc || currentSet[0]}
                            
                            <button 
                                class="w-20 h-20 overflow-hidden rounded-md border-2 transition-all duration-300
                                       {i === currentImageKeyIndex ? 'border-rose-400 ring-2 ring-rose-400 shadow-lg scale-105' : 'border-gray-700 hover:border-gray-400'}"
                                onclick={() => currentImageKeyIndex = i}
                                aria-label="View {toy.name} image {i + 1}"
                                aria-current={i === currentImageKeyIndex ? 'true' : 'false'}>
                                {#if fallbackSrc}
                                    <picture>
                                        {#if avifSrc}
                                            <source srcset={getImagePath(avifSrc)} type="image/avif" />
                                        {/if}
                                        {#if webpSrc}
                                            <source srcset={getImagePath(webpSrc)} type="image/webp" />
                                        {/if}
                                        {#if jpgSrc}
                                            <source srcset={getImagePath(jpgSrc)} type="image/jpeg" />
                                        {/if}
                                        <img src={getImagePath(avifSrc || webpSrc || fallbackSrc)} alt="{toy.name} thumbnail {i + 1}" class="w-full h-full object-cover" loading="lazy" decoding="async" width="480" height="640" />
                                    </picture>
                                {/if}
                            </button>
                        {/each}
                    </div>
                {/if}
            </div>
        </div>
            </div>
        </main>
    </div>
</div>

{#if isImageEnlarged && sortedImageKeys.length > 0}
    {@const enlargedKey = sortedImageKeys[enlargedImageIndex]}
    {@const enlargedSet = imageSets[enlargedKey] || []}
    {@const enlargedAvif = enlargedSet.find(img => getExtension(img) === 'avif')}
    {@const enlargedWebp = enlargedSet.find(img => getExtension(img) === 'webp')}
    {@const enlargedJpg = enlargedSet.find(img => getExtension(img) === 'jpg' || getExtension(img) === 'jpeg')}
    {@const enlargedFallback = enlargedJpg || enlargedSet[0]}
    {@const enlargedFullResolutionBase = enlargedFallback ? `${getBaseFilename(enlargedFallback)}-full` : ''}

    <div
        class="lightbox"
        style:--lightbox-accent={fullscreenTheme.accent}
        style:--lightbox-accent-ink={fullscreenTheme.accentInk}
        onclick={handleLightboxBackdropClick}
        onkeydown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                closeEnlargedImage();
            }
        }}
        role="dialog"
        aria-modal="true"
        aria-labelledby="enlarged-image-title"
        tabindex="0"
    >
        <div class="lightbox-shell">
            <div class="lightbox-topbar">
                <h2 id="enlarged-image-title" class="lightbox-title">
                    <span>Image {enlargedImageIndex + 1} of {sortedImageKeys.length}</span>
                    <span>{toy.name}</span>
                </h2>
                <span class="lightbox-help">← → Navigate · ESC Close</span>
                <div class="lightbox-actions">
                    <a
                        href={fullResPath(enlargedKey)}
                        download
                        class="lightbox-action"
                        title="Download full resolution"
                        aria-label="Download full resolution image"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                        </svg>
                    </a>
                    <button class="lightbox-action" onclick={closeEnlargedImage} aria-label="Close enlarged image view">
                        <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>
            </div>

            <div class="lightbox-stage-row">
                <div
                    class="lightbox-stage"
                    class:zoomed={zoomScale > MIN_ZOOM}
                    ontouchstart={handleEnlargedTouchStart}
                    ontouchmove={handleEnlargedTouchMove}
                    ontouchend={handleEnlargedTouchEnd}
                    onwheel={handleZoomWheel}
                    ondblclick={toggleZoom}
                    onpointerdown={handlePointerDown}
                    onpointermove={handlePointerMove}
                    onpointerup={handlePointerEnd}
                    onpointercancel={handlePointerEnd}
                    role="group"
                    aria-label="Enlarged toy image"
                >
                    {#key enlargedKey}
                    {#if enlargedFallback}
                        <picture
                            class="enlarged-picture enlarged-picture-standard"
                            data-resolution="standard"
                        >
                            {#if enlargedAvif}
                                <source srcset={getImagePath(enlargedAvif)} type="image/avif" />
                            {/if}
                            {#if enlargedWebp}
                                <source srcset={getImagePath(enlargedWebp)} type="image/webp" />
                            {/if}
                            {#if enlargedJpg}
                                <source srcset={getImagePath(enlargedJpg)} type="image/jpeg" />
                            {/if}
                            <img
                                src={getImagePath(enlargedAvif || enlargedWebp || enlargedFallback)}
                                alt="{toy.name} - enlarged view {enlargedImageIndex+1}"
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
                                onload={(e) => handleStandardResolutionLoad(e, enlargedKey)}
                            />
                        </picture>

                        {#if (fullResolutionRequested || useFullResolution) && enlargedFullResolutionBase}
                            <picture
                                class="enlarged-picture enlarged-picture-full"
                                class:active={useFullResolution}
                                data-resolution="full"
                                aria-hidden="true"
                            >
                                <source srcset={getImagePath(`${enlargedFullResolutionBase}.avif`)} type="image/avif" />
                                <source srcset={getImagePath(`${enlargedFullResolutionBase}.webp`)} type="image/webp" />
                                <source srcset={getImagePath(`${enlargedFullResolutionBase}.jpg`)} type="image/jpeg" />
                                <img
                                    src={getImagePath(`${enlargedFullResolutionBase}.jpg`)}
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
                                    onload={(e) => handleFullResolutionLoad(e, enlargedKey)}
                                    onerror={() => handleFullResolutionError(enlargedKey)}
                                />
                            </picture>
                        {/if}
                    {/if}
                    {/key}
                </div>

            </div>

            <div class="lightbox-below-image">
                {#if sortedImageKeys.length > 1}
                    <span class="lightbox-hint">Swipe to navigate · Tap outside to close</span>
                {/if}
                <div class="lightbox-controls">
                    {#if sortedImageKeys.length > 1}
                        <div class="lightbox-navigation-controls">
                            <button class="lightbox-nav lightbox-nav-prev" onclick={prevEnlargedImage} aria-label="Previous image">
                                <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
                                </svg>
                            </button>
                            <span class="lightbox-counter">{enlargedImageIndex + 1} / {sortedImageKeys.length}</span>
                            <button class="lightbox-nav lightbox-nav-next" onclick={nextEnlargedImage} aria-label="Next image">
                                <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
                                </svg>
                            </button>
                        </div>
                    {/if}
                    <div
                        class="lightbox-zoom-controls"
                        class:standalone={sortedImageKeys.length === 1}
                        aria-label="Zoom controls"
                    >
                        <button class="lightbox-action" onclick={zoomOut} aria-label="Zoom out" disabled={zoomScale === MIN_ZOOM}>−</button>
                        <button
                            type="button"
                            class="lightbox-zoom-readout"
                            onclick={resetZoom}
                            aria-label="Current zoom {Math.round(zoomScale * 100)}%. Reset zoom to 100%"
                            aria-live="polite"
                            title="Reset zoom to 100%"
                            disabled={zoomScale === MIN_ZOOM}
                        >
                            {Math.round(zoomScale * 100)}%
                        </button>
                        <button class="lightbox-action" onclick={zoomIn} aria-label="Zoom in" disabled={zoomScale === MAX_ZOOM}>+</button>
                    </div>
                </div>
                {#if sortedImageKeys.length > 1}
                    <div class="lightbox-thumbs">
                        {#each sortedImageKeys as thumbKey, i}
                            {@const thumbSet = getThumbnailSet(thumbKey)}
                            {@const thumbAvif = thumbSet.find(img => getExtension(img) === 'avif')}
                            {@const thumbWebp = thumbSet.find(img => getExtension(img) === 'webp')}
                            {@const thumbJpg = thumbSet.find(img => getExtension(img) === 'jpg' || getExtension(img) === 'jpeg')}
                            {@const thumbFallback = thumbJpg || thumbSet[0]}

                            <button
                                class:active={i === enlargedImageIndex}
                                class="lightbox-thumb"
                                onclick={() => {
                                    if (i !== enlargedImageIndex) {
                                        resetFullResolution();
                                        enlargedImageIndex = i;
                                        resetZoom();
                                    }
                                }}
                                aria-label="View image {i+1}"
                                aria-current={i === enlargedImageIndex ? 'true' : 'false'}
                            >
                                {#if thumbFallback}
                                    <picture>
                                        {#if thumbAvif}
                                            <source srcset={getImagePath(thumbAvif)} type="image/avif" />
                                        {/if}
                                        {#if thumbWebp}
                                            <source srcset={getImagePath(thumbWebp)} type="image/webp" />
                                        {/if}
                                        {#if thumbJpg}
                                            <source srcset={getImagePath(thumbJpg)} type="image/jpeg" />
                                        {/if}
                                        <img
                                            src={getImagePath(thumbAvif || thumbWebp || thumbFallback)}
                                            alt="Thumbnail {i+1}"
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
{/if}

<style lang="postcss">
    .prose {
        --tw-prose-body: theme(colors.gray.300);
        --tw-prose-headings: theme(colors.rose.300);
        --tw-prose-lead: theme(colors.gray.400);
        --tw-prose-links: theme(colors.sky.400);
        --tw-prose-bold: theme(colors.gray.100);
        --tw-prose-counters: theme(colors.gray.400);
        --tw-prose-bullets: theme(colors.rose.400);
        --tw-prose-hr: theme(colors.gray.700);
        --tw-prose-quotes: theme(colors.gray.200);
        --tw-prose-quote-borders: theme(colors.rose.400);
        --tw-prose-captions: theme(colors.gray.400);
        --tw-prose-code: theme(colors.amber.300);
        --tw-prose-pre-code: theme(colors.gray.300);
        --tw-prose-pre-bg: theme(colors.gray.900);
        --tw-prose-th-borders: theme(colors.gray.600);
        --tw-prose-td-borders: theme(colors.gray.700);
    }

    .prose-content-wrapper {
        position: relative;
        z-index: 10;
    }

    .prose :global(h1),
    .prose :global(h2),
    .prose :global(h3),
    .prose :global(h4),
    .prose :global(h5),
    .prose :global(h6) {
         border-bottom: 1px solid theme(colors.gray.700);
         padding-bottom: theme(padding.2);
         margin-bottom: theme(margin.3); 
         margin-top: theme(margin.5);
         letter-spacing: 0.02em;
    }
    
    .prose :global(h1) {
        font-size: 2em;
        color: theme(colors.rose.200);
    }
    
    .prose :global(p) {
        margin-bottom: 1.2em;
        line-height: 1.7;
    }
    
     .prose :global(a) {
        text-decoration: none;
        transition: all 0.2s ease-in-out;
        border-bottom: 1px dotted theme(colors.sky.400 / 0.5);
        padding: 0 0.15em;
    }
     .prose :global(a:hover) {
        color: theme(colors.sky.300);
        border-bottom-style: solid;
        border-bottom-color: theme(colors.sky.300 / 0.8);
        background-color: theme(colors.sky.900 / 0.2);
    }
    .prose :global(img) {
        border-radius: theme(borderRadius.lg);
        box-shadow: theme(boxShadow.lg);
        margin-top: theme(margin.4);
        margin-bottom: theme(margin.4);
        border: 2px solid theme(colors.gray.700);
    }
    .prose :global(code):not(pre code) {
        background-color: theme(colors.gray.700);
        color: theme(colors.amber.300);
        padding: 0.2em 0.4em;
        border-radius: theme(borderRadius.md);
        font-size: 0.9em;
    }
     .prose :global(pre) {
         border: 1px solid theme(colors.gray.700);
         border-radius: theme(borderRadius.md);
         box-shadow: theme(boxShadow.md);
     }
     .prose :global(blockquote) {
         font-style: italic;
         border-left-width: 4px;
         background-color: theme(colors.gray.800 / 0.5);
         padding: 0.75em 1em;
         border-radius: 0 theme(borderRadius.md) theme(borderRadius.md) 0;
     }
     
     .prose :global(ul) {
        margin-left: 1em;
     }
     
     .prose :global(li) {
        margin-bottom: 0.3em;
     }
     
     .prose :global(li::marker) {
        color: theme(colors.rose.400);
     }

    .bg-gray-800\/80 {
        background-color: rgba(31, 41, 55, 0.8);
    }
    
    #toy-page {
        position: relative;
        min-height: 100dvh;
        isolation: isolate;
        --detail-accent: #f05278;
        --detail-ink: #fff7f8;
        --detail-muted: #d9cedc;
        --detail-wash-a: rgba(225, 0, 0, 0.42);
        --detail-wash-b: rgba(111, 77, 161, 0.34);
        --detail-field: #090b1f;
        --detail-field-deep: #17153f;
        --detail-grid-line: #20255d;
        color: var(--detail-ink);
        background-color: color-mix(in srgb, var(--detail-field), #050308 34%);
        background-image:
            radial-gradient(circle at 16% 0%, color-mix(in srgb, var(--detail-wash-a), transparent 70%), transparent 28rem),
            radial-gradient(circle at 88% 8%, color-mix(in srgb, var(--detail-wash-b), transparent 74%), transparent 30rem),
            linear-gradient(color-mix(in srgb, var(--detail-grid-line), transparent 78%) 1px, transparent 1px),
            linear-gradient(90deg, color-mix(in srgb, var(--detail-grid-line), transparent 78%) 1px, transparent 1px);
        background-size: auto, auto, var(--site-grid-size, 3.5rem) var(--site-grid-size, 3.5rem), var(--site-grid-size, 3.5rem) var(--site-grid-size, 3.5rem);
    }

    #toy-page::before {
        content: "";
        position: fixed;
        inset: 0;
        z-index: -1;
        background:
            linear-gradient(180deg, rgba(5, 3, 8, 0) 0%, rgba(5, 3, 8, 0.26) 48%, rgba(5, 3, 8, 0.54) 100%);
        pointer-events: none;
    }

    #toy-page::after {
        content: "";
        position: fixed;
        inset: 0;
        z-index: -1;
        background:
            radial-gradient(circle at 12% 12%, color-mix(in srgb, var(--detail-accent), transparent 84%), transparent 18rem),
            radial-gradient(circle at 92% 16%, color-mix(in srgb, var(--detail-accent), transparent 88%), transparent 20rem);
        opacity: 0.75;
        pointer-events: none;
    }

    #toy-page[data-faction='Autobot'],
    #toy-page[data-faction='Maximal'] {
        --detail-accent: #ff4b4b;
        --detail-wash-a: rgba(225, 0, 0, 0.58);
        --detail-wash-b: rgba(255, 195, 92, 0.22);
        --detail-field: #140609;
        --detail-field-deep: #371015;
        --detail-grid-line: #3b0f15;
    }

    #toy-page[data-faction='Decepticon'],
    #toy-page[data-faction='Predacon'] {
        --detail-accent: #b891ff;
        --detail-wash-a: rgba(111, 77, 161, 0.62);
        --detail-wash-b: rgba(59, 18, 90, 0.5);
        --detail-field: #100719;
        --detail-field-deep: #241537;
        --detail-grid-line: #2b1742;
    }

    #toy-page[data-faction='IKEAtron'] {
        --detail-accent: #feda00;
        --detail-wash-a: rgba(0, 88, 171, 0.56);
        --detail-wash-b: rgba(254, 218, 0, 0.34);
        --detail-field: #06101f;
        --detail-field-deep: #092545;
        --detail-grid-line: #0b2b4d;
    }

    #toy-content {
        position: relative;
        z-index: 1;
    }

    #toy-details {
        position: relative;
        min-height: calc(100dvh - 4.5rem);
    }

    .toy-detail-shell {
        display: grid;
        grid-template-columns: minmax(0, 1fr);
        grid-template-rows: auto minmax(0, 1fr);
        gap: clamp(0.75rem, 2vw, 1rem);
        width: calc(100% - clamp(1rem, 3vw, 3rem));
        max-width: none;
        min-height: calc(100dvh - 4.5rem);
        margin: 0 auto;
        padding: clamp(0.5rem, 2.2vw, 1.15rem);
    }

    .toy-detail-title {
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 0.7rem;
        width: 100%;
        min-width: 0;
    }

    .title-plate {
        display: grid;
        grid-template-columns: minmax(0, 1fr) auto;
        align-items: stretch;
        flex: 1 1 0;
        overflow: hidden;
        max-width: min(100%, 48rem);
        min-width: 0;
        border: 2px solid #050308;
        border-radius: 0.45rem;
        box-shadow: 0 5px 0 color-mix(in srgb, var(--detail-accent), #050308 28%);
    }

    .toy-detail-title h1 {
        overflow: hidden;
        min-width: 0;
        padding: 0.55rem 0.8rem;
        color: #050308;
        background: color-mix(in srgb, var(--detail-accent), white 50%);
        font-family: Goldman, sans-serif;
        font-size: clamp(1.15rem, 3vw, 2rem);
        font-weight: 800;
        line-height: 1;
        letter-spacing: 0;
        text-align: center;
        text-overflow: ellipsis;
        white-space: nowrap;
    }

    .title-plate span {
        display: grid;
        place-items: center;
        padding: 0.45rem 0.7rem;
        color: var(--detail-accent);
        background: #050308;
        border-left: 2px solid #050308;
        font-family: Goldman, sans-serif;
        font-size: clamp(0.72rem, 1.6vw, 0.9rem);
        font-weight: 800;
        line-height: 1;
        white-space: nowrap;
    }

    .title-back-link {
        display: inline-grid;
        place-items: center;
        flex: 0 0 auto;
        width: 2.75rem;
        height: 2.75rem;
        color: #050308;
        background: var(--detail-accent);
        border: 2px solid #050308;
        border-radius: 999px;
        box-shadow: 0 4px 0 rgba(0, 0, 0, 0.34);
        font-family: Goldman, sans-serif;
        font-weight: 800;
        transition: transform 180ms cubic-bezier(0.22, 1, 0.36, 1), box-shadow 180ms ease;
    }

    .title-back-link svg {
        width: 1.35rem;
        height: 1.35rem;
        fill: none;
        stroke: currentColor;
        stroke-width: 3;
        stroke-linecap: round;
        stroke-linejoin: round;
        transform: translateX(-1px);
    }

    .title-back-link:hover {
        transform: translateY(-2px);
        box-shadow: 0 6px 0 rgba(0, 0, 0, 0.34);
    }

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
        background: rgba(0, 0, 0, 0.6);
        border: 2px solid rgba(0, 0, 0, 0.9);
        border-radius: 0.6rem;
        box-shadow: 0 8px 0 rgba(0, 0, 0, 0.34);
    }

    .image-stage {
        touch-action: pan-y pinch-zoom;
        overscroll-behavior-x: auto;
        overscroll-behavior-y: auto;
        position: relative;
        overflow: hidden;
        aspect-ratio: 3 / 4;
        width: 100%;
        max-height: calc(100dvh - 11rem);
        min-height: 20rem;
        border-radius: calc(0.6rem - 2px);
        background: #050308;
    }

    .image-stage picture {
        display: block;
        width: 100%;
        height: 100%;
    }

    .image-stage img {
        width: 100%;
        height: 100%;
        object-fit: contain;
        border-radius: inherit;
    }

    .photo-tabs {
        position: absolute;
        inset: auto 0 0.8rem;
        z-index: 20;
        display: flex;
        justify-content: center;
        gap: 0.45rem;
        padding-inline: 0.75rem;
    }

    .photo-tab {
        display: grid;
        place-items: center;
        min-width: 2.75rem;
        min-height: 2.75rem;
        color: #fff7f8;
        background: #050308;
        border: 3px solid #050308;
        border-radius: 0.55rem;
        box-shadow: 0 6px 0 rgba(0, 0, 0, 0.38);
        font-family: Goldman, sans-serif;
        font-size: 0.82rem;
        font-weight: 800;
        line-height: 1;
        transition:
            transform 180ms cubic-bezier(0.22, 1, 0.36, 1),
            color 180ms ease,
            background-color 180ms ease;
    }

    .photo-tab[aria-current='true'] {
        color: #050308;
        background: var(--detail-accent);
        transform: translateY(-2px);
    }

    .photo-tab:focus-visible {
        outline: 3px solid color-mix(in srgb, var(--detail-accent), white 18%);
        outline-offset: 3px;
    }

    @media (hover: hover) {
        .photo-tab:hover {
            color: #050308;
            background: color-mix(in srgb, var(--detail-accent), white 18%);
            transform: translateY(-2px);
        }
    }

    .detail-column {
        display: flex;
        flex-direction: column;
        gap: clamp(0.75rem, 2vw, 1rem);
        min-height: 0;
    }

    #toy-details :global(.bg-gray-800\/80) {
        background-color: rgba(5, 3, 8, 0.76);
    }

    #toy-details :global(.border-black) {
        border-color: rgba(0, 0, 0, 0.9);
    }

    #toy-details :global(.text-rose-300),
    #toy-details :global(.text-rose-200) {
        color: var(--detail-accent);
    }

    #toy-details :global(.border-rose-400),
    #toy-details :global(.border-rose-400\/50) {
        border-color: color-mix(in srgb, var(--detail-accent), transparent 35%);
    }

    .detail-panel,
    .notes-panel {
        position: relative;
        overflow: hidden;
        color: var(--detail-ink);
        background: #07050d;
        border: 2px solid color-mix(in srgb, var(--detail-accent), transparent 42%);
        border-radius: 0.45rem;
        box-shadow: none;
    }

    .detail-panel::before,
    .notes-panel::before {
        content: "";
        position: absolute;
        inset: 0 0 auto;
        height: 0.18rem;
        background: var(--detail-accent);
        opacity: 0.62;
        pointer-events: none;
    }

    .detail-panel {
        padding: clamp(0.75rem, 1.8vw, 1rem);
    }

    .meta-list {
        position: relative;
        z-index: 1;
        display: flex;
        flex-wrap: wrap;
        align-items: center;
        border-block: 2px solid color-mix(in srgb, var(--detail-accent), transparent 38%);
    }

    .meta-row {
        display: inline-flex;
        align-items: baseline;
        gap: 0.42rem;
        flex: 1 1 auto;
        min-width: 0;
        padding: 0.42rem 0.72rem;
    }

    .meta-row + .meta-row {
        border-left: 1px solid color-mix(in srgb, var(--detail-accent), transparent 54%);
    }

    .meta-row dt,
    .detail-description span {
        display: block;
        color: color-mix(in srgb, var(--detail-muted), white 4%);
        font-size: 0.72rem;
        font-weight: 700;
    }

    .meta-row dd {
        overflow-wrap: anywhere;
        color: var(--detail-ink);
        font-family: Goldman, sans-serif;
        font-size: 0.92rem;
        line-height: 1.05;
    }

    .detail-description {
        position: relative;
        z-index: 1;
        margin-top: 0.62rem;
        padding-top: 0.58rem;
        color: var(--detail-muted);
        border-top: 1px solid color-mix(in srgb, var(--detail-accent), transparent 66%);
    }

    .detail-description div {
        max-width: 68ch;
        color: var(--detail-ink);
        font-size: 0.98rem;
        line-height: 1.55;
        text-wrap: pretty;
    }

    .notes-panel {
        flex: 1 1 auto;
        min-height: 0;
        padding: clamp(0.75rem, 1.8vw, 1rem);
        overflow: auto;
    }

    .notes-panel .prose-content-wrapper {
        position: relative;
        z-index: 1;
    }

    .notes-panel :global(*:first-child) {
        margin-top: 0;
    }

    .notes-panel :global(*:last-child) {
        margin-bottom: 0;
    }

    .notes-panel :global(h1),
    .notes-panel :global(h2),
    .notes-panel :global(h3) {
        color: var(--detail-ink);
        font-family: Goldman, sans-serif;
        letter-spacing: 0;
    }

    .notes-panel :global(p) {
        color: var(--detail-muted);
        line-height: 1.65;
        text-wrap: pretty;
    }

    @media (min-width: 1024px) {
        #toy-details,
        .toy-detail-shell {
            min-height: calc(100dvh - 4.5rem);
        }

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

        .image-frame {
            flex: 0 1 auto;
            min-height: 0;
        }

        .image-stage {
            height: calc(100dvh - 12rem);
            min-height: 0;
            max-height: none;
            aspect-ratio: auto;
        }

        .detail-column > :global(.hidden.lg\:flex) {
            flex: 0 0 auto;
            max-height: 7rem;
            box-shadow: none;
            overflow: visible;
        }
    }

    @media (max-width: 640px) {
        #toy-details,
        .toy-detail-shell {
            min-height: auto;
        }

        .toy-detail-title {
            justify-content: flex-start;
            gap: 0.5rem;
        }

        .toy-detail-title h1 {
            font-size: 1.05rem;
            text-align: left;
        }

        .image-stage {
            min-height: min(18rem, calc(100vw - 1.75rem));
            max-height: 68dvh;
        }

        .detail-panel {
            padding: 0.72rem;
        }

        .meta-list {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(6.2rem, 1fr));
            align-items: stretch;
        }

        .meta-row {
            display: flex;
            flex-direction: column;
            align-items: flex-start;
            justify-content: center;
            gap: 0.18rem;
            min-width: 0;
            padding: 0.48rem 0.5rem;
        }

        .meta-row + .meta-row {
            border-left: 1px solid color-mix(in srgb, var(--detail-accent), transparent 54%);
        }

        .meta-row dt {
            font-size: 0.66rem;
            line-height: 1;
        }

        .meta-row dd {
            max-width: 100%;
            font-size: clamp(0.76rem, 3.5vw, 0.9rem);
            line-height: 1;
            white-space: nowrap;
        }

        .detail-description {
            margin-top: 0.55rem;
            padding-top: 0.55rem;
        }

        .detail-description div {
            font-size: 0.95rem;
            line-height: 1.48;
        }
    }

    @media (max-width: 340px) {
        .toy-detail-shell {
            padding-inline: 0.45rem;
        }

        .toy-detail-title {
            gap: 0.42rem;
        }

        .title-back-link {
            width: 2.75rem;
            height: 2.75rem;
            font-size: 0.95rem;
        }

        .title-plate span {
            padding-inline: 0.45rem;
            font-size: 0.68rem;
        }

        .toy-detail-title h1 {
            padding-inline: 0.55rem;
            font-size: 0.92rem;
        }

        .image-frame,
        .detail-panel,
        .notes-panel {
            border-radius: 0.45rem;
        }

        .meta-list {
            grid-template-columns: repeat(2, minmax(0, 1fr));
        }

        .meta-row:nth-child(odd) {
            border-left: 0;
        }

        .meta-row:nth-child(3) {
            grid-column: 1 / -1;
            border-top: 1px solid color-mix(in srgb, var(--detail-accent), transparent 54%);
        }
    }

    .lightbox {
        --lightbox-accent: #f05278;
        --lightbox-accent-ink: #210016;
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
        color: color-mix(in srgb, var(--lightbox-accent), white 38%);
        background: rgba(5, 3, 8, 0.92);
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
        color: color-mix(in srgb, var(--lightbox-accent), white 38%);
        background: rgba(5, 3, 8, 0.92);
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
        outline: 3px solid color-mix(in srgb, var(--lightbox-accent), white 15%);
        outline-offset: 3px;
    }

    @media (hover: hover) {
        .lightbox-action:hover,
        .lightbox-nav:hover {
            color: #050308;
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
        transition: opacity 120ms cubic-bezier(0.22, 1, 0.36, 1);
    }

    .enlarged-picture-full.active {
        opacity: 1;
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
        #toy-page *,
        #toy-page *::before,
        #toy-page *::after {
            transition-duration: 0.01ms !important;
            animation-duration: 0.01ms !important;
            animation-iteration-count: 1 !important;
            scroll-behavior: auto !important;
        }
    }
</style>
