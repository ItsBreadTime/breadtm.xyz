<script lang="ts">
    import { error } from '@sveltejs/kit';
    import { page } from '$app/stores'; 
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

    // Get the compiled content from client data
    let contentComponent = $derived(data.component);
    let loadError: string | null = null; 
    
    const imageSets = $derived(toy.imageSets || {});
    const thumbnailImageSets = $derived(toy.thumbnailImageSets || {});
    const sortedImageKeys = $derived(toy.sortedImageKeys || []);
    let currentImageKeyIndex: number = $state(0);
    const currentImageKey = $derived(sortedImageKeys[currentImageKeyIndex] || '');
    const currentImageSet = $derived(currentImageKey ? imageSets[currentImageKey] || [] : []);

    let isImageEnlarged: boolean = $state(false);
    let enlargedImageIndex: number = $state(0);

    let touchStartX: number = 0;
    let touchEndX: number = 0;
    const MIN_SWIPE_DISTANCE = 50;

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
        touchStartX = e.touches[0].clientX;
    }

    function handleEnlargedTouchMove(e: TouchEvent): void {
        touchEndX = e.touches[0].clientX;
    }

    function handleEnlargedTouchEnd(e: TouchEvent): void {
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

    function nextImage(): void {
        if (sortedImageKeys.length === 0) return;
        currentImageKeyIndex = (currentImageKeyIndex + 1) % sortedImageKeys.length;
    }
    
    function prevImage(): void {
        if (sortedImageKeys.length === 0) return;
        currentImageKeyIndex = (currentImageKeyIndex - 1 + sortedImageKeys.length) % sortedImageKeys.length;
    }

    function openEnlargedImage(index: number): void {
        enlargedImageIndex = index;
        isImageEnlarged = true;
        document.body.classList.add('overflow-hidden');
    }

    function closeEnlargedImage(): void {
        isImageEnlarged = false;
        document.body.classList.remove('overflow-hidden');
    }

    function nextEnlargedImage(): void {
        if (sortedImageKeys.length === 0) return;
        enlargedImageIndex = (enlargedImageIndex + 1) % sortedImageKeys.length;
    }

    function prevEnlargedImage(): void {
        if (sortedImageKeys.length === 0) return;
        enlargedImageIndex = (enlargedImageIndex - 1 + sortedImageKeys.length) % sortedImageKeys.length;
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
        return thumbnailImageSets[imageKey] || imageSets[imageKey] || [];
    };

    const currentAvif = $derived(currentImageSet.find(img => getExtension(img) === 'avif'));
    const currentWebp = $derived(currentImageSet.find(img => getExtension(img) === 'webp'));
    const currentJpg = $derived(currentImageSet.find(img => getExtension(img) === 'jpg' || getExtension(img) === 'jpeg'));
    const currentFallback = $derived(currentJpg || currentImageSet[0]);
    
    const fullResPath = (imageKey: string): string => {
        const set = imageSets[imageKey] || [];
        if (set.length === 0) return '#';
        const jpgVersion = set.find(img => getExtension(img) === 'jpg');
        const fallbackFilename = jpgVersion ? getBaseFilename(jpgVersion) + '.jpg' : getBaseFilename(set[0]) + '.jpg';
        return `/fullres/toys/${slug}/${fallbackFilename}`;
    };

    $effect(() => {
        const imageKeySignature = sortedImageKeys.join('|');
        if (imageKeySignature || slug) {
            currentImageKeyIndex = 0;
            enlargedImageIndex = 0;
        }
    });

    $effect(() => {
        window.addEventListener('keydown', handleKeydown);
        
        return () => {
            window.removeEventListener('keydown', handleKeydown);
            document.body.classList.remove('overflow-hidden');
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
        <div id="toy-details">
            <div class="toy-detail-shell">
        <header class="toy-detail-title">
            <a href="/toys" class="title-back-link" aria-label="Back to toy gallery">&larr;</a>
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
                                        <img src={getImagePath(currentFallback)} 
                                             alt="{toy.name} - view {currentImageKeyIndex + 1}" 
                                             class="w-full h-full object-contain bg-black/60"
                                             sizes="(max-width: 1023px) calc(100vw - 2rem), min(48vw, 42rem)"
                                             loading="eager"
                                             fetchpriority="high"
                                             decoding="async" />
                                    </picture>
                                </button>
                            {/if}
                            
                            {#if sortedImageKeys.length > 0}
                                {@const currentKey = sortedImageKeys[currentImageKeyIndex]}
                                <a 
                                    href={fullResPath(currentKey)} 
                                    download
                                    class="absolute top-3 right-3 z-20 flex items-center justify-center bg-black/40 hover:bg-black/60 text-white p-2 rounded-full transition-all duration-300 shadow-md hover:shadow-lg"
                                    title="Download full resolution"
                                    aria-label="Download full resolution image"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                                    </svg>
                                </a>
                            {/if}
                            
                            {#if sortedImageKeys.length > 1}
                                <button class="absolute left-0 top-1/2 -translate-y-1/2 bg-black/30 hover:bg-black/50 text-white p-1.5 sm:p-2 rounded-r-md shadow-sm hover:shadow-md z-20 transition-all duration-300"
                                        onclick={prevImage}
                                        aria-label="Previous image">
                                    <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 sm:h-5 sm:w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
                                    </svg>
                                </button>
                                <button class="absolute right-0 top-1/2 -translate-y-1/2 bg-black/30 hover:bg-black/50 text-white p-1.5 sm:p-2 rounded-l-md shadow-sm hover:shadow-md z-20 transition-all duration-300"
                                        onclick={nextImage}
                                        aria-label="Next image">
                                    <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 sm:h-5 sm:w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
                                    </svg>
                                </button>
                                
                                <div class="absolute bottom-3 sm:bottom-4 inset-x-0 flex justify-center space-x-2 sm:space-x-2 z-20">
                                    {#each sortedImageKeys as _, i}
                                        <button class="w-3 h-3 sm:w-3 sm:h-3 rounded-full transition-all duration-300 shadow-md {i === currentImageKeyIndex ? 'bg-rose-400 scale-125' : 'bg-white/30'}" 
                                                onclick={(e) => {
                                                    e.stopPropagation();
                                                    currentImageKeyIndex = i;
                                                }}
                                                aria-label="View image {i+1}"></button>
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
                                onclick={() => currentImageKeyIndex = i}>
                                {#if fallbackSrc}
                                    <picture>
                                        {#if avifSrc}
                                            <source srcset={getImagePath(avifSrc)} type="image/avif" />
                                        {/if}
                                        {#if webpSrc}
                                            <source srcset={getImagePath(webpSrc)} type="image/webp" />
                                        {/if}
                                        <img src={getImagePath(fallbackSrc)} alt="Thumbnail {i+1}" class="w-full h-full object-cover" loading="lazy" decoding="async" />
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
                                onclick={() => currentImageKeyIndex = i}>
                                {#if fallbackSrc}
                                    <picture>
                                        {#if avifSrc}
                                            <source srcset={getImagePath(avifSrc)} type="image/avif" />
                                        {/if}
                                        {#if webpSrc}
                                            <source srcset={getImagePath(webpSrc)} type="image/webp" />
                                        {/if}
                                        <img src={getImagePath(fallbackSrc)} alt="Thumbnail {i+1}" class="w-full h-full object-cover" loading="lazy" decoding="async" />
                                    </picture>
                                {/if}
                            </button>
                        {/each}
                    </div>
                {/if}
            </div>
        </div>
            </div>
        </div>
    </div>
</div>

{#if isImageEnlarged && sortedImageKeys.length > 0}
    {@const enlargedKey = sortedImageKeys[enlargedImageIndex]}
    {@const enlargedSet = imageSets[enlargedKey] || []}
    {@const enlargedAvif = enlargedSet.find(img => getExtension(img) === 'avif')}
    {@const enlargedWebp = enlargedSet.find(img => getExtension(img) === 'webp')}
    {@const enlargedJpg = enlargedSet.find(img => getExtension(img) === 'jpg' || getExtension(img) === 'jpeg')}
    {@const enlargedFallback = enlargedJpg || enlargedSet[0]}

    <div 
        class="fixed inset-0 bg-black/95 z-50 flex items-center justify-center p-2 sm:p-4"
        onclick={closeEnlargedImage}
        onkeydown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); closeEnlargedImage(); } }}
        role="dialog"
        aria-modal="true"
        aria-labelledby="enlarged-image-title"
        tabindex="0"
    >
        <div class="absolute top-4 right-4 z-50">
            <button 
                class="bg-black/30 hover:bg-black/50 text-white p-2 rounded-full transition-colors duration-300"
                onclick={closeEnlargedImage}
                aria-label="Close enlarged image view"
            >
                <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
            </button>
        </div>
        
        <h2 id="enlarged-image-title" class="sr-only">Enlarged image {enlargedImageIndex + 1} of {sortedImageKeys.length} - {toy.name}</h2>
        
        <div 
            class="relative max-w-5xl w-full h-[80vh] flex items-center justify-center"
            ontouchstart={handleEnlargedTouchStart}
            ontouchmove={handleEnlargedTouchMove}
            ontouchend={handleEnlargedTouchEnd}
            onclick={(e) => e.stopPropagation()}
            onkeydown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.stopPropagation(); } }}
            role="button"
            tabindex="0"
            aria-label="Image container - click to interact"
        >
            {#if enlargedFallback}
                <picture class="enlarged-picture">
                    {#if enlargedAvif}
                        <source srcset={getImagePath(enlargedAvif)} type="image/avif" />
                    {/if}
                    {#if enlargedWebp}
                        <source srcset={getImagePath(enlargedWebp)} type="image/webp" />
                    {/if}
                    <img 
                        src={getImagePath(enlargedFallback)} 
                        alt="{toy.name} - enlarged view {enlargedImageIndex+1}" 
                        class="enlarged-image"
                        sizes="100vw"
                        loading="eager"
                        fetchpriority="high"
                        decoding="async"
                    />
                </picture>
            {/if}
            
            <a 
                href={fullResPath(enlargedKey)} 
                download
                class="absolute top-4 left-4 flex items-center justify-center bg-black/30 hover:bg-black/50 text-white p-2 rounded-full transition-all duration-300 opacity-60 hover:opacity-100"
                onclick={(e) => e.stopPropagation()}
                title="Download full resolution"
                aria-label="Download full resolution image"
            >
                <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
            </a>
            
            <div class="absolute top-2 left-1/2 -translate-x-1/2 bg-black/40 text-white px-3 py-1 rounded-full text-xs md:hidden opacity-70">
                Swipe to navigate • Tap to close
            </div>
            
            {#if sortedImageKeys.length > 1}
                <button 
                    class="absolute left-2 top-1/2 -translate-y-1/2 bg-black/20 hover:bg-black/40 text-white p-1.5 sm:p-2 rounded-full w-8 h-8 sm:w-10 sm:h-10 flex items-center justify-center transition-all duration-300 opacity-40 hover:opacity-90"
                    onclick={(e) => { e.stopPropagation(); prevEnlargedImage(); }}
                    aria-label="Previous image"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 sm:h-5 sm:w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
                    </svg>
                </button>
                <button 
                    class="absolute right-2 top-1/2 -translate-y-1/2 bg-black/20 hover:bg-black/40 text-white p-1.5 sm:p-2 rounded-full w-8 h-8 sm:w-10 sm:h-10 flex items-center justify-center transition-all duration-300 opacity-40 hover:opacity-90"
                    onclick={(e) => { e.stopPropagation(); nextEnlargedImage(); }}
                    aria-label="Next image"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 sm:h-5 sm:w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
                    </svg>
                </button>
                
                <div class="absolute bottom-4 left-1/2 -translate-x-1/2 bg-black/40 text-white px-4 py-1.5 rounded-full text-sm opacity-70">
                    {enlargedImageIndex + 1} / {sortedImageKeys.length}
                </div>
                
                <div class="absolute bottom-16 left-0 right-0 flex justify-center overflow-x-auto gap-2 p-2">
                    {#each sortedImageKeys as thumbKey, i}
                        {@const thumbSet = getThumbnailSet(thumbKey)}
                        {@const thumbAvif = thumbSet.find(img => getExtension(img) === 'avif')}
                        {@const thumbWebp = thumbSet.find(img => getExtension(img) === 'webp')}
                        {@const thumbJpg = thumbSet.find(img => getExtension(img) === 'jpg' || getExtension(img) === 'jpeg')}
                        {@const thumbFallback = thumbJpg || thumbSet[0]}
                        
                        <button 
                            class="w-12 h-12 sm:w-14 sm:h-14 rounded-md overflow-hidden transition-all duration-300 border-2 {i === enlargedImageIndex ? 'border-rose-400 scale-110' : 'border-gray-700 opacity-40 hover:opacity-80'}"
                            onclick={(e) => { e.stopPropagation(); enlargedImageIndex = i; }}
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
                                    <img 
                                        src={getImagePath(thumbFallback)} 
                                        alt="Thumbnail {i+1}" 
                                        class="w-full h-full object-cover"
                                        loading="lazy"
                                        decoding="async"
                                    />
                                </picture>
                            {/if}
                        </button>
                    {/each}
                </div>
            {/if}
        </div>
        
        <div class="absolute bottom-4 right-4 text-gray-400 text-xs hidden sm:block opacity-70">
            Use arrow keys ← → to navigate • ESC to close
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
        color: var(--detail-ink);
        background:
            radial-gradient(circle at 16% 14%, var(--detail-wash-a), transparent 31rem),
            radial-gradient(circle at 86% 20%, var(--detail-wash-b), transparent 32rem),
            linear-gradient(160deg, #050308 0%, #0c0715 50%, #17050e 100%);
    }

    #toy-page::before {
        content: "";
        position: absolute;
        inset: 0;
        z-index: -1;
        background-image:
            radial-gradient(circle, color-mix(in srgb, var(--detail-accent), transparent 42%) 0 1.65px, transparent 1.85px);
        background-position: 0 0;
        background-size: 22px 22px;
        mask-image:
            radial-gradient(ellipse at 8% 12%, black 0 8rem, rgba(0, 0, 0, 0.52) 16rem, transparent 30rem),
            radial-gradient(ellipse at 95% 10%, black 0 7rem, rgba(0, 0, 0, 0.38) 17rem, transparent 32rem);
        opacity: 0.38;
        pointer-events: none;
    }

    #toy-page::after {
        content: "";
        position: absolute;
        inset: 0;
        z-index: -1;
        background-image: radial-gradient(circle, rgba(255, 255, 255, 0.14) 0 1px, transparent 1.2px);
        background-position: 9px 7px;
        background-size: 34px 34px;
        mask-image:
            radial-gradient(ellipse at 83% 18%, black 0 7rem, rgba(0, 0, 0, 0.42) 15rem, transparent 27rem),
            radial-gradient(ellipse at 12% 86%, black 0 6rem, rgba(0, 0, 0, 0.32) 15rem, transparent 25rem);
        opacity: 0.22;
        pointer-events: none;
    }

    #toy-page[data-faction='Autobot'],
    #toy-page[data-faction='Maximal'] {
        --detail-accent: #ff4b4b;
        --detail-wash-a: rgba(225, 0, 0, 0.58);
        --detail-wash-b: rgba(255, 195, 92, 0.22);
    }

    #toy-page[data-faction='Decepticon'],
    #toy-page[data-faction='Predacon'] {
        --detail-accent: #b891ff;
        --detail-wash-a: rgba(111, 77, 161, 0.62);
        --detail-wash-b: rgba(59, 18, 90, 0.5);
    }

    #toy-page[data-faction='IKEAtron'] {
        --detail-accent: #feda00;
        --detail-wash-a: rgba(0, 88, 171, 0.56);
        --detail-wash-b: rgba(254, 218, 0, 0.34);
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
        width: min(100%, 88rem);
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
        width: 2.35rem;
        height: 2.35rem;
        color: #050308;
        background: var(--detail-accent);
        border: 2px solid #050308;
        border-radius: 999px;
        box-shadow: 0 4px 0 rgba(0, 0, 0, 0.34);
        font-family: Goldman, sans-serif;
        font-weight: 800;
        transition: transform 180ms cubic-bezier(0.22, 1, 0.36, 1), box-shadow 180ms ease;
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
        position: relative;
        aspect-ratio: 3 / 4;
        width: 100%;
        max-height: calc(100dvh - 11rem);
        min-height: 20rem;
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
            grid-template-columns: minmax(25rem, 0.95fr) minmax(22rem, 0.9fr);
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
            height: min(calc(100dvh - 11rem), 48rem);
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
            width: 2rem;
            height: 2rem;
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

    .enlarged-picture {
        display: flex;
        align-items: center;
        justify-content: center;
        width: 100%;
        height: 100%;
        min-width: 0;
        min-height: 0;
    }

    .enlarged-image {
        width: 100%;
        height: 100%;
        object-fit: contain;
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
