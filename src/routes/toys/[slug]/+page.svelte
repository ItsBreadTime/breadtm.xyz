<script lang="ts">
    import { page } from '$app/state';
    import { getFactionTheme } from '$lib/toys/factions';
    import Nav from '$lib/components/site/Nav.svelte';
    import ToyDetailHeader from '$lib/components/toys/ToyDetailHeader.svelte';
    import ToyImageViewer from '$lib/components/toys/ToyImageViewer.svelte';
    import type { ToyDetailData } from '$lib/toys/detailTypes';

    let { data }: { data: ToyDetailData } = $props();
    const backHref = $derived.by(() => {
        const from = page.url.searchParams.get('from') || '/toys';
        const url = new URL(from, page.url.origin);
        return url.origin === page.url.origin && url.pathname === '/toys' ? url.pathname + url.search + url.hash : '/toys';
    });
    const toy = $derived(data.metadata);
</script>

<div id="toy-page" class="toys-cel-wash" data-faction={toy.faction || 'Mixed'}>
    <div id="toy-content">
        <Nav accent={getFactionTheme(toy.faction).accent} />
        <main class="toy-details" id="main-content">
            <div class="toy-detail-shell">
                <ToyDetailHeader {backHref} name={toy.name} />
                <ToyImageViewer {data} />
            </div>
        </main>
    </div>
</div>

<style lang="postcss">
    #toy-page {
        position: relative;
        min-height: 100vh;
        min-height: 100dvh;
        isolation: isolate;
        --detail-accent: #f05278;
        --detail-ink: #fff7f8;
        --detail-muted: #d9cedc;
        --detail-field: #090b1f;
        --detail-field-deep: #17153f;
        --detail-grid-line: #20255d;
        --viewer-accent: #72d8f4;
        --viewer-accent-ink: #031f28;
        --halftone-tint: #f05278;
        color: var(--detail-ink);
        background-color: color-mix(in srgb, var(--detail-field), #050308 34%);
        background-image:
            linear-gradient(
                color-mix(in srgb, var(--detail-grid-line), transparent 65%) 1px,
                transparent 1px
            ),
            linear-gradient(
                90deg,
                color-mix(in srgb, var(--detail-grid-line), transparent 65%) 1px,
                transparent 1px
            );
        background-size:
            var(--site-grid-size, 3.5rem) var(--site-grid-size, 3.5rem),
            var(--site-grid-size, 3.5rem) var(--site-grid-size, 3.5rem);
    }


    #toy-page[data-faction='Autobot'],
    #toy-page[data-faction='Maximal'] {
        --detail-accent: #ff4b4b;
        --detail-field: #140609;
        --detail-field-deep: #371015;
        --detail-grid-line: #3b0f15;
        --viewer-accent: #ff4b4b;
        --viewer-accent-ink: #2b0202;
        --halftone-tint: #ff6a5c;
    }

    #toy-page[data-faction='Decepticon'],
    #toy-page[data-faction='Predacon'] {
        --detail-accent: #b891ff;
        --detail-field: #100719;
        --detail-field-deep: #241537;
        --detail-grid-line: #2b1742;
        --viewer-accent: #b891ff;
        --viewer-accent-ink: #170729;
        --halftone-tint: #b891ff;
    }

    #toy-page[data-faction='IKEAtron'] {
        --detail-accent: #feda00;
        --detail-field: #06101f;
        --detail-field-deep: #092545;
        --detail-grid-line: #0b2b4d;
        --viewer-accent: #feda00;
        --viewer-accent-ink: #05285a;
        --halftone-tint: #feda00;
    }

    #toy-page[data-faction='Mixed'] {
        --viewer-accent: #ff4f9a;
        --viewer-accent-ink: #210016;
        --halftone-tint: #ff4f9a;
    }

    #toy-content {
        position: relative;
        z-index: 1;
    }

    .toy-details {
        position: relative;
        min-height: calc(100vh - 4.5rem);
        min-height: calc(100dvh - 4.5rem);
    }

    .toy-detail-shell {
        display: grid;
        grid-template-columns: minmax(0, 1fr);
        grid-template-rows: auto minmax(0, 1fr);
        gap: clamp(0.75rem, 2vw, 1rem);
        width: calc(100% - clamp(1rem, 3vw, 3rem));
        max-width: 90rem;
        min-height: calc(100vh - 4.5rem);
        min-height: calc(100dvh - 4.5rem);
        margin: 0 auto;
        padding: clamp(0.5rem, 2.2vw, 1.15rem);
    }


    @media (min-width: 1024px) {
        .toy-details,
        .toy-detail-shell {
            min-height: calc(100dvh - 4.5rem);
        }
    }

    @media (max-width: 640px) {
        .toy-details,
        .toy-detail-shell {
            min-height: auto;
        }
    }

    @media (max-width: 340px) {
        .toy-detail-shell {
            padding-inline: 0.45rem;
        }
    }

    @media (prefers-reduced-motion: reduce) {
        #toy-page,
        #toy-page::before,
        #toy-page::after {
            transition-duration: 0.01ms !important;
            animation-duration: 0.01ms !important;
        }
    }
</style>
