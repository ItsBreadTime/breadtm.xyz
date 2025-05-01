<script lang="ts">
    export let name: string;
    export let image: string | undefined = undefined;
    export let slug: string;
    export let faction: string | undefined = undefined;
    export let series: string | undefined = undefined;
    export let description: string | undefined = undefined;
    export let year: string | undefined = undefined;

    // Fix image path to match the correct structure in /toys/images/slug/
    // Always look for main.jpg or main.png first, fallback to the provided image
    const mainImagePath = `/toys/images/${slug}/main`;
    // Determine which image to use - this is a simplified version, the server will provide the actual list
    const imagePath = image ? `/toys/images/${slug}/${image}` : '/toys/images/placeholder.jpg';
    const toyPagePath = `/toys/${slug}`;
</script>

<a href={toyPagePath} class="block rounded-lg overflow-hidden bg-gray-800 hover:shadow-md transition-all duration-300 group shadow-sm transform hover:-translate-y-1 h-full">
    <div class="aspect-[3/4] overflow-hidden relative">
        <div class="absolute inset-x-0 bottom-0 h-1/4 bg-gradient-to-t from-gray-900/70 to-transparent z-10 group-hover:opacity-60 transition-opacity duration-300"></div>
        <img 
            src={imagePath} 
            alt="Image of {name}" 
            class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 ease-out" 
            loading="lazy"
            on:error={(e) => { 
                const target = e.target;
                if (target instanceof HTMLImageElement) {
                    target.src = '/toys/images/placeholder.jpg'; 
                }
            }}
        />
        
        <div class="absolute inset-x-0 bottom-0 p-2 sm:p-3 z-20">
            <h3 class="text-base sm:text-lg md:text-xl font-bold truncate text-white group-hover:text-rose-300 transition-colors duration-300 drop-shadow-sm">{name}</h3>
            
            <div class="flex items-center flex-wrap gap-1 mt-1">
                {#if faction}
                    <span class="inline-block px-1.5 sm:px-2 py-0.5 text-[10px] sm:text-xs font-bold rounded-full shadow-inner drop-shadow-sm"
                          class:bg-red-600={faction === 'Autobot' || faction === 'Maximal'}
                          class:text-red-100={faction === 'Autobot' || faction === 'Maximal'}
                          class:bg-purple-600={faction === 'Decepticon' || faction === 'Predacon'}
                          class:text-purple-100={faction === 'Decepticon' || faction === 'Predacon'}
                          class:bg-gray-500={!['Autobot', 'Maximal', 'Decepticon', 'Predacon'].includes(faction)}
                          class:text-gray-100={!['Autobot', 'Maximal', 'Decepticon', 'Predacon'].includes(faction)}
                    >
                        {faction}
                    </span>
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
            <p class="text-[10px] sm:text-xs text-gray-300 line-clamp-2 mb-1 sm:mb-2">{description}</p>
        {/if}
    </div>
</a>
