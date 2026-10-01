<script lang="ts">
    import { getBestImage } from '$lib/toys/filtering';
    import type { Toy } from '$lib/toys/types';
    import ToyItem from './ToyItem.svelte';

    let {
        returnHref = "/toys",
        toys,
        total,
        images,
        emptyMessage,
        onreset
    }: {
        returnHref?: string;
        toys: Toy[];
        total: number;
        images: Record<string, string[]>;
        emptyMessage: string;
        onreset: () => void;
    } = $props();
</script>

{#if toys.length > 0}
    <section class="toy-grid" aria-label={`Filtered toy collection, ${toys.length} items`}>
        <h2 class="sr-only">Toys</h2>
        {#each toys as toy, index (toy.slug)}
            <div class="toy-grid-item" id={`toy-${toy.slug}`}>
                <ToyItem
                    {returnHref}
                    name={toy.name}
                    image={getBestImage(toy)}
                    slug={toy.slug}
                    faction={toy.faction}
                    description={toy.description}
                    year={toy.year}
                    hasImages={!!images[toy.slug]?.length}
                    imageFiles={images[toy.slug] || []}
                    placeholder={toy.placeholder}
                    {index}
                />
            </div>
        {/each}
    </section>
{:else}
    <section class="empty-state" aria-live="polite">
        {#if total === 0}
            <p>No toys in the collection yet.</p>
            <span>Add markdown files to <code>src/content/toys/</code></span>
        {:else}
            <p>{emptyMessage || 'Erm... who is that?'}</p>
            <a
                href="/toys"
                onclick={(event) => {
                    event.preventDefault();
                    onreset();
                }}
            >Reset</a>
        {/if}
    </section>
{/if}

<style>
    .toy-grid {
        display: flex;
        flex-wrap: wrap;
        align-items: stretch;
        justify-content: flex-start;
        gap: 0.8rem;
        padding: 0.3rem 0 1.5rem;
    }

    .toy-grid-item {
        flex: 0 1 100%;
        max-width: 100%;
    }

    .toy-grid-item :global(.toy-card) {
        height: 100%;
    }

    /* The card's chamfer clip-path swallows its own outline, so the keyboard
       ring is drawn on the slot around it instead. */
    .toy-grid-item:has(:global(.toy-card:focus-visible)) {
        outline: 3px solid #ffffff;
        outline-offset: 5px;
    }

    .empty-state {
        position: relative;
        display: grid;
        place-items: center;
        gap: 0.75rem;
        min-height: 18rem;
        padding: 2rem;
        color: var(--muted);
        background: var(--toys-ink, #050308);
        clip-path: polygon(
            0 0,
            calc(100% - var(--toys-cut, 14px)) 0,
            100% var(--toys-cut, 14px),
            100% 100%,
            0 100%
        );
        filter: drop-shadow(var(--toys-shadow-lg, 7px 7px 0 #050308));
        /* Rim light along the ink plate's bottom inner edge. */
        box-shadow: inset 0 calc(-1 * var(--toys-rim-h, 2px)) 0 0 var(--toys-rim, color-mix(in srgb, #ffffff 18%, transparent));
        text-align: center;
    }

    /* Flat fill + halftone shade band, drawn inside the ink frame. */
    .empty-state::before {
        content: "";
        position: absolute;
        inset: var(--toys-bw-lg, 4px);
        background: color-mix(in srgb, var(--page-field-deep), #050308 34%);
        clip-path: polygon(
            0 0,
            calc(100% - max(var(--toys-cut, 14px) - var(--toys-bw-lg, 4px), 0px)) 0,
            100% max(var(--toys-cut, 14px) - var(--toys-bw-lg, 4px), 0px),
            100% 100%,
            0 100%
        );
    }

    .empty-state::after {
        content: "";
        position: absolute;
        inset: auto var(--toys-bw-lg, 4px) var(--toys-bw-lg, 4px);
        height: 0.6rem;
        background-color: color-mix(in srgb, var(--page-field-deep), #050308 calc(34% + var(--toys-shade-mix, 30%)));
        background-image:
            var(--toys-halftone),
            linear-gradient(color-mix(in srgb, var(--page-field-deep), #050308 calc(34% + var(--toys-shade-mix-2, 48%))) 0 0);
        background-size:
            var(--toys-halftone-size, 8px) var(--toys-halftone-size, 8px),
            100% 3px;
        background-position: 0 0, left bottom;
        background-repeat: repeat, no-repeat;
        pointer-events: none;
    }

    .empty-state > * {
        position: relative;
        z-index: 1;
    }

    .empty-state p {
        color: var(--ink);
        font-family: Goldman, 'Goldman Fallback', sans-serif;
        font-size: clamp(1.25rem, 4vw, 2rem);
    }

    .empty-state code {
        padding: 0.1rem 0.35rem;
        color: #ffda65;
        background: rgba(0, 0, 0, 0.4);
        border-radius: 0;
    }

    .empty-state a {
        position: relative;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        min-height: 2.75rem;
        padding: 0.45rem 0.75rem;
        color: var(--accent-ink);
        background: var(--accent);
        border: 3px solid var(--toys-ink, #050308);
        border-radius: 0;
        box-shadow: var(--toys-shadow-sm, 3px 3px 0 #050308);
        font-family: Goldman, 'Goldman Fallback', sans-serif;
        font-size: 0.875rem;
        font-weight: 800;
        transition:
            transform 140ms cubic-bezier(0.22, 1, 0.36, 1),
            box-shadow 140ms ease,
            background-color 140ms ease;
    }

    /* Specular strip along the button's top edge. */
    .empty-state a::before {
        content: "";
        position: absolute;
        inset: 0 0 auto;
        height: var(--toys-spec-h, 3px);
        background: var(--toys-spec, color-mix(in srgb, #ffffff 35%, transparent));
        pointer-events: none;
    }

    .empty-state a:focus-visible {
        outline: none;
        border-color: var(--accent);
        box-shadow:
            var(--toys-shadow-sm, 3px 3px 0 #050308),
            inset 0 0 0 2px var(--accent);
    }

    @media (hover: hover) {
        .empty-state a:hover {
            background: color-mix(in srgb, var(--accent), white 10%);
            transform: translate(-1px, -1px);
            box-shadow: 4px 4px 0 var(--toys-ink, #050308);
        }
    }

    @media (min-width: 22rem) {
        .toy-grid-item {
            flex-basis: calc(50% - 0.4rem);
            max-width: calc(50% - 0.4rem);
        }
    }

    @media (min-width: 48rem) {
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

    /* 4-up waits for ≥80rem: above 64rem the banner rail narrows the content
       column, and 4-up below 80rem crushes the meta chips. */
    @media (min-width: 80rem) and (orientation: landscape) {
        .toy-grid {
            gap: 0.9rem;
        }

        .toy-grid-item {
            flex-basis: calc(25% - 0.675rem);
            max-width: calc(25% - 0.675rem);
        }
    }

    @media (max-width: 47.999rem) {
        .toy-grid {
            align-items: flex-start;
        }

        .toy-grid-item :global(.toy-card) {
            height: auto;
        }
    }

    @media (prefers-reduced-motion: reduce) {
        .empty-state a {
            transition: none;
        }
    }
</style>
