<script lang="ts">
    import ToyItem from '../components/ToyItem.svelte';
    import Title from '../components/Title.svelte';
    import Nav from '../sections/Nav.svelte';

    export let data;

    // Define an interface for the toy data structure
    interface Toy {
        slug: string;
        name: string;
        image?: string; // Legacy field
        primaryImage?: string; // New field provided by server
        faction?: string;
        series?: string;
        description?: string;
        year?: string;
    }

    // Extract data
    let toys: Toy[] = data.toys || [];
    const toyImagesMap = data.toyImagesMap || {}; // Map of slug -> available images

    // --- Filtering State ---
    let selectedFaction = '';
    let selectedSeries = '';
    let searchTerm = '';

    // --- Get unique filter options ---
    $: factions = [...new Set(toys.map((toy: Toy) => toy.faction).filter(Boolean))].sort();
    $: series = [...new Set(toys.map((toy: Toy) => toy.series).filter(Boolean))].sort();

    // --- Filtered Toys ---
    $: filteredToys = toys.filter((toy: Toy) => {
        const factionMatch = !selectedFaction || toy.faction === selectedFaction;
        const seriesMatch = !selectedSeries || toy.series === selectedSeries;
        const searchMatch = !searchTerm || toy.name.toLowerCase().includes(searchTerm.toLowerCase());
        return factionMatch && seriesMatch && searchMatch;
    });

    // Function to get the best image for a toy - uses server-provided primaryImage
    function getBestImage(toy: Toy): string | undefined {
        // Use the server-determined primary image if available
        if (toy.primaryImage) {
            return toy.primaryImage;
        }
        
        // Fall back to the image specified in frontmatter if available
        if (toy.image) {
            return toy.image;
        }
        
        // Return undefined if no images are available
        return undefined;
    }
</script>

<Nav></Nav>
<div class="py-4 min-h-screen" id="toys-gallery">
    <div class="w-full max-w-6xl mx-auto px-4">
        <Title style="bg-rose-200 text-2xl md:text-3xl">🧸 Toy Gallery</Title>

        <!-- Filtering Controls - Inline on all screen sizes -->
        <div class="mt-3 mb-3 p-2 sm:p-4 bg-gray-800/90 text-white rounded-lg shadow-xl border-2 border-rose-300/30 backdrop-blur-sm text-xs sm:text-base">
            <!-- Stats Bar - Moved inside the filter box and made smaller on mobile -->
            <div class="p-1 sm:p-2 bg-gray-800/70 rounded-lg text-gray-300 flex justify-between items-center backdrop-blur-sm border-l-2 sm:border-l-4 border-rose-400 mb-2">
                <div class="font-medium">
                    Showing <span class="text-white font-bold">{filteredToys.length}</span> of <span class="text-white font-bold">{toys.length}</span> toys
                </div>
                {#if selectedFaction || selectedSeries || searchTerm}
                    <button 
                        class="text-rose-300 hover:text-rose-200 flex items-center transition-colors duration-200"
                        on:click={() => {
                            selectedFaction = '';
                            selectedSeries = '';
                            searchTerm = '';
                        }}
                    >
                        <span>Clear</span>
                        <svg xmlns="http://www.w3.org/2000/svg" class="h-3 w-3 sm:h-4 sm:w-4 ml-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                {/if}
            </div>

            <!-- Filters in a single row -->
            <div class="grid grid-cols-3 gap-2">
                <div>
                    <label for="search" class="block text-xs sm:text-sm font-medium mb-0.5 text-rose-200">Search:</label>
                    <div class="relative">
                        <input type="text" id="search" bind:value={searchTerm} placeholder="Search name..." 
                               class="w-full p-1 sm:p-2 pl-7 sm:pl-10 rounded-md bg-gray-700 border border-gray-600 focus:border-rose-400 focus:ring focus:ring-rose-300 focus:ring-opacity-30 transition-all duration-300 text-xs sm:text-base">
                        <div class="absolute inset-y-0 left-0 pl-2 sm:pl-3 flex items-center pointer-events-none">
                            <svg xmlns="http://www.w3.org/2000/svg" class="h-3 w-3 sm:h-5 sm:w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                            </svg>
                        </div>
                    </div>
                </div>
                <div>
                    <label for="faction-filter" class="block text-xs sm:text-sm font-medium mb-0.5 text-rose-200">Faction:</label>
                    <div class="relative">
                        <select id="faction-filter" bind:value={selectedFaction} 
                                class="w-full p-1 sm:p-2 rounded-md bg-gray-700 border border-gray-600 focus:border-rose-400 focus:ring focus:ring-rose-300 focus:ring-opacity-30 transition-all duration-300 text-xs sm:text-base">
                            <option value="">All Factions</option>
                            {#each factions as faction}
                                <option value={faction}>{faction}</option>
                            {/each}
                        </select>
                    </div>
                </div>
                <div>
                    <label for="series-filter" class="block text-xs sm:text-sm font-medium mb-0.5 text-rose-200">Series:</label>
                    <div class="relative">
                        <select id="series-filter" bind:value={selectedSeries} 
                                class="w-full p-1 sm:p-2 rounded-md bg-gray-700 border border-gray-600 focus:border-rose-400 focus:ring focus:ring-rose-300 focus:ring-opacity-30 transition-all duration-300 text-xs sm:text-base">
                            <option value="">All Series</option>
                            {#each series as s}
                                <option value={s}>{s}</option>
                            {/each}
                        </select>
                    </div>
                </div>
            </div>
        </div>

        <!-- Toy Grid - Updated to show 2 columns on mobile -->
        {#if filteredToys.length > 0}
            <div class="grid grid-cols-2 md:grid-cols-3 gap-2 sm:gap-3 xl:gap-4">
                {#each filteredToys as toy (toy.slug)}
                    <div class="toy-card-container">
                        <ToyItem
                            name={toy.name}
                            image={getBestImage(toy)}
                            slug={toy.slug}
                            faction={toy.faction}
                            series={toy.series}
                            description={toy.description}
                            year={toy.year}
                            hasImages={!!(toyImagesMap[toy.slug] && toyImagesMap[toy.slug].length > 0)}
                        />
                    </div>
                {/each}
            </div>
        {:else}
             <div class="text-center py-10 text-xl bg-gray-800/30 backdrop-blur-sm rounded-lg">
                {#if toys.length === 0}
                    <p class="text-gray-500 mb-3">No toys found in the collection yet.</p>
                    <p class="bg-gray-800 inline-block p-3 rounded-md text-gray-400">
                        Add some markdown files to <code class="bg-gray-700 px-2 py-1 rounded text-amber-300">src/routes/toys/</code>!
                    </p>
                {:else}
                    <div class="flex flex-col items-center justify-center">
                        <svg xmlns="http://www.w3.org/2000/svg" class="h-16 w-16 text-gray-500 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <p class="text-gray-400">No toys match the current filters.</p>
                    </div>
                {/if}
            </div>
        {/if}
    </div>
</div>

<style lang="postcss">
    #toys-gallery {
        position: relative;
        background-color: theme(colors.indigo.800); /* Deeper base color to match detail page */
        background-image: 
            radial-gradient(circle at 25% 25%, theme(colors.purple.700 / 0.3) 0%, transparent 50%),
            radial-gradient(circle at 75% 75%, theme(colors.rose.700 / 0.3) 0%, transparent 50%),
            linear-gradient(
                theme(colors.purple.900 / 0.4) 1px,
                transparent 1px
            ),
            linear-gradient(
                90deg,
                theme(colors.purple.900 / 0.4) 1px,
                transparent 1px
            );
        background-size: 100% 100%, 100% 100%, 2.5em 2.5em, 2.5em 2.5em;
        background-attachment: fixed;
    }
    
    /* Style selects for better appearance */
    select {
        appearance: none; /* Remove default arrow */
        background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%23d1d5db'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E");
        background-position: right 0.75rem center;
        background-repeat: no-repeat;
        background-size: 1rem 1rem;
        padding-right: 2.5rem; /* Make space for the arrow */
    }
    
    /* Card container animations */
    .toy-card-container {
        will-change: transform;
        transition: all 0.3s ease-out;
    }
    
    .toy-card-container:hover {
        z-index: 10;
    }
</style>
