<script lang="ts">
    import type { Snippet } from 'svelte';

    let {
        series,
        year,
        faction,
        description,
        content
    }: {
        series?: string;
        year?: string;
        faction?: string;
        description?: string;
        content?: Snippet;
    } = $props();
</script>

<div class="detail-panel">
    <dl class="meta-list">
        {#if series}
            <div class="meta-row">
                <dt>Series</dt>
                <dd>{series}</dd>
            </div>
        {/if}
        {#if year}
            <div class="meta-row">
                <dt>Year</dt>
                <dd>{year}</dd>
            </div>
        {/if}
        {#if faction}
            <div class="meta-row">
                <dt>Faction</dt>
                <dd>{faction}</dd>
            </div>
        {/if}
    </dl>
    {#if description}
        <div class="detail-description">
            <span>Description</span>
            <div>{@html description}</div>
        </div>
    {/if}
</div>

<div class="notes-panel prose prose-sm sm:prose-base max-w-none">
    <div class="prose-content-wrapper">
        {#if content}
            {@render content()}
        {:else}
            <p class="text-gray-400 italic py-4">No additional content available for this toy.</p>
        {/if}
    </div>
</div>

<style lang="postcss">
    .prose {
        --tw-prose-body: theme(colors.gray.300);
        --tw-prose-headings: theme(colors.rose.300);
        --tw-prose-lead: theme(colors.gray.400);
        --tw-prose-links: theme(colors.sky.400);
        --tw-prose-bold: theme(colors.gray.100);
        --tw-prose-counters: theme(colors.gray.400);
        --tw-prose-bullets: theme(colors.rose.400);
        --tw-prose-hr: theme(colors.gray.700);
        --tw-prose-quotes: theme(colors.gray.200);
        --tw-prose-quote-borders: theme(colors.rose.400);
        --tw-prose-captions: theme(colors.gray.400);
        --tw-prose-code: theme(colors.amber.300);
        --tw-prose-pre-code: theme(colors.gray.300);
        --tw-prose-pre-bg: theme(colors.gray.900);
        --tw-prose-th-borders: theme(colors.gray.600);
        --tw-prose-td-borders: theme(colors.gray.700);
    }

    .detail-panel,
    .notes-panel {
        position: relative;
        overflow: hidden;
        color: var(--detail-ink);
        background: #07050d;
        border: 2px solid color-mix(in srgb, var(--detail-accent), transparent 42%);
        border-radius: 0.45rem;
    }

    .detail-panel::before,
    .notes-panel::before {
        content: "";
        position: absolute;
        inset: 0 0 auto;
        height: 0.18rem;
        background: var(--detail-accent);
        opacity: 0.62;
        pointer-events: none;
    }

    .detail-panel {
        padding: clamp(0.75rem, 1.8vw, 1rem);
    }

    .meta-list {
        position: relative;
        z-index: 1;
        display: flex;
        flex-wrap: wrap;
        align-items: center;
        border-block: 2px solid color-mix(in srgb, var(--detail-accent), transparent 38%);
    }

    .meta-row {
        display: inline-flex;
        align-items: baseline;
        gap: 0.42rem;
        flex: 1 1 auto;
        min-width: 0;
        padding: 0.42rem 0.72rem;
    }

    .meta-row + .meta-row {
        border-left: 1px solid color-mix(in srgb, var(--detail-accent), transparent 54%);
    }

    dt,
    .detail-description span {
        display: block;
        color: color-mix(in srgb, var(--detail-muted), white 4%);
        font-size: 0.72rem;
        font-weight: 700;
    }

    dd {
        overflow-wrap: anywhere;
        color: var(--detail-ink);
        font-family: Goldman, sans-serif;
        font-size: 0.92rem;
        line-height: 1.05;
    }

    .detail-description {
        position: relative;
        z-index: 1;
        margin-top: 0.62rem;
        padding-top: 0.58rem;
        color: var(--detail-muted);
        border-top: 1px solid color-mix(in srgb, var(--detail-accent), transparent 66%);
    }

    .detail-description div {
        max-width: 68ch;
        color: var(--detail-ink);
        font-size: 0.98rem;
        line-height: 1.55;
        text-wrap: pretty;
    }

    .notes-panel {
        flex: 1 1 auto;
        min-height: 0;
        padding: clamp(0.75rem, 1.8vw, 1rem);
        overflow: auto;
    }

    .prose-content-wrapper {
        position: relative;
        z-index: 1;
    }

    .notes-panel :global(*:first-child) {
        margin-top: 0;
    }

    .notes-panel :global(*:last-child) {
        margin-bottom: 0;
    }

    .notes-panel :global(h1),
    .notes-panel :global(h2),
    .notes-panel :global(h3) {
        color: var(--detail-ink);
        font-family: Goldman, sans-serif;
        letter-spacing: 0;
    }

    .notes-panel :global(p) {
        color: var(--detail-muted);
        line-height: 1.65;
        text-wrap: pretty;
    }

    .prose :global(h1),
    .prose :global(h2),
    .prose :global(h3),
    .prose :global(h4),
    .prose :global(h5),
    .prose :global(h6) {
        margin-top: theme(margin.5);
        margin-bottom: theme(margin.3);
        padding-bottom: theme(padding.2);
        border-bottom: 1px solid theme(colors.gray.700);
        letter-spacing: 0.02em;
    }

    .prose :global(h1) {
        color: theme(colors.rose.200);
        font-size: 2em;
    }

    .prose :global(p) {
        margin-bottom: 1.2em;
        line-height: 1.7;
    }

    .prose :global(a) {
        padding: 0 0.15em;
        border-bottom: 1px dotted theme(colors.sky.400 / 0.5);
        text-decoration: none;
        transition: all 0.2s ease-in-out;
    }

    .prose :global(a:hover) {
        color: theme(colors.sky.300);
        background-color: theme(colors.sky.900 / 0.2);
        border-bottom-color: theme(colors.sky.300 / 0.8);
        border-bottom-style: solid;
    }

    .prose :global(img) {
        margin-block: theme(margin.4);
        border: 2px solid theme(colors.gray.700);
        border-radius: theme(borderRadius.lg);
        box-shadow: theme(boxShadow.lg);
    }

    .prose :global(code):not(pre code) {
        padding: 0.2em 0.4em;
        color: theme(colors.amber.300);
        background-color: theme(colors.gray.700);
        border-radius: theme(borderRadius.md);
        font-size: 0.9em;
    }

    .prose :global(pre) {
        border: 1px solid theme(colors.gray.700);
        border-radius: theme(borderRadius.md);
        box-shadow: theme(boxShadow.md);
    }

    .prose :global(blockquote) {
        padding: 0.75em 1em;
        background-color: theme(colors.gray.800 / 0.5);
        border-left-width: 4px;
        border-radius: 0 theme(borderRadius.md) theme(borderRadius.md) 0;
        font-style: italic;
    }

    .prose :global(ul) {
        margin-left: 1em;
    }

    .prose :global(li) {
        margin-bottom: 0.3em;
    }

    .prose :global(li::marker) {
        color: theme(colors.rose.400);
    }

    @media (max-width: 640px) {
        .detail-panel {
            padding: 0.72rem;
        }

        .meta-list {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(6.2rem, 1fr));
            align-items: stretch;
        }

        .meta-row {
            display: flex;
            flex-direction: column;
            align-items: flex-start;
            justify-content: center;
            gap: 0.18rem;
            padding: 0.48rem 0.5rem;
        }

        dt {
            font-size: 0.66rem;
            line-height: 1;
        }

        dd {
            max-width: 100%;
            font-size: clamp(0.76rem, 3.5vw, 0.9rem);
            line-height: 1;
            white-space: nowrap;
        }

        .detail-description {
            margin-top: 0.55rem;
            padding-top: 0.55rem;
        }

        .detail-description div {
            font-size: 0.95rem;
            line-height: 1.48;
        }
    }

    @media (max-width: 340px) {
        .detail-panel,
        .notes-panel {
            border-radius: 0.45rem;
        }

        .meta-list {
            grid-template-columns: repeat(2, minmax(0, 1fr));
        }

        .meta-row:nth-child(odd) {
            border-left: 0;
        }

        .meta-row:nth-child(3) {
            grid-column: 1 / -1;
            border-top: 1px solid color-mix(in srgb, var(--detail-accent), transparent 54%);
        }
    }

    @media (prefers-reduced-motion: reduce) {
        .prose :global(a) {
            transition: none;
        }
    }
</style>
