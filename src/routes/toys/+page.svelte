<script lang="ts">
    import { getEmptyStateMessage, filterToys, getToyFacets } from '$lib/toys/filtering';
    import { getFactionTheme } from '$lib/toys/factions';
    import type { Toy } from '$lib/toys/types';
    import Nav from '$lib/components/site/Nav.svelte';
    import ScrollToTop from '$lib/components/toys/ScrollToTop.svelte';
    import ToyCollection from '$lib/components/toys/ToyCollection.svelte';
    import ToyShelfFilters from '$lib/components/toys/ToyShelfFilters.svelte';
    import ToyShelfHero from '$lib/components/toys/ToyShelfHero.svelte';

    let { data } = $props();

    const toys: Toy[] = $derived(data.toys || []);
    const toyImagesMap: Record<string, string[]> = $derived(data.toyImagesMap || {});
    const facets = $derived(getToyFacets(toys));

    function getInitialFilter(name: 'faction' | 'series' | 'search'): string {
        return data.filters?.[name] || '';
    }

    let selectedFaction = $state(getInitialFilter('faction'));
    let selectedSeries = $state(getInitialFilter('series'));
    let searchTerm = $state(getInitialFilter('search'));

    const filteredToys = $derived(filterToys(toys, {
        faction: selectedFaction,
        series: selectedSeries,
        search: searchTerm
    }));
    const factionOptions = $derived(facets.factions.map((name) => ({
        name,
        count: facets.factionCounts[name] || 0,
        theme: getFactionTheme(name)
    })));
    const pageFaction = $derived(selectedFaction || 'Mixed');
    const pageTheme = $derived(getFactionTheme(pageFaction));
    const emptyStateMessage = $derived(getEmptyStateMessage(searchTerm));
    const mixedTheme = getFactionTheme();

    function clearAllFilters() {
        selectedFaction = '';
        selectedSeries = '';
        searchTerm = '';
    }
</script>

<svelte:head>
    <link rel="preload" href="/fonts/Goldman-Bold.woff2" as="font" type="font/woff2" crossorigin="anonymous" />
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
        <Nav />
        <main class="pb-10 sm:pb-16" id="toys-gallery">
            <div class="toys-shell w-full mx-auto px-3 sm:px-5 lg:px-8">
                <ToyShelfHero shown={filteredToys.length} total={toys.length} />
                <ToyShelfFilters
                    bind:search={searchTerm}
                    bind:selectedSeries
                    bind:selectedFaction
                    series={facets.series}
                    factions={factionOptions}
                    total={toys.length}
                    {mixedTheme}
                />
                <ToyCollection
                    toys={filteredToys}
                    total={toys.length}
                    images={toyImagesMap}
                    emptyMessage={emptyStateMessage}
                    onreset={clearAllFilters}
                />
            </div>
        </main>
    </div>
    <ScrollToTop />
</div>

<style>
    #toys-page {
        position: relative;
        min-height: 100vh;
        min-height: 100dvh;
        isolation: isolate;
        --field: rgba(3, 8, 18, 0.96);
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
            radial-gradient(
                circle at 16% 0%,
                color-mix(in srgb, var(--wash-a), transparent 64%),
                transparent 26rem
            ),
            radial-gradient(
                circle at 86% 9%,
                color-mix(in srgb, var(--wash-b), transparent 70%),
                transparent 28rem
            ),
            linear-gradient(
                color-mix(in srgb, var(--page-grid-line), transparent 72%) 1px,
                transparent 1px
            ),
            linear-gradient(
                90deg,
                color-mix(in srgb, var(--page-grid-line), transparent 72%) 1px,
                transparent 1px
            );
        background-size:
            auto,
            auto,
            var(--site-grid-size, 3.5rem) var(--site-grid-size, 3.5rem),
            var(--site-grid-size, 3.5rem) var(--site-grid-size, 3.5rem);
    }

    #toys-page::before {
        content: "";
        position: fixed;
        inset: 0;
        z-index: 0;
        background: linear-gradient(
            180deg,
            rgba(5, 3, 8, 0) 0%,
            rgba(5, 3, 8, 0.3) 45%,
            rgba(5, 3, 8, 0.5) 100%
        );
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

    @media (max-width: 720px) {
        #toys-page {
            background-size: auto, auto, 3rem 3rem, 3rem 3rem;
        }
    }

    @media (max-width: 47.999rem) {
        .toys-shell {
            width: min(calc(100% - 0.5rem), 42rem);
            padding-inline: 0.25rem;
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

    @media (prefers-reduced-motion: reduce) {
        #toys-page {
            transition: none;
            animation: none;
        }

        :global(html:focus-within) {
            scroll-behavior: auto;
        }
    }
</style>
