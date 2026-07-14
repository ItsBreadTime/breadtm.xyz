<script lang="ts">
    import { error } from '@sveltejs/kit';
    import Nav from '$lib/components/site/Nav.svelte';
    import ToyDetailHeader from '$lib/components/toys/ToyDetailHeader.svelte';
    import ToyImageViewer from '$lib/components/toys/ToyImageViewer.svelte';
    import type { ToyDetailData } from '$lib/toys/detailTypes';

    let { data }: { data: ToyDetailData } = $props();
    const toy = $derived.by(() => {
        if (!data.metadata) throw error(404, 'Toy metadata not found');
        return data.metadata;
    });
</script>

<svelte:head>
    <link rel="preload" href="/fonts/Goldman-Bold.woff2" as="font" type="font/woff2" crossorigin="anonymous" />
</svelte:head>

<div id="toy-page" data-faction={toy.faction || 'Mixed'}>
    <div id="toy-content">
        <Nav />
        <main id="toy-details">
            <div class="toy-detail-shell">
                <ToyDetailHeader name={toy.name} faction={toy.faction} />
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
        --detail-wash-a: rgba(225, 0, 0, 0.42);
        --detail-wash-b: rgba(111, 77, 161, 0.34);
        --detail-field: #090b1f;
        --detail-field-deep: #17153f;
        --detail-grid-line: #20255d;
        --viewer-accent: #72d8f4;
        --viewer-accent-ink: #031f28;
        color: var(--detail-ink);
        background-color: var(--detail-field);
        background-image:
            radial-gradient(circle at 16% 0%, var(--detail-wash-a), transparent 28rem),
            radial-gradient(circle at 88% 8%, var(--detail-wash-b), transparent 30rem);
        background-color: color-mix(in srgb, var(--detail-field), #050308 34%);
        background-image:
            radial-gradient(
                circle at 16% 0%,
                color-mix(in srgb, var(--detail-wash-a), transparent 70%),
                transparent 28rem
            ),
            radial-gradient(
                circle at 88% 8%,
                color-mix(in srgb, var(--detail-wash-b), transparent 74%),
                transparent 30rem
            ),
            linear-gradient(
                color-mix(in srgb, var(--detail-grid-line), transparent 78%) 1px,
                transparent 1px
            ),
            linear-gradient(
                90deg,
                color-mix(in srgb, var(--detail-grid-line), transparent 78%) 1px,
                transparent 1px
            );
        background-size:
            auto,
            auto,
            var(--site-grid-size, 3.5rem) var(--site-grid-size, 3.5rem),
            var(--site-grid-size, 3.5rem) var(--site-grid-size, 3.5rem);
    }

    #toy-page::before {
        content: "";
        position: fixed;
        inset: 0;
        z-index: -1;
        background: transparent;
        background: linear-gradient(
            180deg,
            rgba(5, 3, 8, 0) 0%,
            rgba(5, 3, 8, 0.26) 48%,
            rgba(5, 3, 8, 0.54) 100%
        );
        pointer-events: none;
    }

    #toy-page::after {
        content: "";
        position: fixed;
        inset: 0;
        z-index: -1;
        background:
            radial-gradient(
                circle at 12% 12%,
                color-mix(in srgb, var(--detail-accent), transparent 84%),
                transparent 18rem
            ),
            radial-gradient(
                circle at 92% 16%,
                color-mix(in srgb, var(--detail-accent), transparent 88%),
                transparent 20rem
            );
        opacity: 0.75;
        pointer-events: none;
    }

    #toy-page[data-faction='Autobot'],
    #toy-page[data-faction='Maximal'] {
        --detail-accent: #ff4b4b;
        --detail-wash-a: rgba(225, 0, 0, 0.58);
        --detail-wash-b: rgba(255, 195, 92, 0.22);
        --detail-field: #140609;
        --detail-field-deep: #371015;
        --detail-grid-line: #3b0f15;
        --viewer-accent: #ff4b4b;
        --viewer-accent-ink: #2b0202;
    }

    #toy-page[data-faction='Decepticon'],
    #toy-page[data-faction='Predacon'] {
        --detail-accent: #b891ff;
        --detail-wash-a: rgba(111, 77, 161, 0.62);
        --detail-wash-b: rgba(59, 18, 90, 0.5);
        --detail-field: #100719;
        --detail-field-deep: #241537;
        --detail-grid-line: #2b1742;
        --viewer-accent: #b891ff;
        --viewer-accent-ink: #170729;
    }

    #toy-page[data-faction='IKEAtron'] {
        --detail-accent: #feda00;
        --detail-wash-a: rgba(0, 88, 171, 0.56);
        --detail-wash-b: rgba(254, 218, 0, 0.34);
        --detail-field: #06101f;
        --detail-field-deep: #092545;
        --detail-grid-line: #0b2b4d;
        --viewer-accent: #feda00;
        --viewer-accent-ink: #05285a;
    }

    #toy-page[data-faction='Mixed'] {
        --viewer-accent: #ff4f9a;
        --viewer-accent-ink: #210016;
    }

    #toy-content {
        position: relative;
        z-index: 1;
    }

    #toy-details {
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
        max-width: none;
        min-height: calc(100vh - 4.5rem);
        min-height: calc(100dvh - 4.5rem);
        margin: 0 auto;
        padding: clamp(0.5rem, 2.2vw, 1.15rem);
    }


    @media (min-width: 1024px) {
        #toy-details,
        .toy-detail-shell {
            min-height: calc(100dvh - 4.5rem);
        }
    }

    @media (max-width: 640px) {
        #toy-details,
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
