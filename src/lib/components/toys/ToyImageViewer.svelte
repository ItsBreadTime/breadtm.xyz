<script lang="ts">
    import { onMount, tick } from 'svelte';
    import { error } from '@sveltejs/kit';
    import { page } from '$app/stores'; 
    import {
        imageResolutionCache,
        getImageResolutionCacheKey,
        markImageResolutionCached
    } from '$lib/toys/fullResolutionCache';
    import {
        FULL_RESOLUTION_IDLE_DELAY,
        shouldQueueFullResolution
    } from '$lib/toys/imageLoading';
    import type { ToyDetailData } from '$lib/toys/detailTypes';
    import ProgressiveToyImage from './ProgressiveToyImage.svelte';
    import ToyDetailInfo from './ToyDetailInfo.svelte';
    import ToyLightbox from './ToyLightbox.svelte';
    import ToyThumbnailRail from './ToyThumbnailRail.svelte';
    
    let { data }: { data: ToyDetailData } = $props();

    const toy = $derived.by(() => {
        if (!data.metadata) {
            throw error(404, 'Toy metadata not found');
        }
        return data.metadata;
    });
    const slug = $derived(toy.slug || $page.params.slug);

    const contentComponent = $derived(data.component);
    
    const imageSets = $derived(toy.imageSets || {});
    const thumbnailImageSets = $derived(toy.thumbnailImageSets || {});
    const sortedImageKeys = $derived(toy.sortedImageKeys || []);
    function getInitialImageIndex(): number {
        return data.metadata.initialImageIndex || 0;
    }

    let currentImageKeyIndex: number = $state(getInitialImageIndex());
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
    let standardImageReadyKey = $state('');
    let cacheReady = $state(false);

    onMount(() => {
        cacheReady = true;
    });

    let touchStartX: number = 0;
    let touchEndX: number = 0;
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
    let lightboxElement = $state<HTMLElement>();
    let previouslyFocusedElement: HTMLElement | null = null;
    const MIN_SWIPE_DISTANCE = 50;
    const MIN_ZOOM = 1;
    const MAX_ZOOM = 6;
    const ZOOM_BUTTON_STEP = 0.75;
    const WHEEL_ZOOM_SENSITIVITY = 0.0035;
    const lightboxUsesFullResolution = $derived(useFullResolution);

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
        const touch = e.touches[0];
        if (!touch) return;
        touchStartX = touch.clientX;
    }

    function handleTouchMove(e: TouchEvent): void {
        const touch = e.touches[0];
        if (!touch) return;
        touchEndX = touch.clientX;
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
    }

    function getTouchDistance(first: Touch, second: Touch): number {
        return Math.hypot(second.clientX - first.clientX, second.clientY - first.clientY);
    }

    function clampPanOffsets(
        offsetX: number,
        offsetY: number,
        scale = zoomScale
    ): { x: number; y: number } {
        const stage = document.querySelector<HTMLElement>('.lightbox-stage');
        if (!stage) return { x: offsetX, y: offsetY };
        const image = stage.querySelector<HTMLImageElement>(
            '.enlarged-picture-full.active .enlarged-image, .enlarged-picture-standard .enlarged-image'
        );
        const naturalWidth = image?.naturalWidth || Number(image?.getAttribute('width')) || stage.clientWidth;
        const naturalHeight = image?.naturalHeight || Number(image?.getAttribute('height')) || stage.clientHeight;
        const imageRatio = naturalWidth / naturalHeight;
        const stageWidth = stage.clientWidth;
        const stageHeight = stage.clientHeight;
        const containedWidth = Math.min(stageWidth, stageHeight * imageRatio);
        const containedHeight = Math.min(stageHeight, stageWidth / imageRatio);
        const limitX = Math.max(0, (containedWidth * scale - stageWidth) / 2);
        const limitY = Math.max(0, (containedHeight * scale - stageHeight) / 2);
        return {
            x: Math.max(-limitX, Math.min(limitX, offsetX)),
            y: Math.max(-limitY, Math.min(limitY, offsetY))
        };
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
        if (!shouldQueueFullResolution({
            imageKey: requestedImageKey,
            requestedImageKey: requestedFullResolutionKey,
            usesFullResolution: useFullResolution,
            zoomScale: scale,
            minimumZoom: MIN_ZOOM
        })) return;

        // Once this image's request has mounted, further zoom frames must not
        // unmount and restart it. Only navigation/reset cancels an active load.
        cancelFullResolutionTimer();
        fullResolutionTimer = window.setTimeout(() => {
            fullResolutionTimer = null;
            if (
                isImageEnlarged
                && enlargedImageKey === requestedImageKey
                && shouldQueueFullResolution({
                    imageKey: requestedImageKey,
                    requestedImageKey: requestedFullResolutionKey,
                    usesFullResolution: useFullResolution,
                    zoomScale,
                    minimumZoom: MIN_ZOOM
                })
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

        standardImageReadyKey = imageKey;
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
            const clampedOffsets = clampPanOffsets(pendingPanOffsetX, pendingPanOffsetY);
            zoomOffsetX = clampedOffsets.x;
            zoomOffsetY = clampedOffsets.y;
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
        const clampedOffsets = clampPanOffsets(nextOffsetX, nextOffsetY, clampedScale);
        zoomOffsetX = clampedOffsets.x;
        zoomOffsetY = clampedOffsets.y;
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
        if (e.deltaMode === 1) {
            zoomDelta *= 16;
        } else if (e.deltaMode === 2) {
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
        const target = e.currentTarget as HTMLElement;
        if (typeof target.setPointerCapture === 'function') {
            target.setPointerCapture(e.pointerId);
        }
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
        if (
            typeof target.hasPointerCapture === 'function'
            && typeof target.releasePointerCapture === 'function'
            && target.hasPointerCapture(e.pointerId)
        ) {
            target.releasePointerCapture(e.pointerId);
        }
    }

    function nextImage(): void {
        if (sortedImageKeys.length === 0) return;
        currentImageKeyIndex = (currentImageKeyIndex + 1) % sortedImageKeys.length;
    }
    
    function prevImage(): void {
        if (sortedImageKeys.length === 0) return;
        currentImageKeyIndex = (currentImageKeyIndex - 1 + sortedImageKeys.length) % sortedImageKeys.length;
    }

    function runGalleryLinkAction(event: MouseEvent | KeyboardEvent, action: () => void): void {
        if (event instanceof KeyboardEvent && event.key !== ' ') return;
        event.preventDefault();
        action();
    }

    async function openEnlargedImage(index: number): Promise<void> {
        resetFullResolution();
        enlargedImageIndex = index;
        resetZoom();
        previouslyFocusedElement = document.activeElement instanceof HTMLElement
            ? document.activeElement
            : null;
        isImageEnlarged = true;
        document.body.classList.add('overflow-hidden');
        document.documentElement.classList.add('overflow-hidden');
        await tick();
        lightboxElement?.focus();
    }

    function closeEnlargedImage(): void {
        isImageEnlarged = false;
        resetFullResolution();
        resetZoom();
        document.body.classList.remove('overflow-hidden');
        document.documentElement.classList.remove('overflow-hidden');
        previouslyFocusedElement?.focus();
        previouslyFocusedElement = null;
    }

    function handleLightboxBackdropClick(e: MouseEvent): void {
        const target = e.target;
        if (!(target instanceof Element)) return;
        if (target.closest('button, a, .lightbox-stage, .lightbox-thumbs')) return;
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

    function selectEnlargedImage(index: number): void {
        if (index === enlargedImageIndex) return;
        resetFullResolution();
        enlargedImageIndex = index;
        resetZoom();
    }

    function handleLightboxRootReady(element: HTMLElement | undefined): void {
        lightboxElement = element;
    }

    function handleKeydown(e: KeyboardEvent): void {
        if (e.key === 'Tab' && isImageEnlarged && lightboxElement) {
            const focusable = Array.from(lightboxElement.querySelectorAll<HTMLElement>(
                'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])'
            ));
            if (focusable.length > 0) {
                const first = focusable[0];
                const last = focusable[focusable.length - 1];
                if (
                    e.shiftKey
                    && (document.activeElement === first || document.activeElement === lightboxElement)
                ) {
                    e.preventDefault();
                    last.focus();
                } else if (!e.shiftKey && document.activeElement === last) {
                    e.preventDefault();
                    first.focus();
                }
            }
            return;
        }
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

    const getImagePagePath = (imageKey: string): string => {
        if (!imageKey) return '#toy-image-viewer';
        return `?image=${encodeURIComponent(imageKey)}#toy-image-viewer`;
    };

    const getAdjacentImageKey = (offset: number): string => {
        if (sortedImageKeys.length === 0) return '';
        const index = (currentImageKeyIndex + offset + sortedImageKeys.length) % sortedImageKeys.length;
        return sortedImageKeys[index];
    };

    const getThumbnailSet = (imageKey: string): string[] => {
        const cachedResolution = cacheReady
            ? $imageResolutionCache[getImageResolutionCacheKey(slug, imageKey)]
            : undefined;
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

    const currentCachedResolution = $derived(
        cacheReady && currentImageKey
            ? $imageResolutionCache[getImageResolutionCacheKey(slug, currentImageKey)]
            : undefined
    );
    const currentStandardImageSet = $derived(
        currentImageKey ? imageSets[currentImageKey] || [] : []
    );
    const currentThumbnailImageSet = $derived(
        currentImageKey
            ? thumbnailImageSets[currentImageKey] || currentStandardImageSet
            : []
    );
    const currentFullResolutionBase = $derived(
        currentImageKey ? getFullResolutionBase(currentImageKey) : ''
    );
    const currentImageSet = $derived(currentThumbnailImageSet);

    const currentStandardAvif = $derived(currentStandardImageSet.find(img => getExtension(img) === 'avif'));
    const currentStandardWebp = $derived(currentStandardImageSet.find(img => getExtension(img) === 'webp'));
    const currentStandardJpg = $derived(currentStandardImageSet.find(img => getExtension(img) === 'jpg' || getExtension(img) === 'jpeg'));
    const currentStandardFallback = $derived(currentStandardJpg || currentStandardImageSet[0]);

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
        if (!previousImageSignature) {
            previousImageSignature = imageKeySignature;
        } else if (imageKeySignature !== previousImageSignature) {
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

        <div class="detail-layout">
            <div class="image-column">
                <div class="image-frame group">
                    <div 
                        id="toy-image-viewer"
                        class="image-stage"
                        ontouchstart={handleTouchStart}
                        ontouchmove={handleTouchMove}
                        ontouchend={handleTouchEnd}
                        role="group"
                        aria-label="Toy image viewer"
                    >
                        {#if sortedImageKeys.length > 0}
                            <ProgressiveToyImage
                                href={fullResPath(currentImageKey)}
                                imageIndex={currentImageKeyIndex}
                                toyName={toy.name}
                                thumbnailImageSet={currentThumbnailImageSet}
                                standardImageSet={currentStandardImageSet}
                                fullResolutionBase={currentFullResolutionBase}
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
                                <a
                                    class="
                                        absolute left-0 top-1/2 z-20 flex min-h-11 min-w-11 -translate-y-1/2
                                        items-center justify-center rounded-r-md bg-black/30 p-2 text-white shadow-sm
                                        transition-all duration-300 hover:bg-black/50 hover:shadow-md
                                    "
                                    href={getImagePagePath(getAdjacentImageKey(-1))}
                                    onclick={(event) => runGalleryLinkAction(event, prevImage)}
                                    onkeydown={(event) => runGalleryLinkAction(event, prevImage)}
                                    aria-label="Previous image"
                                >
                                    <svg
                                        xmlns="http://www.w3.org/2000/svg"
                                        class="h-4 w-4 sm:h-5 sm:w-5"
                                        fill="none"
                                        viewBox="0 0 24 24"
                                        stroke="currentColor"
                                    >
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
                                    </svg>
                                </a>
                                <a
                                    class="
                                        absolute right-0 top-1/2 z-20 flex min-h-11 min-w-11 -translate-y-1/2
                                        items-center justify-center rounded-l-md bg-black/30 p-2 text-white shadow-sm
                                        transition-all duration-300 hover:bg-black/50 hover:shadow-md
                                    "
                                    href={getImagePagePath(getAdjacentImageKey(1))}
                                    onclick={(event) => runGalleryLinkAction(event, nextImage)}
                                    onkeydown={(event) => runGalleryLinkAction(event, nextImage)}
                                    aria-label="Next image"
                                >
                                    <svg
                                        xmlns="http://www.w3.org/2000/svg"
                                        class="h-4 w-4 sm:h-5 sm:w-5"
                                        fill="none"
                                        viewBox="0 0 24 24"
                                        stroke="currentColor"
                                    >
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
                                    </svg>
                                </a>
                                
                                <div class="photo-tabs">
                                    {#each sortedImageKeys as _, i}
                                        <a
                                                href={getImagePagePath(sortedImageKeys[i])}
                                                class="photo-tab"
                                                onclick={(event) => runGalleryLinkAction(event, () => currentImageKeyIndex = i)}
                                                onkeydown={(event) => runGalleryLinkAction(event, () => currentImageKeyIndex = i)}
                                                aria-label="View image {i+1}"
                                                aria-current={i === currentImageKeyIndex ? 'true' : 'false'}>
                                            {i + 1}
                                        </a>
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
                
                <ToyThumbnailRail
                    variant="mobile"
                    imageKeys={sortedImageKeys}
                    currentImageIndex={currentImageKeyIndex}
                    toyName={toy.name}
                    {getThumbnailSet}
                    {getImagePath}
                    {getImagePagePath}
                    onselect={(event, index) => runGalleryLinkAction(event, () => currentImageKeyIndex = index)}
                />
            </div>


            <div class="detail-column">
                <ToyDetailInfo
                    series={toy.series}
                    year={toy.year}
                    faction={toy.faction}
                    description={toy.description}
                    content={contentComponent}
                />

                <ToyThumbnailRail
                    variant="desktop"
                    imageKeys={sortedImageKeys}
                    currentImageIndex={currentImageKeyIndex}
                    toyName={toy.name}
                    {getThumbnailSet}
                    {getImagePath}
                    {getImagePagePath}
                    onselect={(event, index) => runGalleryLinkAction(event, () => currentImageKeyIndex = index)}
                />
            </div>
        </div>


{#if isImageEnlarged && sortedImageKeys.length > 0}
    <ToyLightbox
        toyName={toy.name || 'Toy'}
        imageKeys={sortedImageKeys}
        {imageSets}
        activeIndex={enlargedImageIndex}
        {zoomScale}
        {zoomOffsetX}
        {zoomOffsetY}
        minZoom={MIN_ZOOM}
        maxZoom={MAX_ZOOM}
        {fullResolutionRequested}
        usesFullResolution={lightboxUsesFullResolution}
        {getImagePath}
        {getThumbnailSet}
        getDownloadPath={fullResPath}
        onclose={closeEnlargedImage}
        onbackdropclick={handleLightboxBackdropClick}
        onprevious={prevEnlargedImage}
        onnext={nextEnlargedImage}
        onselect={selectEnlargedImage}
        onzoomout={zoomOut}
        onzoomin={zoomIn}
        onresetzoom={resetZoom}
        ondoubleclick={toggleZoom}
        onwheel={handleZoomWheel}
        ontouchstart={handleEnlargedTouchStart}
        ontouchmove={handleEnlargedTouchMove}
        ontouchend={handleEnlargedTouchEnd}
        onpointerdown={handlePointerDown}
        onpointermove={handlePointerMove}
        onpointerend={handlePointerEnd}
        onstandardresolutionload={handleStandardResolutionLoad}
        onfullresolutionload={handleFullResolutionLoad}
        onfullresolutionerror={handleFullResolutionError}
        onrootready={handleLightboxRootReady}
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
        max-height: calc(100vh - 11rem);
        max-height: calc(100dvh - 11rem);
        min-height: 20rem;
        border-radius: calc(0.6rem - 2px);
        background: #050308;
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
        outline: 3px solid var(--detail-accent);
        outline: 3px solid color-mix(in srgb, var(--detail-accent), white 18%);
        outline-offset: 3px;
    }

    @media (hover: hover) {
        .photo-tab:hover {
            color: #050308;
            background: var(--detail-accent);
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

    .detail-layout :global(.bg-gray-800\/80) {
        background-color: rgba(5, 3, 8, 0.76);
    }

    .detail-layout :global(.border-black) {
        border-color: rgba(0, 0, 0, 0.9);
    }

    .detail-layout :global(.text-rose-300),
    .detail-layout :global(.text-rose-200) {
        color: var(--detail-accent);
    }

    .detail-layout :global(.border-rose-400),
    .detail-layout :global(.border-rose-400\/50) {
        border-color: var(--detail-accent);
        border-color: color-mix(in srgb, var(--detail-accent), transparent 35%);
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

        .detail-column > :global(.hidden.lg\:flex) {
            flex: 0 0 auto;
            max-height: 7rem;
            box-shadow: none;
            overflow: visible;
        }
    }

    @media (max-width: 640px) {
        .image-stage {
            min-height: min(18rem, calc(100vw - 1.75rem));
            max-height: 68vh;
            max-height: 68dvh;
        }
    }

    @media (max-width: 340px) {
        .image-frame { border-radius: 0.45rem; }
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
