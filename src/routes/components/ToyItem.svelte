<script lang="ts">
    let { 
        name, 
        image = undefined, 
        slug, 
        faction = undefined, 
        series = undefined, 
        description = undefined, 
        year = undefined, 
        hasImages = false 
    }: {
        name: string;
        image?: string;
        slug: string;
        faction?: string;
        series?: string;
        description?: string;
        year?: string;
        hasImages?: boolean;
    } = $props();
    
    import Factions from "./Factions.svelte";

    // Determine which image to use, avoiding unnecessary requests
    let imagePath = $state('');
    
    if (hasImages && image) {
        // We know this toy has images and we have a specific one to use
        // The image path includes the full filename with extension now
        imagePath = `/toys/${slug}/${image}`;
    } else if (hasImages) {
        // No specific image was provided, but we'll leave it empty
        // and let the server-side logic handle finding the best format
        imagePath = '';
    } else {
        // No real images exist for this toy, use a text placeholder instead
        imagePath = '';
    }
    
    const toyPagePath = `/toys/${slug}`;
</script>

<a href={toyPagePath} class="block rounded-lg overflow-hidden bg-gray-800 hover:shadow-md transition-all duration-300 group shadow-sm transform hover:-translate-y-1 h-full">
    <div class="aspect-[3/4] overflow-hidden relative">
        <div class="absolute inset-x-0 bottom-0 h-1/4 bg-gradient-to-t from-gray-900/70 to-transparent z-10 group-hover:opacity-60 transition-opacity duration-300"></div>
        
        {#if imagePath}
            <!-- Only try to load an image if we know it exists -->
            <img 
                src={imagePath} 
                alt="Image of {name}" 
                class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 ease-out" 
                loading="lazy"
            />
        {:else}
            <!-- Text-based placeholder instead of trying to load non-existent images -->
            <div class="w-full h-full flex items-center justify-center bg-gray-700 p-4">
                <span class="text-lg font-medium text-gray-300 text-center">{name}</span>
            </div>
        {/if}
        
        <div class="absolute inset-x-0 bottom-0 p-2 sm:p-3 z-20">
            <h3 class="text-base sm:text-lg md:text-xl font-bold truncate text-white group-hover:text-rose-300 transition-colors duration-300 drop-shadow-sm">{name}</h3>
            
            <div class="flex items-center flex-wrap gap-1 mt-1">
                {#if faction}
                    <Factions faction={faction} />
                {/if}
                {#if year}
                    <span class="text-[10px] sm:text-xs text-amber-300 drop-shadow-sm bg-black/30 px-1.5 sm:px-2 py-0.5 rounded-md">{year}</span>
                {/if}
                {#if series}
                    <span class="text-[10px] sm:text-xs text-gray-300 drop-shadow-sm bg-black/30 px-1.5 sm:px-2 py-0.5 rounded-md">{series}</span>
                {/if}
            </div>
        </div>
    </div>
    
    <div class="p-2 sm:p-3 text-white">
        {#if description}
            <div class="text-[10px] sm:text-xs text-gray-300 line-clamp-2 mb-1 sm:mb-2 prose prose-sm prose-invert">
                {@html description}
            </div>
        {/if}
    </div>
</a>
