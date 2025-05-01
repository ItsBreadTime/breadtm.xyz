<script lang="ts">
    import Title from '../../components/Title.svelte';
    import { error } from '@sveltejs/kit';
    import { onMount, type SvelteComponent } from 'svelte'; 
    import { page } from '$app/stores'; 
    import Nav from '../../sections/Nav.svelte';
    
    export let data: { metadata: { 
        name?: string; 
        imageFiles: string[]; // Server-provided list of available images
        image?: string; // Legacy field kept for compatibility
        series?: string; 
        year?: string; 
        faction?: string; 
        description?: string; 
    } }; 

    const toy = data.metadata;

    // State for the dynamically loaded component
    let contentComponent: typeof SvelteComponent | null = null; 
    let loadError: string | null = null; 
    
    // Get slug from page store
    const slug: string = $page.params.slug;

    // For image carousel
    let currentImageIndex: number = 0;
    const images: string[] = toy.imageFiles || []; // Use server-provided images

    // For image enlargement
    let isImageEnlarged: boolean = false;
    let enlargedImageIndex: number = 0;

    // Touch gesture handling
    let touchStartX: number = 0;
    let touchEndX: number = 0;
    const MIN_SWIPE_DISTANCE = 50; // Minimum distance to register a swipe

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
                // Swipe right (previous image)
                prevImage();
            } else {
                // Swipe left (next image)
                nextImage();
            }
        }
        
        // Reset touch coordinates
        touchStartX = 0;
        touchEndX = 0;
    }

    // Enlarged image touch handling
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
                // Swipe right (previous image)
                prevEnlargedImage();
            } else {
                // Swipe left (next image)
                nextEnlargedImage();
            }
        }
        
        // Reset touch coordinates
        touchStartX = 0;
        touchEndX = 0;
    }

    // Function to advance carousel
    function nextImage(): void {
        currentImageIndex = (currentImageIndex + 1) % images.length;
    }
    
    // Function to go back in carousel
    function prevImage(): void {
        currentImageIndex = (currentImageIndex - 1 + images.length) % images.length;
    }

    // Functions for enlarged image carousel
    function openEnlargedImage(index: number): void {
        enlargedImageIndex = index;
        isImageEnlarged = true;
        document.body.classList.add('overflow-hidden'); // Prevent scrolling when modal is open
    }

    function closeEnlargedImage(): void {
        isImageEnlarged = false;
        document.body.classList.remove('overflow-hidden');
    }

    function nextEnlargedImage(): void {
        enlargedImageIndex = (enlargedImageIndex + 1) % images.length;
    }

    function prevEnlargedImage(): void {
        enlargedImageIndex = (enlargedImageIndex - 1 + images.length) % images.length;
    }

    // Handle keyboard navigation for enlarged image
    function handleKeydown(e: KeyboardEvent): void {
        if (!isImageEnlarged) return;
        
        if (e.key === 'Escape') {
            closeEnlargedImage();
        } else if (e.key === 'ArrowRight') {
            nextEnlargedImage();
        } else if (e.key === 'ArrowLeft') {
            prevEnlargedImage();
        }
    }

    // Helper function for image paths
    const imagePath = (img: string): string => `/toys/images/${slug}/${img}`;

    // Dynamic import for toy markdown content
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

    // Ensure required metadata is present
    if (!toy) {
        throw error(404, 'Toy metadata not found');
    }
        
    // Setup keyboard listeners
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
        <title>Viewing {toy.name} - Image {enlargedImageIndex + 1} of {images.length}</title>
    {:else}
        <title>{toy.name || 'Toy Detail'} | BreadTM Toy Collection</title>
    {/if}
</svelte:head>

<Nav />
<div class="py-2 sm:py-8 bg-gradient-to-br from-indigo-800 via-purple-900 to-gray-900 text-white min-h-screen" id="toy-details">
    <div class="container mx-auto px-2 sm:px-4 max-w-7xl">
        <Title style="bg-rose-200 text-xl sm:text-2xl md:text-3xl text-center text-black">{toy.name || 'Unnamed Toy'}</Title>

        <!-- Mobile-first approach - stacked layout on mobile -->
        <div class="flex flex-col lg:flex-row gap-3 sm:gap-8 my-2 sm:my-6 items-start justify-center">
            <!-- Image Carousel Column - MUCH larger on mobile -->
            <div class="w-full lg:w-1/2">
                <div class="relative rounded-lg border-2 sm:border-4 border-black overflow-hidden shadow-md group">
                    <!-- Image carousel with standardized aspect ratio - 3:4 aspect ratio -->
                    <div 
                        class="relative aspect-[3/4]"
                        on:touchstart={handleTouchStart}
                        on:touchmove={handleTouchMove}
                        on:touchend={handleTouchEnd}
                    >
                        {#if images.length > 0}
                            {#each images as image, i}
                                <!-- Make images clickable to enlarge with proper accessibility -->
                                <button 
                                    class="absolute inset-0 transition-opacity duration-500 cursor-pointer focus:outline-none focus:ring-2 focus:ring-rose-400 bg-transparent" 
                                    style="opacity: {i === currentImageIndex ? '1' : '0'}"
                                    on:click={() => openEnlargedImage(i)}
                                    aria-label="Enlarge image {i+1}"
                                >
                                    <!-- Changed from top to bottom shadow to match card view -->
                                    <div class="absolute inset-x-0 bottom-0 h-1/4 bg-gradient-to-t from-black/50 to-transparent z-10"></div>
                                    
                                    <img src={imagePath(image)} 
                                         alt="{toy.name} - view {i+1}" 
                                         class="w-full h-full object-contain bg-black/60" />
                                </button>
                            {/each}
                            
                            <!-- Swipe indicator for mobile -->
                            <div class="absolute top-2 left-1/2 -translate-x-1/2 bg-black/60 text-white px-3 py-1 rounded-full text-xs z-20 md:hidden">
                                Swipe to navigate
                            </div>
                            
                            <!-- Carousel controls - only if multiple images -->
                            {#if images.length > 1}
                                <button class="absolute -left-4 sm:-left-6 top-1/2 -translate-y-1/2 bg-black/70 text-white p-2.5 sm:p-3 rounded-full shadow-lg hover:bg-black/90 z-20 transition-all duration-300 backdrop-blur-sm transform translate-x-1/2 sm:translate-x-1/2"
                                        on:click|stopPropagation={prevImage}>
                                    <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 sm:h-6 sm:w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
                                    </svg>
                                </button>
                                <button class="absolute -right-4 sm:-right-6 top-1/2 -translate-y-1/2 bg-black/70 text-white p-2.5 sm:p-3 rounded-full shadow-lg hover:bg-black/90 z-20 transition-all duration-300 backdrop-blur-sm transform -translate-x-1/2 sm:-translate-x-1/2"
                                        on:click|stopPropagation={nextImage}>
                                    <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 sm:h-6 sm:w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
                                    </svg>
                                </button>
                                
                                <!-- Indicator dots -->
                                <div class="absolute bottom-3 sm:bottom-4 inset-x-0 flex justify-center space-x-2 sm:space-x-2 z-20">
                                    {#each images as _, i}
                                        <button class="w-3 h-3 sm:w-3 sm:h-3 rounded-full transition-all duration-300 shadow-md {i === currentImageIndex ? 'bg-rose-400 scale-125' : 'bg-white/30'}" 
                                                on:click|stopPropagation={() => currentImageIndex = i}
                                                aria-label="View image {i+1}"></button>
                                    {/each}
                                </div>
                            {/if}
                        {:else}
                            <div class="flex items-center justify-center h-full bg-black/60">
                                <div class="animate-spin rounded-full h-8 w-8 sm:h-10 sm:w-10 border-t-2 border-b-2 border-rose-300 mx-auto"></div>
                                <p class="ml-3 text-rose-300 text-sm sm:text-base">No images available</p>
                            </div>
                        {/if}
                    </div>
                </div>
                
                <!-- Thumbnails for carousel - Larger and more prominent on mobile -->
                {#if images.length > 1}
                    <div class="flex overflow-x-auto gap-3 mt-3 sm:mt-4 pb-2 justify-center">
                        {#each images as image, i}
                            <button 
                                class="flex-shrink-0 w-20 h-20 sm:w-20 sm:h-20 overflow-hidden rounded-md border-2 transition-all duration-300
                                       {i === currentImageIndex ? 'border-rose-400 ring-2 ring-rose-400 shadow-lg' : 'border-gray-700'}"
                                on:click={() => currentImageIndex = i}>
                                <img src={imagePath(image)} alt="Thumbnail {i+1}" class="w-full h-full object-cover" loading="lazy" />
                            </button>
                        {/each}
                    </div>
                {/if}
            </div>

            <!-- Details Column - More compact on mobile -->
            <div class="w-full lg:w-1/2 flex flex-col mt-3 lg:mt-0">
                <!-- Toy Details Card - More compact on mobile -->
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
                                 <span class="inline-block px-3 sm:px-3 py-1 sm:py-1 text-sm sm:text-sm font-bold rounded-full shadow-inner
                                    {toy.faction === 'Autobot' || toy.faction === 'Maximal' ? 'bg-red-600 text-red-100' : 
                                     toy.faction === 'Decepticon' || toy.faction === 'Predacon' ? 'bg-purple-600 text-purple-100' : 
                                     'bg-gray-500 text-gray-100'}">
                                    {toy.faction}
                                </span>
                            </p>
                        {/if}
                         
                        {#if toy.description}
                            <div class="mt-3 sm:mt-6 space-y-1 sm:space-y-2">
                                <strong class="font-semibold text-rose-200 block">Description:</strong>
                                <p class="text-gray-200 italic text-sm sm:text-base">{toy.description}</p>
                            </div>
                        {/if}
                    </div>

                     <a href="/toys" class="inline-block mt-4 sm:mt-6 text-rose-300 border-2 border-rose-400 hover:bg-rose-400 hover:text-black px-4 sm:px-6 py-1 sm:py-2 rounded-full transition-all duration-300 shadow-md hover:shadow-lg font-medium text-sm sm:text-base">
                         &larr; Back to Gallery
                     </a>
                </div>
            </div>
        </div>
        
        <!-- Markdown Content Section - Full width below the image and details -->
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

<!-- Enlarged Image Modal with swipe support -->
{#if isImageEnlarged && images.length > 0}
    <div 
        class="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-2 sm:p-4"
        on:click={closeEnlargedImage}
        role="dialog"
        aria-modal="true"
        aria-labelledby="enlarged-image-title"
    >
        <div class="absolute top-4 right-4 z-50">
            <button 
                class="bg-white/10 hover:bg-white/20 text-white p-2 rounded-full transition-colors duration-300"
                on:click={closeEnlargedImage}
                aria-label="Close enlarged image view"
            >
                <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
            </button>
        </div>
        
        <h2 id="enlarged-image-title" class="sr-only">Enlarged image {enlargedImageIndex + 1} of {images.length} - {toy.name}</h2>
        
        <!-- Image container with swipe support -->
        <div 
            class="relative max-w-5xl w-full h-[80vh] flex items-center justify-center"
            on:touchstart={handleEnlargedTouchStart}
            on:touchmove={handleEnlargedTouchMove}
            on:touchend={handleEnlargedTouchEnd}
            on:click|stopPropagation={() => {}}
        >
            <img 
                src={imagePath(images[enlargedImageIndex])} 
                alt="{toy.name} - enlarged view {enlargedImageIndex+1}" 
                class="max-h-full max-w-full object-contain"
            />
            
            <!-- Swipe indicator for mobile -->
            <div class="absolute top-2 left-1/2 -translate-x-1/2 bg-black/60 text-white px-3 py-1 rounded-full text-xs md:hidden">
                Swipe to navigate • Tap to close
            </div>
            
            <!-- Navigation controls -->
            {#if images.length > 1}
                <button 
                    class="absolute left-0 top-1/2 -translate-y-1/2 bg-black/20 hover:bg-black/50 text-white p-2 sm:p-3 rounded-r-full shadow-lg transition-all duration-300"
                    on:click|stopPropagation={prevEnlargedImage}
                    aria-label="Previous image"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6 sm:h-7 sm:w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
                    </svg>
                </button>
                <button 
                    class="absolute right-0 top-1/2 -translate-y-1/2 bg-black/20 hover:bg-black/50 text-white p-2 sm:p-3 rounded-l-full shadow-lg transition-all duration-300"
                    on:click|stopPropagation={nextEnlargedImage}
                    aria-label="Next image"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6 sm:h-7 sm:w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
                    </svg>
                </button>
                
                <!-- Image counter -->
                <div class="absolute bottom-4 left-1/2 -translate-x-1/2 bg-black/60 text-white px-4 py-2 rounded-full text-sm">
                    {enlargedImageIndex + 1} / {images.length}
                </div>
                
                <!-- Thumbnail strip at bottom -->
                <div class="absolute bottom-14 left-0 right-0 flex justify-center overflow-x-auto gap-2 p-2">
                    {#each images as _, i}
                        <button 
                            class="w-14 h-14 rounded-md overflow-hidden transition-all duration-300 border-2 {i === enlargedImageIndex ? 'border-rose-400 scale-110' : 'border-gray-600 opacity-60 hover:opacity-100'}"
                            on:click|stopPropagation={() => enlargedImageIndex = i}
                            aria-label="View image {i+1}"
                            aria-current={i === enlargedImageIndex ? 'true' : 'false'}
                        >
                            <img 
                                src={imagePath(images[i])} 
                                alt="Thumbnail {i+1}" 
                                class="w-full h-full object-cover"
                            />
                        </button>
                    {/each}
                </div>
            {/if}
        </div>
        
        <!-- Keyboard navigation hint -->
        <div class="absolute bottom-4 right-4 text-gray-400 text-xs hidden sm:block">
            Use arrow keys ← → to navigate • ESC to close
        </div>
    </div>
{/if}

<style lang="postcss">
    /* Apply Tailwind Typography defaults and customizations */
    .prose {
        /* Base prose styles */
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
        --tw-prose-pre-bg: theme(colors.gray.900); /* Darker code blocks */
        --tw-prose-th-borders: theme(colors.gray.600);
        --tw-prose-td-borders: theme(colors.gray.700);
        /* Invert styles are applied via prose-invert class */
    }

    .prose-content-wrapper {
        position: relative;
        z-index: 10;
    }

    /* Target elements rendered *inside* the dynamically loaded component */
    .prose :global(h1),
    .prose :global(h2),
    .prose :global(h3),
    .prose :global(h4),
    .prose :global(h5),
    .prose :global(h6) {
         /* Add a subtle bottom border to headings */
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
        /* Style links within markdown */
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
        /* Style images within markdown */
        border-radius: theme(borderRadius.lg);
        box-shadow: theme(boxShadow.lg);
        margin-top: theme(margin.4);
        margin-bottom: theme(margin.4);
        border: 2px solid theme(colors.gray.700);
    }
    .prose :global(code):not(pre code) {
        /* Style inline code */
        background-color: theme(colors.gray.700);
        color: theme(colors.amber.300); /* Match prose variable */
        padding: 0.2em 0.4em;
        border-radius: theme(borderRadius.md);
        font-size: 0.9em;
    }
     .prose :global(pre) {
         /* Style code blocks */
         border: 1px solid theme(colors.gray.700);
         border-radius: theme(borderRadius.md);
         box-shadow: theme(boxShadow.md);
     }
     .prose :global(blockquote) {
         /* Style blockquotes */
         font-style: italic;
         border-left-width: 4px; /* Match prose variable */
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

    /* Helper for semi-transparent background with blur */
    .bg-gray-800\/80 {
        background-color: rgba(31, 41, 55, 0.8); /* Corresponds to bg-gray-800 with 80% opacity */
    }
    
    /* Add a subtle sparkle to the toy details page */
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
