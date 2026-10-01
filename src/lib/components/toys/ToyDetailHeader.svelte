<script lang="ts">
    let { name, backHref = '/toys' }: { name?: string; backHref?: string } = $props();
</script>

<header class="toy-detail-title">
    <a href={backHref} class="title-back-link" aria-label="Back to toy gallery">
        <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M19 12H5m6-6-6 6 6 6" />
        </svg>
    </a>
    <div class="title-plate">
        <h1>{name || 'Unnamed Toy'}</h1>
    </div>
</header>

<style>
    .toy-detail-title {
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 0.7rem;
        width: 100%;
        min-width: 0;
    }

    /* The title plate is an ink frame with a chamfered top-right corner. */
    .title-plate {
        display: grid;
        flex: 1 1 0;
        max-width: min(100%, 48rem);
        min-width: 0;
        padding: var(--toys-bw-lg, 4px);
        background: var(--toys-ink, #050308);
        clip-path: polygon(
            0 0,
            calc(100% - var(--toys-cut, 14px)) 0,
            100% var(--toys-cut, 14px),
            100% 100%,
            0 100%
        );
        /* Sticker offset: accent under-stroke, then the hard ink offset. */
        filter:
            drop-shadow(3px 3px 0 var(--detail-accent, #f05278))
            drop-shadow(var(--toys-shadow-md, 5px 5px 0 #050308));
    }

    h1 {
        position: relative;
        overflow: hidden;
        min-width: 0;
        padding: 0.55rem 0.8rem calc(0.55rem + 0.45rem);
        color: var(--toys-ink, #050308);
        background: var(--detail-accent);
        font-family: Goldman, 'Goldman Fallback', sans-serif;
        font-size: clamp(1.15rem, 3vw, 2rem);
        font-weight: 800;
        line-height: 1.25;
        text-align: center;
        overflow-wrap: anywhere;
        white-space: normal;
        /* Cel title shade: hard offset of darkened accent behind the letters.
           Cut below 640px where the size drop makes it muddy. */
        text-shadow: 2px 2px 0 color-mix(in srgb, var(--detail-accent), var(--toys-ink, #050308) 45%);
    }

    /* Specular strip along the title's top edge. */
    h1::before {
        content: "";
        position: absolute;
        inset: 0 0 auto;
        height: var(--toys-spec-h, 3px);
        background: var(--toys-spec, color-mix(in srgb, #ffffff 35%, transparent));
        pointer-events: none;
    }

    /* Shade band along the title's bottom edge: darkened accent, halftone dots. */
    h1::after {
        content: "";
        position: absolute;
        inset: auto 0 0;
        height: 0.45rem;
        background-color: color-mix(in srgb, var(--detail-accent), var(--toys-ink, #050308) 22%);
        background-image: var(--toys-halftone);
        background-size: var(--toys-halftone-size, 8px) var(--toys-halftone-size, 8px);
        pointer-events: none;
    }

    .title-back-link {
        position: relative;
        display: inline-grid;
        place-items: center;
        flex: 0 0 auto;
        width: 2.75rem;
        height: 2.75rem;
        padding: 0.4rem;
        color: #050308;
        background: var(--detail-accent);
        border: 3px solid var(--toys-ink, #050308);
        border-radius: 0;
        box-shadow: var(--toys-shadow-sm, 3px 3px 0 #050308);
        transition:
            transform 140ms cubic-bezier(0.22, 1, 0.36, 1),
            border-color 140ms ease,
            box-shadow 140ms ease;
    }

    /* Specular strip along the button's top edge. */
    .title-back-link::before {
        content: "";
        position: absolute;
        inset: 0 0 auto;
        height: var(--toys-spec-h, 3px);
        background: var(--toys-spec, color-mix(in srgb, #ffffff 35%, transparent));
        pointer-events: none;
    }

    /* Shade line along the button's bottom edge. */
    .title-back-link::after {
        content: "";
        position: absolute;
        inset: auto 0 0;
        height: var(--toys-rim-h, 2px);
        background: color-mix(in srgb, var(--detail-accent), var(--toys-ink, #050308) 30%);
        pointer-events: none;
    }

    .title-back-link svg {
        width: 1.35rem;
        height: 1.35rem;
        fill: none;
        stroke: currentColor;
        stroke-width: 3;
        stroke-linecap: square;
        stroke-linejoin: miter;
        transform: translateX(-1px);
    }

    .title-back-link:focus-visible {
        outline: none;
        border-color: var(--detail-ink);
    }

    @media (hover: hover) {
        .title-back-link:hover {
            transform: translate(-1px, -1px);
            box-shadow: 4px 4px 0 var(--toys-ink, #050308);
        }
    }

    @media (max-width: 640px) {
        .toy-detail-title {
            justify-content: flex-start;
            gap: 0.5rem;
        }

        h1 {
            font-size: 1.05rem;
            text-align: left;
            text-shadow: none;
        }
    }

    @media (max-width: 340px) {
        .toy-detail-title {
            gap: 0.42rem;
        }

        h1 {
            padding-inline: 0.55rem;
            font-size: 0.92rem;
        }
    }

    @media (prefers-reduced-motion: reduce) {
        .title-back-link {
            transition: none;
        }
    }
</style>
