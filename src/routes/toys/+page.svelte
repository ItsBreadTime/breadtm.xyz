<script lang="ts">
    import { untrack } from 'svelte';
    import { afterNavigate, replaceState } from '$app/navigation';
    import { page } from '$app/state';
    import { getEmptyStateMessage, filterToys, getToyFacets } from '$lib/toys/filtering';
    import { banners } from '$lib/toys/banner';
    import { getFactionTheme } from '$lib/toys/factions';
    import type { Toy } from '$lib/toys/types';
    import Nav from '$lib/components/site/Nav.svelte';
    import ScrollToTop from '$lib/components/toys/ScrollToTop.svelte';
    import ToyBanner from '$lib/components/toys/ToyBanner.svelte';
    import ToyCollection from '$lib/components/toys/ToyCollection.svelte';
    import ToyShelfFilters from '$lib/components/toys/ToyShelfFilters.svelte';
    import ToyShelfHero from '$lib/components/toys/ToyShelfHero.svelte';

    let { data } = $props();

    const toys: Toy[] = $derived(data.toys || []);
    const toyImagesMap: Record<string, string[]> = $derived(data.toyImagesMap || {});
    const facets = $derived(getToyFacets(toys));

    function getInitialFilter(name: 'faction' | 'search'): string {
        return data.filters?.[name] || '';
    }

    let selectedFaction = $state(getInitialFilter('faction'));
    let searchTerm = $state(getInitialFilter('search'));

    let navigationReady = $state(false);
    afterNavigate(() => {
        navigationReady = true;
        selectedFaction = page.url.searchParams.get('faction') || '';
        searchTerm = page.url.searchParams.get('q') || '';
    });
    const shelfHref = $derived.by(() => {
        const params = new URLSearchParams();
        if (selectedFaction) params.set('faction', selectedFaction);
        if (searchTerm) params.set('q', searchTerm);
        const bannerId = page.url.searchParams.get('banner');
        if (bannerId) params.set('banner', bannerId);
        return '/toys' + (params.size ? '?' + params : '');
    });
    $effect(() => { if (!navigationReady) return; const href = shelfHref; untrack(() => replaceState(href + window.location.hash, {})); });
    const matchingFacets = $derived(getToyFacets(filterToys(toys, { faction: '', search: searchTerm })));
    const filteredToys = $derived(filterToys(toys, {
        faction: selectedFaction,
        search: searchTerm
    }));
    const factionOptions = $derived(facets.factions.map((name) => ({
        name,
        count: matchingFacets.factionCounts[name] || 0,
        theme: getFactionTheme(name)
    })));
    const pageFaction = $derived(selectedFaction || 'Mixed');
    const pageTheme = $derived(getFactionTheme(pageFaction));
    const emptyStateMessage = $derived(getEmptyStateMessage(searchTerm));
    const mixedTheme = getFactionTheme();
    const hasBanner = banners.length > 0;
    const isFiltered = $derived(!!(selectedFaction || searchTerm));

    function clearAllFilters() {
        selectedFaction = '';
        searchTerm = '';
    }
</script>

<svelte:head>
    <title>Toy Shelf · BreadTM</title>
</svelte:head>

<div
    id="toys-page"
    class="toys-cel-wash"
    data-faction={pageFaction}
    style:--accent={pageTheme.chromeAccent}
    style:--accent-ink={pageTheme.chromeAccentInk}
    style:--page-field={pageTheme.field}
    style:--page-field-deep={pageTheme.fieldDeep}
    style:--page-grid-line={pageTheme.gridLine}
    style:--halftone-tint={pageTheme.halftoneTint}
>
    <div id="toys-content">
        <!-- Section accent, like Stats' green: the shelf tints the nav with
            its title-stamp pink; detail pages switch to the toy's faction. -->
        <Nav accent={mixedTheme.chromeAccent} />
        <main class="toys-gallery pb-10 sm:pb-16" id="main-content">
            <div class="toys-shell w-full mx-auto px-3 sm:px-5 lg:px-8" class:has-banner={hasBanner}>
                <ToyShelfHero shown={filteredToys.length} total={toys.length} filtered={isFiltered} />
                {#if hasBanner}
                    <ToyBanner />
                {/if}
                <div class="shelf-main">
                    <ToyShelfFilters
                        bind:search={searchTerm}
                        bind:selectedFaction
                        factions={factionOptions}
                        total={filterToys(toys, { faction: '', search: searchTerm }).length}
                        {mixedTheme}
                    />
                    <ToyCollection
                        returnHref={shelfHref}
                        toys={filteredToys}
                        total={toys.length}
                        images={toyImagesMap}
                        emptyMessage={emptyStateMessage}
                        onreset={clearAllFilters}
                    />
                </div>
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
        --page-field: #090b1f;
        --page-field-deep: #2e2a78;
        --page-grid-line: #20255d;
        --halftone-tint: #ff4f9a;
        color: var(--ink);
        background-color: color-mix(in srgb, var(--page-field), #050308 30%);
        background-image:
            linear-gradient(
                color-mix(in srgb, var(--page-grid-line), transparent 65%) 1px,
                transparent 1px
            ),
            linear-gradient(
                90deg,
                color-mix(in srgb, var(--page-grid-line), transparent 65%) 1px,
                transparent 1px
            );
        background-size:
            var(--site-grid-size, 3.5rem) var(--site-grid-size, 3.5rem),
            var(--site-grid-size, 3.5rem) var(--site-grid-size, 3.5rem);
    }

    #toys-content,
    .toys-gallery {
        position: relative;
        z-index: 1;
    }

    .toys-shell {
        max-width: 90rem;
    }

    .shelf-main {
        min-width: 0;
    }

    /* The title always leads; below 64rem a banner (when one is configured)
       sits between the title and the controls as a slim strip. */
    .toys-shell {
        display: grid;
        grid-template-columns: minmax(0, 1fr);
        grid-template-areas:
            "hero"
            "banner"
            "shelf";
    }

    .toys-shell > :global(.toys-hero) {
        grid-area: hero;
    }

    .toys-shell > :global(.toy-banner) {
        grid-area: banner;
    }

    .shelf-main {
        grid-area: shelf;
    }

    /* ≥64rem: banner becomes a vertical rail left of the title and shelf. */
    @media (min-width: 64rem) {
        .toys-shell.has-banner {
            grid-template-columns: clamp(12rem, 15vw, 17rem) minmax(0, 1fr);
            grid-template-areas:
                "banner hero"
                "banner shelf";
            grid-template-rows: auto 1fr;
            column-gap: clamp(1rem, 2vw, 1.5rem);
            align-items: start;
        }
    }

    @media (max-width: 720px) {
        #toys-page {
            background-size: 3rem 3rem, 3rem 3rem;
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
