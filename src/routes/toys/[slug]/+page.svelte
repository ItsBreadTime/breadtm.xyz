<script lang="ts">
    import Title from '../../components/Title.svelte';
    import { error } from '@sveltejs/kit';
    import { onMount, type SvelteComponent } from 'svelte'; 
    import { page } from '$app/stores'; 
    import Nav from '../../sections/Nav.svelte';
    import Factions from '../../components/Factions.svelte';
    
    export let data: { metadata: { 
        name?: string; 
        imageTemplate?: string;
        slug?: string;
        image?: string;
        series?: string; 
        year?: string; 
        faction?: string; 
        description?: string;
        imageSets?: Record<string, string[]>; // Grouped images { 'main': ['main.avif', 'main.webp', 'main.jpg'], '1': [...] }
        sortedImageKeys?: string[]; // Sorted keys ['main', '1', '2', ...]
    } }; 

    const toy = data.metadata;
    const slug = toy.slug || $page.params.slug;

    let contentComponent: typeof SvelteComponent | null = null; 
    let loadError: string | null = null; 
    
    const imageSets = toy.imageSets || {};
    const sortedImageKeys = toy.sortedImageKeys || [];
    let currentImageKeyIndex: number = 0;

    let isImageEnlarged: boolean = false;
    let enlargedImageIndex: number = 0;

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
        currentImageKeyIndex = (currentImageKeyIndex + 1) % sortedImageKeys.length;
    }
    
    function prevImage(): void {
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
        enlargedImageIndex = (enlargedImageIndex + 1) % sortedImageKeys.length;
    }

    function prevEnlargedImage(): void {
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

    const imageBasePath = `/toys/${slug}/`;

    const getImagePath = (filename: string): string => {
        return imageBasePath + filename;
    };
    
    const fullResPath = (imageKey: string): string => {
        const set = imageSets[imageKey] || [];
        const jpgVersion = set.find(img => getExtension(img) === 'jpg');
        const fallbackFilename = jpgVersion ? getBaseFilename(jpgVersion) + '.jpg' : getBaseFilename(set[0]) + '.jpg';
        return `/fullres/toys/${slug}/${fallbackFilename}`;
    };

    $: if (slug) {
        import(`../${slug}.md`)
            .then(module => {
                if (module && module.default) {
                    contentComponent = module.default;
                    loadError = null;
                } else {
                    throw new Error('Invalid module structure');
                }
            })
            .catch(err => {
                console.error(`Failed to load component for ${slug}:`, err);
                loadError = `Could not load content for this toy.`;
            });
    } else {
         loadError = 'Cannot load content: Slug is missing.';
    }

    if (!toy) {
        throw error(404, 'Toy metadata not found');
    }
        
    onMount(() => {
        window.addEventListener('keydown', handleKeydown);
        
        return () => {
            window.removeEventListener('keydown', handleKeydown);
            document.body.classList.remove('overflow-hidden');
        };
    });
</script>

<svelte:head>
    {#if isImageEnlarged}
        <title>Viewing {toy.name} - Image {enlargedImageIndex + 1} of {sortedImageKeys.length}</title>
    {:else}
        <title>{toy.name || 'Toy Detail'} | Bread's Toy Collection</title>
    {/if}
</svelte:head>

<Nav />
<div class="py-2 sm:py-8 bg-gradient-to-br from-indigo-800 via-purple-900 to-gray-900 text-white min-h-screen" id="toy-details">
    <div class="container mx-auto px-2 sm:px-4 max-w-7xl">
        <Title style="bg-rose-200 text-xl sm:text-2xl md:text-3xl text-center text-black">{toy.name || 'Unnamed Toy'}</Title>

        <div class="flex flex-col lg:flex-row gap-3 sm:gap-8 my-2 sm:my-6 items-start justify-center">
            <div class="w-full lg:w-1/2">
                <div class="relative rounded-lg border-2 sm:border-4 border-black overflow-hidden shadow-md group">
                    <div 
                        class="relative aspect-[3/4]"
                        on:touchstart={handleTouchStart}
                        on:touchmove={handleTouchMove}
                        on:touchend={handleTouchEnd}
                    >
                        {#if sortedImageKeys.length > 0}
                            {#each sortedImageKeys as imageKey, i}
                                {@const currentSet = imageSets[imageKey] || []}
                                {@const avifSrc = currentSet.find(img => getExtension(img) === 'avif')}
                                {@const webpSrc = currentSet.find(img => getExtension(img) === 'webp')}
                                {@const jpgSrc = currentSet.find(img => getExtension(img) === 'jpg' || getExtension(img) === 'jpeg')}
                                {@const fallbackSrc = jpgSrc || currentSet[0]}
                                
                                <button 
                                    class="absolute inset-0 transition-opacity duration-500 cursor-pointer focus:outline-none focus:ring-2 focus:ring-rose-400 bg-transparent" 
                                    style="opacity: {i === currentImageKeyIndex ? '1' : '0'}"
                                    on:click={() => openEnlargedImage(i)}
                                    aria-label="Enlarge image {i+1}"
                                >
                                    <picture>
                                        {#if avifSrc}
                                            <source srcset={getImagePath(avifSrc)} type="image/avif" />
                                        {/if}
                                        {#if webpSrc}
                                            <source srcset={getImagePath(webpSrc)} type="image/webp" />
                                        {/if}
                                        {#if fallbackSrc}
                                            <img src={getImagePath(fallbackSrc)} 
                                                 alt="{toy.name} - view {i+1}" 
                                                 class="w-full h-full object-contain bg-black/60" />
                                        {/if}
                                    </picture>
                                </button>
                            {/each}
                            
                            {#if sortedImageKeys.length > 0}
                                {@const currentKey = sortedImageKeys[currentImageKeyIndex]}
                                <a 
                                    href={fullResPath(currentKey)} 
                                    download
                                    class="absolute top-3 right-3 z-20 flex items-center justify-center bg-black/40 hover:bg-black/60 text-white p-2 rounded-full transition-all duration-300 shadow-md hover:shadow-lg"
                                    title="Download full resolution"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                                    </svg>
                                </a>
                            {/if}
                            
                            {#if sortedImageKeys.length > 1}
                                <button class="absolute left-0 top-1/2 -translate-y-1/2 bg-black/30 hover:bg-black/50 text-white p-1.5 sm:p-2 rounded-r-md shadow-sm hover:shadow-md z-20 transition-all duration-300"
                                        on:click|stopPropagation={prevImage}>
                                    <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 sm:h-5 sm:w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
                                    </svg>
                                </button>
                                <button class="absolute right-0 top-1/2 -translate-y-1/2 bg-black/30 hover:bg-black/50 text-white p-1.5 sm:p-2 rounded-l-md shadow-sm hover:shadow-md z-20 transition-all duration-300"
                                        on:click|stopPropagation={nextImage}>
                                    <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 sm:h-5 sm:w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
                                    </svg>
                                </button>
                                
                                <div class="absolute bottom-3 sm:bottom-4 inset-x-0 flex justify-center space-x-2 sm:space-x-2 z-20">
                                    {#each sortedImageKeys as _, i}
                                        <button class="w-3 h-3 sm:w-3 sm:h-3 rounded-full transition-all duration-300 shadow-md {i === currentImageKeyIndex ? 'bg-rose-400 scale-125' : 'bg-white/30'}" 
                                                on:click|stopPropagation={() => currentImageKeyIndex = i}
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
                            {@const currentSet = imageSets[imageKey] || []}
                            {@const avifSrc = currentSet.find(img => getExtension(img) === 'avif')}
                            {@const webpSrc = currentSet.find(img => getExtension(img) === 'webp')}
                            {@const jpgSrc = currentSet.find(img => getExtension(img) === 'jpg' || getExtension(img) === 'jpeg')}
                            {@const fallbackSrc = jpgSrc || currentSet[0]}
                            
                            <button 
                                class="flex-shrink-0 w-20 h-20 sm:w-20 sm:h-20 overflow-hidden rounded-md border-2 transition-all duration-300
                                       {i === currentImageKeyIndex ? 'border-rose-400 ring-2 ring-rose-400 shadow-lg' : 'border-gray-700'}"
                                on:click={() => currentImageKeyIndex = i}>
                                {#if fallbackSrc}
                                    <picture>
                                        {#if avifSrc}
                                            <source srcset={getImagePath(avifSrc)} type="image/avif" />
                                        {/if}
                                        {#if webpSrc}
                                            <source srcset={getImagePath(webpSrc)} type="image/webp" />
                                        {/if}
                                        <img src={getImagePath(fallbackSrc)} alt="Thumbnail {i+1}" class="w-full h-full object-cover" loading="lazy" />
                                    </picture>
                                {/if}
                            </button>
                        {/each}
                    </div>
                {/if}
            </div>

            <div class="w-full lg:w-1/2 flex flex-col mt-3 lg:mt-0">
                <div class="bg-gray-800/80 backdrop-blur-sm p-4 sm:p-6 rounded-lg border-2 sm:border-4 border-black shadow-xl text-sm sm:text-base">
                    <h2 class="text-2xl sm:text-3xl font-extrabold mb-3 sm:mb-6 text-rose-300 border-b border-rose-400/50 pb-2 sm:pb-3">Details</h2>
                    <div class="space-y-2 sm:space-y-4">
                        {#if toy.series}
                            <p class="grid grid-cols-[auto,1fr] gap-x-3 sm:gap-x-3"><strong class="font-semibold text-rose-200">Series:</strong> <span class="text-gray-200">{toy.series}</span></p>
                        {/if}
                        {#if toy.year}
                            <p class="grid grid-cols-[auto,1fr] gap-x-3 sm:gap-x-3"><strong class="font-semibold text-rose-200">Year of purchase:</strong> <span class="text-gray-200">{toy.year}</span></p>
                        {/if}
                        {#if toy.faction}
                            <p class="grid grid-cols-[auto,1fr] gap-x-3 sm:gap-x-3 items-center">
                                <strong class="font-semibold text-rose-200">Faction:</strong>
                                <Factions faction={toy.faction} />
                            </p>
                        {/if}
                         
                        {#if toy.description}
                            <div class="mt-3 sm:mt-6 space-y-1 sm:space-y-2">
                                <strong class="font-semibold text-rose-200 block">Description:</strong>
                                <p class="text-gray-200 text-sm sm:text-base">{toy.description}</p>
                            </div>
                        {/if}
                    </div>

                     <a href="/toys" class="inline-block mt-4 sm:mt-6 text-rose-300 border-2 border-rose-400 hover:bg-rose-400 hover:text-black px-4 sm:px-6 py-1 sm:py-2 rounded-full transition-all duration-300 shadow-md hover:shadow-lg font-medium text-sm sm:text-base">
                         &larr; Back to Gallery
                     </a>
                </div>
                
                <!-- Show thumbnails carousel on desktop view only, underneath the details card -->
                {#if sortedImageKeys.length > 1}
                    <div class="hidden lg:flex flex-wrap gap-3 mt-4 justify-start overflow-hidden bg-gray-800/80 backdrop-blur-sm p-4 rounded-lg border-2 border-black shadow-xl">
                        {#each sortedImageKeys as imageKey, i}
                            {@const currentSet = imageSets[imageKey] || []}
                            {@const avifSrc = currentSet.find(img => getExtension(img) === 'avif')}
                            {@const webpSrc = currentSet.find(img => getExtension(img) === 'webp')}
                            {@const jpgSrc = currentSet.find(img => getExtension(img) === 'jpg' || getExtension(img) === 'jpeg')}
                            {@const fallbackSrc = jpgSrc || currentSet[0]}
                            
                            <button 
                                class="w-20 h-20 overflow-hidden rounded-md border-2 transition-all duration-300
                                       {i === currentImageKeyIndex ? 'border-rose-400 ring-2 ring-rose-400 shadow-lg scale-105' : 'border-gray-700 hover:border-gray-400'}"
                                on:click={() => currentImageKeyIndex = i}>
                                {#if fallbackSrc}
                                    <picture>
                                        {#if avifSrc}
                                            <source srcset={getImagePath(avifSrc)} type="image/avif" />
                                        {/if}
                                        {#if webpSrc}
                                            <source srcset={getImagePath(webpSrc)} type="image/webp" />
                                        {/if}
                                        <img src={getImagePath(fallbackSrc)} alt="Thumbnail {i+1}" class="w-full h-full object-cover" loading="lazy" />
                                    </picture>
                                {/if}
                            </button>
                        {/each}
                    </div>
                {/if}
            </div>
        </div>
        
        <div class="prose prose-sm sm:prose-base md:prose-lg max-w-none bg-gray-800/80 backdrop-blur-sm p-4 sm:p-6 rounded-lg border-2 sm:border-4 border-black shadow-xl mt-3 sm:mt-6">
            <div class="prose-content-wrapper">
                {#if contentComponent}
                    <svelte:component this={contentComponent} />
                {:else if loadError}
                    <p class="text-red-400 font-medium">{loadError}</p>
                {:else}
                    <div class="flex items-center justify-center py-4">
                        <div class="animate-spin rounded-full h-6 w-6 sm:h-10 sm:w-10 border-t-2 border-b-2 border-rose-300"></div>
                        <p class="ml-4 text-rose-300 text-sm sm:text-base">Loading content...</p>
                    </div>
                {/if}
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
        on:click={closeEnlargedImage}
        role="dialog"
        aria-modal="true"
        aria-labelledby="enlarged-image-title"
    >
        <div class="absolute top-4 right-4 z-50">
            <button 
                class="bg-black/30 hover:bg-black/50 text-white p-2 rounded-full transition-colors duration-300"
                on:click={closeEnlargedImage}
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
            on:touchstart={handleEnlargedTouchStart}
            on:touchmove={handleEnlargedTouchMove}
            on:touchend={handleEnlargedTouchEnd}
            on:click|stopPropagation={() => {}}
        >
            {#if enlargedFallback}
                <picture>
                    {#if enlargedAvif}
                        <source srcset={getImagePath(enlargedAvif)} type="image/avif" />
                    {/if}
                    {#if enlargedWebp}
                        <source srcset={getImagePath(enlargedWebp)} type="image/webp" />
                    {/if}
                    <img 
                        src={getImagePath(enlargedFallback)} 
                        alt="{toy.name} - enlarged view {enlargedImageIndex+1}" 
                        class="max-h-full max-w-full object-contain"
                    />
                </picture>
            {/if}
            
            <a 
                href={fullResPath(enlargedKey)} 
                download
                class="absolute top-4 left-4 flex items-center justify-center bg-black/30 hover:bg-black/50 text-white p-2 rounded-full transition-all duration-300 opacity-60 hover:opacity-100"
                on:click|stopPropagation={() => {}}
                title="Download full resolution"
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
                    on:click|stopPropagation={prevEnlargedImage}
                    aria-label="Previous image"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 sm:h-5 sm:w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
                    </svg>
                </button>
                <button 
                    class="absolute right-2 top-1/2 -translate-y-1/2 bg-black/20 hover:bg-black/40 text-white p-1.5 sm:p-2 rounded-full w-8 h-8 sm:w-10 sm:h-10 flex items-center justify-center transition-all duration-300 opacity-40 hover:opacity-90"
                    on:click|stopPropagation={nextEnlargedImage}
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
                        {@const thumbSet = imageSets[thumbKey] || []}
                        {@const thumbAvif = thumbSet.find(img => getExtension(img) === 'avif')}
                        {@const thumbWebp = thumbSet.find(img => getExtension(img) === 'webp')}
                        {@const thumbJpg = thumbSet.find(img => getExtension(img) === 'jpg' || getExtension(img) === 'jpeg')}
                        {@const thumbFallback = thumbJpg || thumbSet[0]}
                        
                        <button 
                            class="w-12 h-12 sm:w-14 sm:h-14 rounded-md overflow-hidden transition-all duration-300 border-2 {i === enlargedImageIndex ? 'border-rose-400 scale-110' : 'border-gray-700 opacity-40 hover:opacity-80'}"
                            on:click|stopPropagation={() => enlargedImageIndex = i}
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
    
    #toy-details {
        position: relative;
        overflow: hidden;
    }
    
    #toy-details::before {
        content: "";
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background-image: radial-gradient(circle at center, rgba(199, 210, 254, 0.1) 0%, transparent 8%),
                          radial-gradient(circle at 20% 80%, rgba(244, 114, 182, 0.1) 0%, transparent 15%);
        background-size: 120px 120px, 160px 160px;
        opacity: 0.4;
        pointer-events: none;
    }
</style>
