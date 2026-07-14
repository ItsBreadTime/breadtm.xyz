<script lang="ts">
    import { getBestImage } from '$lib/toys/filtering';
    import type { Toy } from '$lib/toys/types';
    import ToyItem from './ToyItem.svelte';

    let {
        toys,
        total,
        images,
        emptyMessage,
        onreset
    }: {
        toys: Toy[];
        total: number;
        images: Record<string, string[]>;
        emptyMessage: string;
        onreset: () => void;
    } = $props();
</script>

{#if toys.length > 0}
    <section class="toy-grid" aria-label={`Filtered toy collection, ${toys.length} items`}>
        {#each toys as toy, index (toy.slug)}
            <div class="toy-grid-item">
                <ToyItem
                    name={toy.name}
                    image={getBestImage(toy)}
                    slug={toy.slug}
                    faction={toy.faction}
                    series={toy.series}
                    description={toy.description}
                    year={toy.year}
                    hasImages={!!images[toy.slug]?.length}
                    imageFiles={images[toy.slug] || []}
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
        justify-content: center;
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

    .empty-state {
        display: grid;
        place-items: center;
        gap: 0.75rem;
        min-height: 18rem;
        padding: 2rem;
        color: var(--muted);
        background: color-mix(in srgb, var(--page-field-deep), #050308 34%);
        border: var(--site-outline-width, 4px) solid var(--site-outline, #050308);
        border-radius: var(--site-radius, 0.65rem);
        box-shadow: 0 0.45rem 0 var(--site-outline, #050308);
        text-align: center;
    }

    .empty-state p {
        color: var(--ink);
        font-family: Goldman, sans-serif;
        font-size: clamp(1.25rem, 4vw, 2rem);
    }

    .empty-state code {
        padding: 0.1rem 0.35rem;
        color: #ffda65;
        background: rgba(0, 0, 0, 0.4);
        border-radius: 0.35rem;
    }

    .empty-state a {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        min-height: 2.75rem;
        padding: 0.45rem 0.75rem;
        color: var(--accent-ink);
        background: var(--accent);
        border: 2px solid #050308;
        border-radius: 999px;
        box-shadow: 0 4px 0 #050308;
        font-family: Goldman, sans-serif;
        font-size: 0.875rem;
        font-weight: 800;
        transition:
            transform 180ms cubic-bezier(0.22, 1, 0.36, 1),
            background-color 180ms ease;
    }

    .empty-state a:focus-visible {
        outline: 3px solid color-mix(in srgb, var(--accent), white 15%);
        outline-offset: 3px;
    }

    @media (hover: hover) {
        .empty-state a:hover {
            background: color-mix(in srgb, var(--accent), white 10%);
            transform: translateY(-1px);
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

    @media (min-width: 64rem) and (orientation: landscape) {
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
