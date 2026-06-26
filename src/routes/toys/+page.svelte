<script lang="ts">
    import { onMount } from 'svelte';
    import ToyItem from '../components/ToyItem.svelte';
    import Nav from '../sections/Nav.svelte';

    let { data } = $props();

    interface Toy {
        slug: string;
        name: string;
        image?: string;
        primaryImage?: string;
        thumbnailImage?: string;
        faction?: string;
        series?: string;
        description?: string;
        year?: string;
    }

    let toys: Toy[] = $derived(data.toys || []);
    const toyImagesMap = $derived(data.toyImagesMap || {});

    let selectedFaction = $state('');
    let selectedSeries = $state('');
    let searchTerm = $state('');
    let showScrollTop = $state(false);

    const factionOrder = ['Autobot', 'Decepticon', 'IKEAtron', 'Maximal', 'Predacon'];

    const isPresent = (value: string | undefined): value is string => Boolean(value);

    let factions = $derived([...new Set(toys.map((toy: Toy) => toy.faction).filter(isPresent))].sort((a, b) => {
        const ai = factionOrder.indexOf(a);
        const bi = factionOrder.indexOf(b);
        if (ai !== -1 || bi !== -1) return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi);
        return a.localeCompare(b);
    }));
    let series = $derived([...new Set(toys.map((toy: Toy) => toy.series).filter(Boolean))].sort());
    let factionCounts = $derived(toys.reduce((counts: Record<string, number>, toy: Toy) => {
        if (toy.faction) counts[toy.faction] = (counts[toy.faction] || 0) + 1;
        return counts;
    }, {}));

    let filteredToys = $derived(toys.filter((toy: Toy) => {
        const factionMatch = !selectedFaction || toy.faction === selectedFaction;
        const seriesMatch = !selectedSeries || toy.series === selectedSeries;
        const haystack = `${toy.name} ${toy.faction || ''} ${toy.series || ''} ${toy.year || ''} ${toy.description || ''}`.toLowerCase();
        const searchMatch = !searchTerm || haystack.includes(searchTerm.toLowerCase().trim());
        return factionMatch && seriesMatch && searchMatch;
    }));

    let pageFaction = $derived(selectedFaction || 'Mixed');

    function getBestImage(toy: Toy): string | undefined {
        if (toy.thumbnailImage) return toy.thumbnailImage;
        if (toy.primaryImage) return toy.primaryImage;
        if (toy.image) return toy.image;
        return undefined;
    }

    function clearAllFilters() {
        selectedFaction = '';
        selectedSeries = '';
        searchTerm = '';
    }

    function selectFaction(faction: string) {
        selectedFaction = selectedFaction === faction ? '' : faction;
    }

    function scrollToTop() {
        const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        window.scrollTo({ top: 0, behavior: prefersReducedMotion ? 'auto' : 'smooth' });
    }

    onMount(() => {
        const handleScroll = () => {
            showScrollTop = window.scrollY > 400;
        };
        window.addEventListener('scroll', handleScroll, { passive: true });

        return () => {
            window.removeEventListener('scroll', handleScroll);
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
</svelte:head>

<div id="toys-page" data-faction={pageFaction}>
    <div id="toys-content">
        <Nav></Nav>
        <main class="min-h-[100dvh] pb-10 sm:pb-16" id="toys-gallery">
            <div class="w-full max-w-7xl mx-auto px-3 sm:px-5 lg:px-8">
                <section class="toys-hero">
                    <div>
                        <div class="hero-title-row">
                            <h1 class="font-accent">Toy Gallery</h1>
                            <div class="shelf-readout" aria-live="polite">
                                <span class="tabular-nums">{filteredToys.length}</span>
                                <span>of {toys.length}</span>
                            </div>
                        </div>
                    </div>
                </section>

                <section class="filter-deck" aria-label="Toy filters">
                    <div class="search-row">
                        <label for="search" class="sr-only">Search toys</label>
                        <div class="search-field">
                            <svg xmlns="http://www.w3.org/2000/svg" class="search-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                            </svg>
                            <input
                                type="text"
                                id="search"
                                bind:value={searchTerm}
                                placeholder="Search toys..."
                            />
                        </div>

                        <label for="series-filter" class="sr-only">Filter by series</label>
                        <select id="series-filter" bind:value={selectedSeries}>
                            <option value="">All series</option>
                            {#each series as s}
                                <option value={s}>{s}</option>
                            {/each}
                        </select>
                    </div>

                    <div class="faction-rail" aria-label="Filter by faction">
                        <button
                            class:active={!selectedFaction}
                            aria-pressed={!selectedFaction}
                            onclick={() => selectedFaction = ''}
                        >
                            <span>All</span>
                            <span class="tabular-nums">{toys.length}</span>
                        </button>
                        {#each factions as faction}
                            <button
                                class:active={selectedFaction === faction}
                                data-faction-chip={faction}
                                aria-pressed={selectedFaction === faction}
                                onclick={() => selectFaction(faction)}
                            >
                                <span>{faction}</span>
                                <span class="tabular-nums">{factionCounts[faction]}</span>
                            </button>
                        {/each}
                    </div>
                </section>

                {#if filteredToys.length > 0}
                    <section class="toy-grid" aria-label="Filtered toy collection">
                        {#each filteredToys as toy, i (toy.slug)}
                            <ToyItem
                                name={toy.name}
                                image={getBestImage(toy)}
                                slug={toy.slug}
                                faction={toy.faction}
                                series={toy.series}
                                description={toy.description}
                                year={toy.year}
                                hasImages={!!(toyImagesMap[toy.slug] && toyImagesMap[toy.slug].length > 0)}
                                index={i}
                            />
                        {/each}
                    </section>
                {:else}
                    <section class="empty-state" aria-live="polite">
                        {#if toys.length === 0}
                            <p>No toys in the collection yet.</p>
                            <span>Add markdown files to <code>src/routes/toys/</code></span>
                        {:else}
                            <p>No toys match those filters.</p>
                            <button onclick={clearAllFilters}>Reset the shelf</button>
                        {/if}
                    </section>
                {/if}
            </div>
        </main>
    </div>
</div>

{#if showScrollTop}
    <button 
        onclick={scrollToTop}
        class="scroll-top-btn fixed bottom-6 right-6 z-40 w-12 h-12 rounded-full bg-rose-500/80 hover:bg-rose-500 text-white shadow-lg shadow-rose-500/25 hover:shadow-rose-500/40 flex items-center justify-center transition-all duration-300 backdrop-blur-sm border border-rose-400/30"
        aria-label="Scroll to top"
    >
        <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
            <path stroke-linecap="round" stroke-linejoin="round" d="M5 15l7-7 7 7" />
        </svg>
    </button>
{/if}

<style lang="postcss">
    #toys-page {
        position: relative;
        min-height: 100dvh;
        isolation: isolate;
        --field: rgba(7, 12, 24, 0.9);
        --line: rgba(255, 255, 255, 0.18);
        --ink: #fff7f8;
        --muted: #d4c8d4;
        --accent: #f05278;
        --accent-ink: #270511;
        --wash-a: rgba(225, 0, 0, 0.42);
        --wash-b: rgba(111, 77, 161, 0.34);
        --wash-c: rgba(0, 88, 171, 0.2);
        color: var(--ink);
        background:
            radial-gradient(circle at 18% 16%, var(--wash-a), transparent 28rem),
            radial-gradient(circle at 82% 10%, var(--wash-b), transparent 31rem),
            linear-gradient(165deg, #06030b 0%, #0c0715 46%, #16050d 100%);
        transition: background 360ms cubic-bezier(0.22, 1, 0.36, 1);
    }

    #toys-page::before {
        content: "";
        position: absolute;
        inset: 0;
        z-index: -1;
        background-image:
            radial-gradient(circle, color-mix(in srgb, var(--accent), transparent 42%) 0 1.65px, transparent 1.85px);
        background-position: 0 0;
        background-size: 22px 22px;
        mask-image:
            radial-gradient(ellipse at 8% 12%, black 0 8rem, rgba(0, 0, 0, 0.54) 16rem, transparent 30rem),
            radial-gradient(ellipse at 96% 8%, black 0 7rem, rgba(0, 0, 0, 0.42) 17rem, transparent 32rem);
        opacity: 0.38;
        pointer-events: none;
    }

    #toys-page::after {
        content: "";
        position: absolute;
        inset: 0;
        z-index: -1;
        background-image: radial-gradient(circle, rgba(255, 255, 255, 0.16) 0 1px, transparent 1.2px);
        background-position: 9px 7px;
        background-size: 34px 34px;
        mask-image:
            radial-gradient(ellipse at 84% 18%, black 0 7rem, rgba(0, 0, 0, 0.44) 15rem, transparent 27rem),
            radial-gradient(ellipse at 12% 86%, black 0 6rem, rgba(0, 0, 0, 0.34) 15rem, transparent 25rem);
        opacity: 0.24;
        pointer-events: none;
    }

    #toys-page[data-faction='Autobot'] {
        --accent: #ff4b4b;
        --accent-ink: #2b0202;
        --wash-a: rgba(225, 0, 0, 0.56);
        --wash-b: rgba(255, 195, 92, 0.22);
        --wash-c: rgba(255, 255, 255, 0.16);
    }

    #toys-page[data-faction='Decepticon'] {
        --accent: #b891ff;
        --accent-ink: #170729;
        --wash-a: rgba(111, 77, 161, 0.62);
        --wash-b: rgba(59, 18, 90, 0.5);
        --wash-c: rgba(255, 255, 255, 0.13);
    }

    #toys-page[data-faction='IKEAtron'] {
        --accent: #feda00;
        --accent-ink: #061f48;
        --wash-a: rgba(0, 88, 171, 0.56);
        --wash-b: rgba(254, 218, 0, 0.34);
        --wash-c: rgba(255, 255, 255, 0.16);
    }

    #toys-content,
    #toys-gallery {
        position: relative;
        z-index: 1;
    }

    .toys-hero {
        padding: clamp(1.1rem, 3.2vw, 2.3rem) 0 clamp(0.65rem, 2vw, 1rem);
    }

    .hero-title-row {
        display: flex;
        align-items: end;
        justify-content: space-between;
        gap: 1rem;
    }

    .toys-hero h1 {
        font-size: clamp(2.35rem, 7vw, 5.2rem);
        line-height: 0.9;
        letter-spacing: 0;
        text-wrap: balance;
        text-shadow: 0 0.08em 0 #050308;
    }

    .shelf-readout {
        display: inline-flex;
        align-items: baseline;
        gap: 0.35rem;
        flex: 0 0 auto;
        padding: 0.5rem 0.7rem;
        color: var(--accent-ink);
        background: var(--accent);
        border: 2px solid var(--line);
        border-color: #050308;
        border-radius: 999px;
        box-shadow: 0 5px 0 rgba(0, 0, 0, 0.32);
        font-family: Goldman, sans-serif;
    }

    .shelf-readout span:first-child {
        font-size: clamp(1.15rem, 3vw, 1.65rem);
        line-height: 1;
    }

    .shelf-readout span:last-child {
        font-size: 0.78rem;
    }

    .filter-deck {
        display: grid;
        gap: 0.65rem;
        margin-bottom: clamp(0.8rem, 2vw, 1.3rem);
        padding: clamp(0.6rem, 1.5vw, 0.8rem);
        background: rgba(5, 3, 8, 0.76);
        border: 2px solid rgba(255, 255, 255, 0.18);
        border-radius: 0.8rem;
        box-shadow: 0 10px 0 rgba(0, 0, 0, 0.32);
    }

    .search-row {
        display: grid;
        grid-template-columns: minmax(0, 1fr) minmax(11rem, 16rem);
        gap: 0.75rem;
    }

    .search-field {
        position: relative;
    }

    .search-icon {
        position: absolute;
        left: 0.9rem;
        top: 50%;
        width: 1.1rem;
        height: 1.1rem;
        color: var(--muted);
        transform: translateY(-50%);
        pointer-events: none;
    }

    input,
    select {
        width: 100%;
        min-height: 2.75rem;
        color: var(--ink);
        background-color: var(--field);
        border: 2px solid var(--line);
        border-radius: 0.55rem;
        font-size: 1rem;
        transition: border-color 180ms ease, box-shadow 180ms ease, background-color 180ms ease;
    }

    input {
        padding: 0.62rem 0.85rem 0.62rem 2.55rem;
    }

    input::placeholder {
        color: #bfb0c1;
        opacity: 1;
    }

    select {
        appearance: none;
        padding: 0.62rem 2.55rem 0.62rem 0.85rem;
        background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%23f8eaf0'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2.4' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E");
        background-position: right 0.85rem center;
        background-repeat: no-repeat;
        background-size: 1rem 1rem;
    }

    input:focus,
    select:focus,
    button:focus-visible {
        outline: 3px solid color-mix(in srgb, var(--accent), white 15%);
        outline-offset: 3px;
    }

    .faction-rail {
        display: flex;
        gap: 0.55rem;
        overflow-x: auto;
        padding: 0.3rem 0.12rem 0.4rem;
        margin: -0.2rem -0.12rem -0.25rem;
        scrollbar-width: thin;
    }

    .faction-rail button,
    .empty-state button {
        min-height: 2.75rem;
        border-radius: 999px;
        font-weight: 800;
        transition: transform 180ms cubic-bezier(0.22, 1, 0.36, 1), background-color 180ms ease, border-color 180ms ease;
    }

    .faction-rail button {
        display: inline-flex;
        align-items: center;
        gap: 0.55rem;
        flex: 0 0 auto;
        padding: 0.45rem 0.7rem;
        color: var(--ink);
        background: rgba(255, 255, 255, 0.07);
        border: 2px solid rgba(255, 255, 255, 0.16);
        font-family: Goldman, sans-serif;
        font-size: 0.85rem;
    }

    .faction-rail button span:last-child {
        min-width: 1.45rem;
        padding: 0.12rem 0.38rem;
        color: #050308;
        background: rgba(255, 255, 255, 0.82);
        border-radius: 999px;
        text-align: center;
    }

    .faction-rail button.active {
        color: var(--accent-ink);
        background: var(--accent);
        border-color: #050308;
        transform: translateY(-1px);
    }

    .faction-rail button[data-faction-chip='Autobot'].active {
        background: #ff4b4b;
        color: #2b0202;
    }

    .faction-rail button[data-faction-chip='Decepticon'].active {
        background: #b891ff;
        color: #170729;
    }

    .faction-rail button[data-faction-chip='IKEAtron'].active {
        background: #feda00;
        color: #061f48;
    }

    .empty-state button {
        flex: 0 0 auto;
        padding: 0.45rem 0.75rem;
        color: var(--accent-ink);
        background: var(--accent);
        border: 2px solid #050308;
        font-family: Goldman, sans-serif;
        font-size: 0.85rem;
    }

    .toy-grid {
        display: flex;
        flex-wrap: wrap;
        gap: clamp(0.75rem, 2vw, 1.15rem);
        align-items: start;
        justify-content: center;
    }

    .toy-grid :global(.toy-card) {
        flex: 0 1 16rem;
        max-width: 16rem;
    }

    .empty-state {
        display: grid;
        place-items: center;
        gap: 0.75rem;
        min-height: 18rem;
        padding: 2rem;
        text-align: center;
        color: var(--muted);
        background: rgba(5, 3, 8, 0.72);
        border: 2px solid rgba(255, 255, 255, 0.15);
        border-radius: 0.8rem;
    }

    .empty-state p {
        color: var(--ink);
        font-family: Goldman, sans-serif;
        font-size: clamp(1.25rem, 4vw, 2rem);
    }

    .empty-state code {
        color: #ffda65;
        background: rgba(0, 0, 0, 0.4);
        border-radius: 0.35rem;
        padding: 0.1rem 0.35rem;
    }

    @media (hover: hover) {
        .faction-rail button:hover,
        .empty-state button:hover {
            transform: translateY(-1px);
        }
    }

    @media (max-width: 720px) {
        .toys-hero {
            padding: 0.75rem 0 0.45rem;
        }

        .hero-title-row {
            align-items: center;
            gap: 0.65rem;
        }

        .toys-hero h1 {
            font-size: clamp(1.9rem, 10vw, 2.55rem);
            white-space: nowrap;
        }

        .shelf-readout {
            padding: 0.38rem 0.55rem;
            box-shadow: 0 4px 0 rgba(0, 0, 0, 0.32);
        }

        .shelf-readout span:first-child {
            font-size: 1.05rem;
        }

        .shelf-readout span:last-child {
            font-size: 0.68rem;
        }

        .filter-deck {
            gap: 0.45rem;
            margin-bottom: 0.75rem;
            padding: 0.48rem;
            border-radius: 0.65rem;
            box-shadow: 0 6px 0 rgba(0, 0, 0, 0.32);
        }

        .search-row {
            grid-template-columns: minmax(0, 1fr) minmax(7.4rem, 8.6rem);
            gap: 0.45rem;
        }

        input,
        select {
            min-height: 2.75rem;
            border-width: 1.5px;
            border-radius: 0.45rem;
            font-size: 0.86rem;
        }

        input {
            padding: 0.48rem 0.65rem 0.48rem 2.05rem;
        }

        .search-icon {
            left: 0.7rem;
            width: 0.95rem;
            height: 0.95rem;
        }

        select {
            padding: 0.48rem 1.9rem 0.48rem 0.62rem;
            background-position: right 0.58rem center;
            background-size: 0.85rem 0.85rem;
        }

        .faction-rail {
            flex-wrap: nowrap;
            gap: 0.42rem;
            overflow-x: auto;
            overflow-y: hidden;
            padding: 0.2rem 0.1rem 0.34rem;
            margin: -0.1rem -0.1rem -0.24rem;
            scroll-padding-inline: 0.25rem;
        }

        .faction-rail button {
            min-height: 2.75rem;
            flex: 0 0 auto;
            justify-content: center;
            gap: 0.42rem;
            padding: 0.34rem 0.58rem;
            border-width: 1.5px;
            font-size: 0.74rem;
        }

        .faction-rail button span:last-child {
            min-width: 1.2rem;
            padding: 0.08rem 0.28rem;
        }

        .toy-grid {
            justify-content: stretch;
        }

        .toy-grid :global(.toy-card) {
            flex-basis: calc((100% - clamp(0.75rem, 2vw, 1.15rem)) / 2);
            max-width: none;
        }
    }

    @media (max-width: 340px) {
        .toy-grid :global(.toy-card) {
            flex-basis: 100%;
        }
    }

    @media (prefers-reduced-motion: reduce) {
        #toys-page,
        input,
        select,
        button,
        .scroll-top-btn {
            transition: none;
            animation: none;
        }

        :global(html:focus-within) {
            scroll-behavior: auto;
        }
    }

    .scroll-top-btn {
        animation: scroll-btn-enter 0.3s cubic-bezier(0.22, 1, 0.36, 1);
    }

    @keyframes scroll-btn-enter {
        from {
            opacity: 0;
            transform: translateY(16px) scale(0.9);
        }
        to {
            opacity: 1;
            transform: translateY(0) scale(1);
        }
    }
</style>
