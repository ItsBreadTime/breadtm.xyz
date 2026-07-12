<script lang="ts">
    import { onMount } from 'svelte';
    import { flip } from 'svelte/animate';
    import { compareFactions, getFactionTheme } from '$lib/toys/factions';
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
    let reduceMotion = $state(false);
    let seriesMenu: HTMLDetailsElement;

    const isPresent = (value: string | undefined): value is string => Boolean(value);

    let factions = $derived([...new Set(toys.map((toy: Toy) => toy.faction).filter(isPresent))].sort((a, b) => {
        return compareFactions(a, b);
    }));
    let series = $derived([...new Set(toys.map((toy: Toy) => toy.series).filter(isPresent))].sort());
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

    let emptyStateMessage = $derived.by(() => {
        const query = searchTerm.trim().toLowerCase();
        if (query === 'kaiju' || query === 'kaijus') return "Today we are't facing the monsters at our door";
        if (query === 'drift') return "Incompatible.";
        if (query === 'kup') return 'BAH-WEEP-GRAAAGHNAH WHEEP NI-NI BONG';
        if (query === 'starscream' || query.startsWith('starsc')) return 'Traitor...';
        if (query === 'mutant' || query === 'mutants' || query == 'muties') return 'Found one? Report to claim your bounty.';
        if (query === 'drokk' || query === 'mutants' || query == 'muties') return 'Mind your language, citizen.';
        if (query === 'grud') return "Who, me?";
        if (query === 'i am the law') return 'Impersonating a judge.\n6 months iso-cubes.';
        if (query === 'breadtm' || query === 'bread') return "Yep, that's me.";
        if (query === 'ibread') return "For your everyday needs.";
        return '';
    });

    let pageFaction = $derived(selectedFaction || 'Mixed');
    let pageTheme = $derived(getFactionTheme(pageFaction));
    const mixedTheme = getFactionTheme();
    let factionOptions = $derived(factions.map((faction) => ({
        name: faction,
        count: factionCounts[faction] || 0,
        theme: getFactionTheme(faction)
    })));

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

    function selectSeries(seriesName: string) {
        selectedSeries = seriesName;
        if (seriesMenu) seriesMenu.open = false;
    }

    function scrollToTop() {
        window.scrollTo({ top: 0, behavior: reduceMotion ? 'auto' : 'smooth' });
    }

    onMount(() => {
        const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
        const handleScroll = () => {
            showScrollTop = window.scrollY > 400;
        };
        const handleMotionChange = () => {
            reduceMotion = motionQuery.matches;
        };

        handleMotionChange();
        window.addEventListener('scroll', handleScroll, { passive: true });
        motionQuery.addEventListener('change', handleMotionChange);

        return () => {
            window.removeEventListener('scroll', handleScroll);
            motionQuery.removeEventListener('change', handleMotionChange);
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

<div
    id="toys-page"
    data-faction={pageFaction}
    style:--accent={pageTheme.chromeAccent}
    style:--accent-ink={pageTheme.chromeAccentInk}
    style:--wash-a={pageTheme.washA}
    style:--wash-b={pageTheme.washB}
    style:--wash-c={pageTheme.washC}
    style:--page-field={pageTheme.field}
    style:--page-field-deep={pageTheme.fieldDeep}
    style:--page-grid-line={pageTheme.gridLine}
>
    <div id="toys-content">
        <Nav></Nav>
        <main class="pb-10 sm:pb-16" id="toys-gallery">
            <div class="toys-shell w-full mx-auto px-3 sm:px-5 lg:px-8">
                <section class="toys-hero">
                    <div class="hero-panel">
                        <div class="hero-title-row">
                            <h1 class="font-accent">Toy Shelf</h1>
                            <div
                                class="shelf-readout"
                                aria-live="polite"
                                aria-atomic="true"
                            >
                                <span aria-hidden="true" class="tabular-nums">{filteredToys.length}</span>
                                <span aria-hidden="true">/ {toys.length}</span>
                                <span class="sr-only">{filteredToys.length} of {toys.length} toys shown</span>
                            </div>
                        </div>
                    </div>
                </section>

                <section class="filter-deck" aria-label="Toy shelf controls">
                    <div class="search-row">
                        <div class="control-cell">
                            <label for="search" class="sr-only">Search toys</label>
                            <div class="search-field">
                                <svg xmlns="http://www.w3.org/2000/svg" class="search-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                </svg>
                                <input
                                    type="text"
                                    id="search"
                                    bind:value={searchTerm}
                                    placeholder="Search toys"
                                />
                            </div>
                        </div>

                        <div class="control-cell series-control">
                            <details class="series-menu" bind:this={seriesMenu}>
                                <summary class="series-summary" aria-label="Filter by series">
                                    <span>{selectedSeries || 'All series'}</span>
                                    <svg aria-hidden="true" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.4" d="M19 9l-7 7-7-7" />
                                    </svg>
                                </summary>
                                <div class="series-options" aria-label="Series options">
                                    <button class:active={!selectedSeries} onclick={() => selectSeries('')}>All series</button>
                                    {#each series as s}
                                        <button class:active={selectedSeries === s} onclick={() => selectSeries(s)}>{s}</button>
                                    {/each}
                                </div>
                            </details>
                        </div>
                    </div>

                    <div class="faction-rail-wrap">
                        <div class="faction-rail" aria-label="Filter by faction">
                            <button
                                class:active={!selectedFaction}
                                aria-pressed={!selectedFaction}
                                aria-label={`Show all toys, ${toys.length} items`}
                                onclick={() => selectedFaction = ''}
                                style:--chip-accent={mixedTheme.accent}
                                style:--chip-active-ink={mixedTheme.accentInk}
                                style:--chip-panel={mixedTheme.panel}
                            >
                                <span>All</span>
                                <span class="tabular-nums">{toys.length}</span>
                            </button>
                            {#each factionOptions as option (option.name)}
                                <button
                                    class:active={selectedFaction === option.name}
                                    data-faction-chip={option.name}
                                    aria-pressed={selectedFaction === option.name}
                                    aria-label={`Show ${option.name} toys, ${option.count} items`}
                                    onclick={() => selectFaction(option.name)}
                                    style:--chip-accent={option.theme.accent}
                                    style:--chip-active-ink={option.theme.accentInk}
                                    style:--chip-panel={option.theme.panel}
                                >
                                    <span>{option.name}</span>
                                    <span class="tabular-nums">{option.count}</span>
                                </button>
                            {/each}
                        </div>
                    </div>
                </section>

                {#if filteredToys.length > 0}
                    <section class="toy-grid" aria-label={`Filtered toy collection, ${filteredToys.length} items`}>
                        {#each filteredToys as toy, i (toy.slug)}
                            <div
                                class="toy-grid-item"
                                animate:flip={{ duration: reduceMotion ? 0 : 220 }}
                            >
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
                            </div>
                        {/each}
                    </section>
                {:else}
                    <section class="empty-state" aria-live="polite">
                        {#if toys.length === 0}
                            <p>No toys in the collection yet.</p>
                            <span>Add markdown files to <code>src/routes/toys/</code></span>
                        {:else}
                            <p>{emptyStateMessage || 'Erm... who is that?'}</p>
                            <button onclick={clearAllFilters}>Reset</button>
                        {/if}
                    </section>
                {/if}
            </div>
        </main>
    </div>

    {#if showScrollTop}
        <button
            onclick={scrollToTop}
            class="scroll-top-btn"
            aria-label="Scroll to top"
        >
            <svg xmlns="http://www.w3.org/2000/svg" aria-hidden="true" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
                <path stroke-linecap="round" stroke-linejoin="round" d="M5 15l7-7 7 7" />
            </svg>
        </button>
    {/if}
</div>

<style lang="postcss">
    #toys-page {
        position: relative;
        min-height: 100dvh;
        isolation: isolate;
        --field: rgba(3, 8, 18, 0.96);
        --line: rgba(116, 223, 255, 0.32);
        --ink: #fff7f8;
        --muted: #eaf5ff;
        --accent: #ff4f9a;
        --accent-ink: #210016;
        --wash-a: rgba(0, 166, 255, 0.22);
        --wash-b: rgba(255, 79, 154, 0.17);
        --wash-c: rgba(254, 218, 0, 0.15);
        --page-field: #090b1f;
        --page-field-deep: #2e2a78;
        --page-grid-line: #20255d;
        color: var(--ink);
        background-color: color-mix(in srgb, var(--page-field), #050308 30%);
        background-image:
            radial-gradient(circle at 16% 0%, color-mix(in srgb, var(--wash-a), transparent 64%), transparent 26rem),
            radial-gradient(circle at 86% 9%, color-mix(in srgb, var(--wash-b), transparent 70%), transparent 28rem),
            linear-gradient(color-mix(in srgb, var(--page-grid-line), transparent 72%) 1px, transparent 1px),
            linear-gradient(90deg, color-mix(in srgb, var(--page-grid-line), transparent 72%) 1px, transparent 1px);
        background-size: auto, auto, var(--site-grid-size, 3.5rem) var(--site-grid-size, 3.5rem), var(--site-grid-size, 3.5rem) var(--site-grid-size, 3.5rem);
        transition: background-color 360ms cubic-bezier(0.22, 1, 0.36, 1);
    }

    #toys-page::before {
        content: "";
        position: fixed;
        inset: 0;
        z-index: 0;
        background:
            linear-gradient(180deg, rgba(5, 3, 8, 0) 0%, rgba(5, 3, 8, 0.3) 45%, rgba(5, 3, 8, 0.5) 100%);
        pointer-events: none;
    }

    #toys-content,
    #toys-gallery {
        position: relative;
        z-index: 1;
    }

    .toys-shell {
        max-width: 90rem;
    }

    .toys-hero {
        padding: clamp(1.1rem, 3.2vw, 2.3rem) 0 clamp(0.65rem, 2vw, 1rem);
    }

    .hero-panel {
        position: relative;
        isolation: isolate;
        overflow: visible;
        padding: clamp(0.7rem, 1.7vw, 1.1rem);
        background: color-mix(in srgb, var(--page-field-deep), #050308 18%);
        border: var(--site-outline-width, 4px) solid var(--site-outline, #050308);
        border-radius: var(--site-radius, 0.65rem);
        box-shadow: 0 var(--site-shadow-offset, 0.5rem) 0 var(--site-outline, #050308);
    }

    .hero-title-row {
        display: flex;
        align-items: end;
        justify-content: space-between;
        gap: 1rem;
    }

    .toys-hero h1 {
        display: inline-block;
        padding: 0.14em 0.24em 0.12em;
        color: var(--accent-ink);
        background: var(--accent);
        border: 4px solid var(--site-outline, #050308);
        border-radius: 0.45rem;
        box-shadow: 0.12em 0.12em 0 var(--site-outline, #050308);
        font-size: clamp(2.35rem, 7vw, 5.2rem);
        line-height: 0.92;
        letter-spacing: 0;
        text-wrap: balance;
    }

    .shelf-readout {
        display: inline-flex;
        align-items: baseline;
        gap: 0.28rem;
        flex: 0 0 auto;
        padding: 0.42rem 0.62rem;
        color: var(--accent-ink);
        background: var(--accent);
        border: 3px solid var(--site-outline, #050308);
        border-radius: 0.55rem;
        box-shadow: 0 4px 0 #050308;
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
        position: relative;
        z-index: 5;
        display: grid;
        overflow: visible;
        gap: 0.7rem;
        margin-bottom: clamp(0.8rem, 2vw, 1.3rem);
        padding: clamp(0.8rem, 1.7vw, 1rem) clamp(0.55rem, 1.4vw, 0.75rem) clamp(0.55rem, 1.4vw, 0.75rem);
        background: color-mix(in srgb, var(--page-field-deep), #050308 34%);
        border: var(--site-outline-width, 4px) solid var(--site-outline, #050308);
        border-radius: var(--site-radius, 0.65rem);
        box-shadow: 0 0.45rem 0 var(--site-outline, #050308);
    }

    .filter-deck::before {
        content: "";
        position: absolute;
        inset: 0 0 auto;
        height: 0.36rem;
        background: var(--accent);
        box-shadow: 0 3px 0 #050308;
        pointer-events: none;
    }

    .search-row {
        display: grid;
        grid-template-columns: minmax(0, 1fr);
        gap: 0.75rem;
    }

    .control-cell {
        display: grid;
        min-width: 0;
    }

    .series-control,
    .series-menu {
        position: relative;
    }

    .series-summary {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 0.5rem;
        width: 100%;
        min-height: 2.75rem;
        padding: 0.62rem 0.75rem 0.62rem 0.85rem;
        color: var(--ink);
        background: var(--field);
        border: 2px solid #050308;
        border-radius: 0.45rem;
        box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.16), 0 3px 0 #050308;
        cursor: pointer;
        font-size: 1rem;
        list-style: none;
    }

    .series-summary::-webkit-details-marker {
        display: none;
    }

    .series-summary svg {
        flex: 0 0 auto;
        width: 1rem;
        height: 1rem;
        transition: transform 180ms ease;
    }

    .series-menu[open] .series-summary svg {
        transform: rotate(180deg);
    }

    .series-options {
        position: absolute;
        top: calc(100% + 0.45rem);
        right: 0;
        z-index: 30;
        display: grid;
        gap: 0.2rem;
        width: max(100%, 10rem);
        max-height: 15rem;
        overflow-y: auto;
        padding: 0.4rem;
        background: #07050d;
        border: 3px solid #050308;
        border-radius: 0.5rem;
        box-shadow: 0 5px 0 #050308;
    }

    .series-options button {
        min-height: 2.5rem;
        padding: 0.5rem 0.65rem;
        color: var(--ink);
        border-radius: 0.35rem;
        font-weight: 700;
        text-align: left;
    }

    .series-options button:hover {
        color: var(--ink);
        background: color-mix(in srgb, var(--accent), #07050d 68%);
    }

    .series-options button.active {
        color: var(--accent-ink);
        background: var(--accent);
        box-shadow: inset 0 0 0 2px #050308;
    }

    .series-options button.active:hover {
        color: var(--accent-ink);
        background: color-mix(in srgb, var(--accent), white 10%);
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
        color: color-mix(in srgb, var(--accent), white 42%);
        transform: translateY(-50%);
        pointer-events: none;
    }

    input {
        width: 100%;
        min-height: 2.75rem;
        color: var(--ink);
        background-color: var(--field);
        border: 2px solid #050308;
        border-radius: 0.45rem;
        box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.16), 0 3px 0 #050308;
        font-size: 1rem;
        transition: border-color 180ms ease, box-shadow 180ms ease, background-color 180ms ease;
    }

    input {
        padding: 0.62rem 0.85rem 0.62rem 2.55rem;
    }

    input::placeholder {
        color: #eee2f0;
        opacity: 1;
    }

    input:hover,
    .series-summary:hover,
    input:focus {
        border-color: color-mix(in srgb, var(--accent), white 14%);
        background-color: rgba(5, 3, 8, 0.94);
        box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--accent), white 18%), 0 3px 0 #050308;
    }

    input:focus,
    .series-summary:focus-visible {
        border-color: var(--accent);
        outline: none;
        box-shadow: 0 3px 0 #050308;
    }

    button:focus-visible {
        outline: 3px solid color-mix(in srgb, var(--accent), white 15%);
        outline-offset: 3px;
    }

    .faction-rail-wrap {
        min-width: 0;
    }

    .faction-rail {
        display: flex;
        flex-wrap: nowrap;
        gap: 0.55rem;
        overflow-x: auto;
        overflow-y: hidden;
        padding: 0.2rem 0.12rem 0.32rem;
        margin: -0.2rem -0.12rem -0.25rem;
        scroll-padding-inline: 0.12rem;
        scroll-snap-type: x proximity;
        scrollbar-width: none;
    }

    .faction-rail::-webkit-scrollbar {
        display: none;
    }

    .faction-rail button,
    .empty-state button {
        min-height: 2.75rem;
        border-radius: 999px;
        font-weight: 800;
        transition:
            transform 180ms cubic-bezier(0.22, 1, 0.36, 1),
            color 180ms ease,
            background-color 180ms ease,
            border-color 180ms ease,
            box-shadow 180ms ease;
    }

    .faction-rail button {
        --chip-accent: var(--accent);
        --chip-active-bg: var(--chip-accent);
        --chip-active-ink: var(--accent-ink);
        --chip-panel: #25101d;
        display: inline-flex;
        align-items: center;
        gap: 0.55rem;
        flex: 0 0 auto;
        padding: 0.42rem 0.62rem;
        color: var(--ink);
        background: color-mix(in srgb, var(--chip-panel), #07050d 42%);
        border: 2px solid #050308;
        border-radius: 0.55rem;
        font-family: Goldman, sans-serif;
        font-size: 0.875rem;
        scroll-snap-align: start;
    }

    .faction-rail button span:last-child {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        height: 1.5rem;
        min-width: 1.45rem;
        padding: 0.08rem 0.38rem 0;
        color: var(--chip-active-ink);
        background: var(--chip-accent);
        border-radius: 0.38rem;
        text-align: center;
    }

    .faction-rail button.active {
        color: var(--chip-active-ink);
        background: var(--chip-active-bg);
        border-color: #050308;
        transform: translateY(-1px);
    }

    .faction-rail button.active span:last-child {
        color: var(--chip-active-ink);
        background: #fff7f8;
    }

    .empty-state button {
        flex: 0 0 auto;
        padding: 0.45rem 0.75rem;
        color: var(--accent-ink);
        background: var(--accent);
        border: 2px solid #050308;
        box-shadow: 0 4px 0 #050308;
        font-family: Goldman, sans-serif;
        font-size: 0.875rem;
    }

    .empty-state {
        display: grid;
        place-items: center;
        gap: 0.75rem;
        min-height: 18rem;
        padding: 2rem;
        text-align: center;
        color: var(--muted);
        background: color-mix(in srgb, var(--page-field-deep), #050308 34%);
        border: var(--site-outline-width, 4px) solid var(--site-outline, #050308);
        border-radius: var(--site-radius, 0.65rem);
        box-shadow: 0 0.45rem 0 var(--site-outline, #050308);
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

    .toy-grid {
        display: flex;
        flex-wrap: wrap;
        justify-content: center;
        gap: 0.8rem;
        align-items: stretch;
        padding: 0.3rem 0 1.5rem;
    }

    .toy-grid-item {
        flex: 0 1 100%;
        max-width: 100%;
    }

    .toy-grid-item :global(.toy-card) {
        height: 100%;
    }

    @media (hover: hover) {
        .faction-rail button:hover,
        .empty-state button:hover {
            transform: translateY(-1px);
        }

        .faction-rail button:hover {
            color: #fff7f8;
            background: color-mix(in srgb, var(--chip-accent), #050308 68%);
            border-color: color-mix(in srgb, var(--chip-accent), white 12%);
        }

        .faction-rail button.active:hover {
            color: var(--chip-active-ink);
            background: color-mix(in srgb, var(--chip-active-bg), white 8%);
            border-color: #050308;
            transform: translateY(-2px);
        }

        .empty-state button:hover {
            background: color-mix(in srgb, var(--accent), white 10%);
            box-shadow: 0 4px 0 rgba(0, 0, 0, 0.44);
        }
    }

    @media (max-width: 720px) {
        #toys-page {
            background-size: auto, auto, 3rem 3rem, 3rem 3rem;
        }

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
            font-size: 0.875rem;
        }

        .filter-deck {
            gap: 0.5rem;
            margin-bottom: 0.75rem;
            box-shadow: 0 4px 0 #050308;
        }

        input,
        .series-summary {
            min-height: 2.75rem;
            border-width: 2px;
            border-radius: 0.45rem;
            font-size: 1rem;
        }

        input {
            padding: 0.48rem 0.65rem 0.48rem 2.05rem;
        }

        .search-icon {
            left: 0.7rem;
            width: 0.95rem;
            height: 0.95rem;
        }

        .series-summary {
            padding: 0.48rem 0.58rem 0.48rem 0.62rem;
        }

        .faction-rail {
            gap: 0.42rem;
            padding: 0.2rem 0.1rem 0.42rem;
            margin: -0.1rem -0.1rem -0.3rem;
        }

        .faction-rail button {
            min-height: 2.75rem;
            flex: 0 0 auto;
            justify-content: center;
            gap: 0.42rem;
            padding: 0.34rem 0.58rem;
            border-width: 1.5px;
            font-size: 0.875rem;
        }

        .faction-rail button span:last-child {
            min-width: 1.2rem;
            padding: 0.08rem 0.28rem;
        }

    }

    @media (min-width: 48rem) and (max-width: 63.999rem) {
        .toys-shell {
            max-width: 60rem;
        }
    }

    @media (min-width: 64rem) and (max-width: 89.999rem) {
        .toys-shell {
            max-width: 72rem;
        }
    }

    @media (min-width: 80rem) and (max-width: 99.999rem) {
        .toys-shell {
            max-width: 76rem;
        }
    }

    @media (min-width: 48rem) and (max-width: 99.999rem) {

        .toys-hero {
            padding: 0.9rem 0 0.55rem;
        }

        .hero-panel {
            padding: 0.7rem;
        }

        .toys-hero h1 {
            font-size: clamp(2.5rem, 5.5vw, 3.75rem);
        }

        .filter-deck {
            gap: 0.5rem;
            margin-bottom: 0.8rem;
            padding: 0.7rem 0.55rem 0.55rem;
        }

        .toy-grid {
            gap: 0.85rem;
        }
    }

    @media (max-width: 47.999rem) {
        .toys-shell {
            width: min(calc(100% - 0.5rem), 42rem);
            padding-inline: 0.25rem;
        }

        .toy-grid {
            align-items: flex-start;
        }

        .toy-grid-item :global(.toy-card) {
            height: auto;
        }
    }

    @media (max-width: 47.999rem) {
        .faction-rail-wrap {
            -webkit-mask-image: linear-gradient(90deg, #000 0, #000 calc(100% - 1.5rem), transparent 100%);
            mask-image: linear-gradient(90deg, #000 0, #000 calc(100% - 1.5rem), transparent 100%);
        }
    }

    @media (min-width: 22rem) {
        .search-row {
            grid-template-columns: minmax(0, 1fr) minmax(7.5rem, 8.5rem);
            gap: 0.45rem;
        }

        .toy-grid-item {
            flex-basis: calc(50% - 0.4rem);
            max-width: calc(50% - 0.4rem);
        }
    }

    @media (min-width: 34rem) {
        .search-row {
            grid-template-columns: minmax(0, 1fr) minmax(11rem, 16rem);
        }
    }

    @media (min-width: 48rem) {
        .faction-rail {
            flex-wrap: wrap;
            overflow: visible;
        }

        .toy-grid {
            gap: 1rem;
        }

        .toy-grid-item {
            flex-basis: calc(50% - 0.5rem);
            max-width: calc(50% - 0.5rem);
        }

    }

    @media (min-width: 60rem) {
        .toy-grid {
            gap: 1.15rem;
        }

        .toy-grid-item {
            flex-basis: calc(33.333% - 0.767rem);
            max-width: calc(33.333% - 0.767rem);
        }
    }

    @media (min-width: 64rem) and (orientation: landscape) {
        .toy-grid {
            gap: 0.9rem;
        }

        .toy-grid-item {
            flex-basis: calc(25% - 0.675rem);
            max-width: calc(25% - 0.675rem);
        }
    }

    @media (prefers-reduced-motion: reduce) {
        #toys-page,
        input,
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
        position: fixed;
        right: max(1rem, env(safe-area-inset-right));
        bottom: max(1rem, env(safe-area-inset-bottom));
        z-index: 40;
        display: grid;
        place-items: center;
        width: 3rem;
        height: 3rem;
        color: var(--accent-ink);
        background: var(--accent);
        border: 2px solid #050308;
        border-radius: 0.55rem;
        box-shadow: 0 5px 0 #050308;
        animation: scroll-btn-enter 0.3s cubic-bezier(0.22, 1, 0.36, 1);
        transition: transform 180ms cubic-bezier(0.22, 1, 0.36, 1), box-shadow 180ms ease;
    }

    .scroll-top-btn svg {
        width: 1.25rem;
        height: 1.25rem;
    }

    .scroll-top-btn:focus-visible {
        outline: 3px solid color-mix(in srgb, var(--accent), white 18%);
        outline-offset: 3px;
    }

    @media (hover: hover) {
        .scroll-top-btn:hover {
            transform: translateY(-2px);
            box-shadow: 0 7px 0 #050308;
        }
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
