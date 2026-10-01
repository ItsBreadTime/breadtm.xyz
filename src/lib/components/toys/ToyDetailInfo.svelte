<script lang="ts">
    import type { Component, Snippet } from 'svelte';

    let {
        slug = '',
        year,
        faction,
        description,
        notes: Notes,
        gallery
    }: {
        slug?: string;
        year?: string;
        faction?: string;
        description?: string;
        notes?: Component;
        gallery?: Snippet;
    } = $props();

    // Empty-state captions, one narrator line picked by slug so a toy always
    // gets the same one (stable across reloads and between SSR and hydration).
    const captions = [
        { kicker: 'Actually...', line: 'turns out it was all just a dream!' },
        { kicker: 'Uhhhhh...', line: 'something fell, will look into it.' },
        { kicker: 'Our story so far...', line: 'nothing yet. This one is still under observation.' },
        { kicker: 'Little did we know...', line: "this chapter hadn't been written yet." },
        { kicker: 'Later that week...', line: 'the dossier is still on the drafting table.' }
    ];
    const caption = $derived(captions[[...slug].reduce((sum, char) => sum + char.charCodeAt(0), 0) % captions.length]);
</script>

<div class="detail-panel">
    <div class="panel-band" aria-hidden="true"></div>
    <dl class="meta-list">
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
            <div>{@html description}</div>
        </div>
    {/if}
</div>

{#if gallery}
    {@render gallery()}
{/if}

<div class="notes-panel prose prose-sm sm:prose-base max-w-none" class:is-empty={!Notes}>
    <div class="panel-band" aria-hidden="true"></div>
    {#if Notes}
        <div class="prose-content-wrapper">
            <Notes />
        </div>
    {:else}
        <div class="notes-empty">
            <div class="notes-caption">
                <span class="notes-caption-kicker">{caption.kicker}</span>
                <span class="notes-caption-line">{caption.line}</span>
            </div>
        </div>
    {/if}
</div>

<style lang="postcss">
    .prose {
        --tw-prose-body: var(--detail-ink);
        --tw-prose-headings: var(--detail-ink);
        --tw-prose-lead: var(--detail-muted);
        --tw-prose-links: var(--detail-accent);
        --tw-prose-bold: var(--detail-ink);
        --tw-prose-counters: var(--detail-accent);
        --tw-prose-bullets: var(--detail-accent);
        --tw-prose-hr: var(--toys-ink, #050308);
        --tw-prose-quotes: var(--detail-muted);
        --tw-prose-quote-borders: var(--detail-accent);
        --tw-prose-captions: var(--detail-muted);
        --tw-prose-code: #ffda65;
        --tw-prose-pre-code: var(--detail-ink);
        --tw-prose-pre-bg: var(--toys-ink, #050308);
        --tw-prose-th-borders: var(--toys-ink, #050308);
        --tw-prose-td-borders: var(--toys-ink, #050308);
    }

    .detail-panel,
    .notes-panel {
        position: relative;
        color: var(--detail-ink);
        background: color-mix(in srgb, var(--detail-field-deep), #050308 25%);
        border: 3px solid var(--toys-ink, #050308);
        border-radius: 0;
        box-shadow: var(--toys-shadow-md, 5px 5px 0 #050308);
    }

    .detail-panel {
        /* Interior separators are grooves, not ink outlines: a step lighter
           than the panel background. */
        --panel-line: color-mix(in srgb, color-mix(in srgb, var(--detail-field-deep), #050308 25%), #ffffff 12%);
        overflow: hidden;
        padding: clamp(0.75rem, 1.8vw, 1rem);
        padding-bottom: calc(clamp(0.75rem, 1.8vw, 1rem) + 0.6rem);
    }

    /* Dossier band: a thin unlabeled ink strip, full-bleed across the panel's
       top. The 2px accent step along its bottom edge reads as the band being
       bolted onto the panel. */
    .panel-band {
        height: 0.5rem;
        margin: calc(clamp(0.75rem, 1.8vw, 1rem) * -1);
        margin-bottom: 0.62rem;
        background: var(--toys-ink, #050308);
        box-shadow: inset 0 -2px 0 color-mix(in srgb, var(--detail-accent), var(--toys-ink, #050308) 25%);
    }

    /* Stepped shade band along the panel's bottom inner edge: halftone band
       (step 1) with a solid deep strip (step 2) at the very bottom. */
    .detail-panel::after,
    .notes-panel::after {
        content: "";
        position: absolute;
        inset: auto 0 0;
        height: 0.6rem;
        background-color: color-mix(in srgb, var(--detail-field-deep), #050308 calc(25% + var(--toys-shade-mix, 30%)));
        background-image:
            var(--toys-halftone),
            linear-gradient(color-mix(in srgb, var(--detail-field-deep), #050308 calc(25% + var(--toys-shade-mix-2, 48%))) 0 0);
        background-size:
            var(--toys-halftone-size, 8px) var(--toys-halftone-size, 8px),
            100% 3px;
        background-position: 0 0, left bottom;
        background-repeat: repeat, no-repeat;
        pointer-events: none;
    }

    /* Corner shade wedge rising off the band, bottom-right. */
    .detail-panel::before,
    .notes-panel::before {
        content: "";
        position: absolute;
        right: 0;
        bottom: 0.6rem;
        width: min(28%, 4.5rem);
        height: 2rem;
        background-color: color-mix(in srgb, var(--detail-field-deep), #050308 calc(25% + var(--toys-shade-mix, 30%)));
        background-image: var(--toys-halftone);
        background-size: var(--toys-halftone-size, 8px) var(--toys-halftone-size, 8px);
        clip-path: polygon(100% 0, 100% 100%, 0 100%);
        pointer-events: none;
    }

    .meta-list {
        position: relative;
        z-index: 1;
        display: flex;
        flex-wrap: wrap;
        align-items: center;
        border-block: 2px solid var(--panel-line, var(--toys-ink, #050308));
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
        border-left: 2px solid var(--panel-line, var(--toys-ink, #050308));
    }

    dt {
        display: block;
        color: var(--detail-muted);
        font-size: 0.72rem;
        font-weight: 750;
        letter-spacing: 0.12em;
        text-transform: uppercase;
    }

    dd {
        overflow-wrap: anywhere;
        color: var(--detail-accent);
        font-family: Goldman, 'Goldman Fallback', sans-serif;
        font-size: 0.92rem;
        font-weight: 800;
        line-height: 1.05;
    }

    .detail-description {
        position: relative;
        z-index: 1;
        margin-top: 0.62rem;
        padding-top: 0.58rem;
        color: var(--detail-muted);
        border-top: 2px solid var(--panel-line, var(--toys-ink, #050308));
    }

    .detail-description div {
        max-width: 68ch;
        color: var(--detail-ink);
        font-size: 0.98rem;
        font-weight: 400;
        line-height: 1.55;
        text-wrap: pretty;
    }

    .notes-panel {
        flex: 1 1 auto;
        min-height: 0;
        padding: clamp(0.75rem, 1.8vw, 1rem);
        padding-bottom: calc(clamp(0.75rem, 1.8vw, 1rem) + 0.6rem);
        overflow: auto;
    }

    .prose-content-wrapper {
        position: relative;
        z-index: 1;
    }

    .prose-content-wrapper :global(*:first-child) {
        margin-top: 0;
    }

    .prose-content-wrapper :global(*:last-child) {
        margin-bottom: 0;
    }

    .notes-panel :global(h1),
    .notes-panel :global(h2),
    .notes-panel :global(h3) {
        color: var(--detail-ink);
        font-family: Goldman, 'Goldman Fallback', sans-serif;
        letter-spacing: 0;
    }

    /* Empty state: one comic narrator caption, sized to its line. */
    .notes-panel.is-empty {
        flex: 0 0 auto;
        overflow: hidden;
    }

    .notes-empty {
        position: relative;
        z-index: 1;
    }

    .notes-caption {
        max-width: 26rem;
        padding: 0.6rem 0.85rem 0.7rem;
        color: #1a1208;
        background: #ffda65;
        border: 3px solid var(--toys-ink, #050308);
        box-shadow: var(--toys-shadow-sm, 3px 3px 0 #050308);
    }

    .notes-caption-kicker {
        display: block;
        margin-bottom: 0.2rem;
        font-family: Goldman, 'Goldman Fallback', sans-serif;
        font-size: 0.95rem;
        font-weight: 800;
    }

    .notes-caption-line {
        display: block;
        font-size: 1rem;
        font-weight: 600;
        line-height: 1.4;
        text-wrap: pretty;
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
        border-bottom: 2px solid var(--toys-ink, #050308);
        letter-spacing: 0.02em;
    }

    .prose :global(h1) {
        font-size: 2em;
    }

    .prose :global(p) {
        margin-bottom: 1.2em;
        line-height: 1.7;
    }

    .prose :global(a) {
        padding: 0 0.15em;
        border-bottom: 1px dotted color-mix(in srgb, var(--detail-accent), transparent 50%);
        text-decoration: none;
        transition: border-color 140ms ease, background-color 140ms ease;
    }

    .prose :global(a:hover) {
        background-color: color-mix(in srgb, var(--detail-accent), transparent 82%);
        border-bottom-color: var(--detail-accent);
        border-bottom-style: solid;
    }

    .prose :global(img) {
        margin-block: theme(margin.4);
        border: 3px solid var(--toys-ink, #050308);
        border-radius: 0;
        box-shadow: var(--toys-shadow-sm, 3px 3px 0 #050308);
    }

    .prose :global(code):not(pre code) {
        padding: 0.2em 0.4em;
        color: #ffda65;
        background-color: var(--toys-ink, #050308);
        border-radius: 0;
        font-size: 0.9em;
    }

    .prose :global(pre) {
        border: 2px solid var(--toys-ink, #050308);
        border-radius: 0;
        box-shadow: var(--toys-shadow-sm, 3px 3px 0 #050308);
    }

    .prose :global(blockquote) {
        padding: 0.75em 1em;
        background-color: color-mix(in srgb, var(--detail-field-deep), #050308 20%);
        border: 2px solid var(--toys-ink, #050308);
        border-radius: 0;
        font-style: italic;
    }

    .prose :global(ul) {
        margin-left: 1em;
    }

    .prose :global(li) {
        margin-bottom: 0.3em;
    }

    .prose :global(li::marker) {
        color: var(--detail-accent);
    }

    @media (max-width: 640px) {
        .detail-panel {
            padding: 0.72rem;
            padding-bottom: calc(0.72rem + 0.6rem);
        }

        .detail-panel .panel-band {
            margin: -0.72rem -0.72rem 0.55rem;
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
            line-height: 1.2;
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
        .meta-list {
            grid-template-columns: repeat(2, minmax(0, 1fr));
        }

        .meta-row:nth-child(odd) {
            border-left: 0;
        }
    }

    @media (prefers-reduced-motion: reduce) {
        .prose :global(a) {
            transition: none;
        }
    }
</style>
