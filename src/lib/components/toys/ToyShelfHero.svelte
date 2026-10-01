<script lang="ts">
    const { shown, total, filtered = false }: { shown: number; total: number; filtered?: boolean } = $props();
</script>

<section class="toys-hero">
    <h1 class="hero-stamp font-accent"><span class="hero-stamp-fill">Toy Shelf</span></h1>
    <!-- At rest the count is a quiet label; the readout plate only appears
         while a filter or search narrows the shelf. -->
    <div class="shelf-status" aria-live="polite" aria-atomic="true">
        {#if filtered}
            <div class="shelf-readout">
                <div class="shelf-readout-fill">
                    <span aria-hidden="true" class="tabular-nums">{shown}</span>
                    <span aria-hidden="true">/ {total}</span>
                    <span class="sr-only">{shown} of {total} toys shown</span>
                </div>
            </div>
        {:else}
            <p class="shelf-count"><span class="tabular-nums">{total}</span> {total === 1 ? 'toy' : 'toys'}</p>
        {/if}
    </div>
</section>

<style>
    .toys-hero {
        display: flex;
        align-items: end;
        justify-content: space-between;
        gap: 1rem;
        padding: clamp(0.9rem, 2.6vw, 1.9rem) 0 clamp(0.75rem, 1.8vw, 1.1rem);
    }

    /* The stamp: an ink plate with a chamfered corner and a hard offset. */
    .hero-stamp {
        display: block;
        transform-origin: 30% 60%;
        /* Limited animation: the stamp slams down in a few held frames
           (stepped, like animating on twos) instead of a smooth ease. */
        animation: stamp-slam 420ms steps(2, jump-end) backwards;
        margin: 0;
        padding: var(--toys-bw-xl, 5px);
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
            drop-shadow(3px 3px 0 var(--accent, #ff4f9a))
            drop-shadow(var(--toys-shadow-lg, 7px 7px 0 #050308));
    }

    .hero-stamp-fill {
        position: relative;
        display: inline-block;
        padding: 0.14em 0.24em calc(0.12em + 0.1em);
        color: var(--accent-ink);
        background: var(--accent);
        clip-path: polygon(
            0 0,
            calc(100% - max(var(--toys-cut, 14px) - var(--toys-bw-xl, 5px), 0px)) 0,
            100% max(var(--toys-cut, 14px) - var(--toys-bw-xl, 5px), 0px),
            100% 100%,
            0 100%
        );
        font-size: clamp(2.35rem, 7vw, 5.2rem);
        line-height: 0.92;
        letter-spacing: 0;
        text-wrap: balance;
        /* Cel title shade: hard offset of darkened accent behind the letters. */
        text-shadow: 0.06em 0.06em 0 color-mix(in srgb, var(--accent), var(--toys-ink, #050308) 45%);
    }

    /* Specular strip: flat light edge along the top of the stamp. */
    .hero-stamp-fill::before {
        content: "";
        position: absolute;
        inset: 0 0 auto;
        height: var(--toys-spec-h, 3px);
        background: var(--toys-spec, color-mix(in srgb, #ffffff 35%, transparent));
        pointer-events: none;
    }

    /* Shade band along the stamp's bottom edge: darkened accent, halftone dots. */
    .hero-stamp-fill::after {
        content: "";
        position: absolute;
        inset: auto 0 0;
        height: 0.1em;
        background-color: color-mix(in srgb, var(--accent), var(--toys-ink, #050308) 22%);
        background-image: var(--toys-halftone);
        background-size: var(--toys-halftone-size, 8px) var(--toys-halftone-size, 8px);
        pointer-events: none;
    }

    .shelf-status {
        flex: 0 0 auto;
    }

    .shelf-count {
        margin: 0;
        padding-bottom: 0.2rem;
        color: var(--muted, #eaf5ff);
        font-family: Goldman, 'Goldman Fallback', sans-serif;
        font-size: 0.95rem;
        letter-spacing: 0.08em;
        line-height: 1.4;
        text-transform: uppercase;
        /* Same cel offset as the title, one size down. */
        text-shadow: 2px 2px 0 var(--toys-ink, #050308);
    }

    .shelf-count span {
        color: var(--accent, #ff4f9a);
        font-size: 1.35em;
    }

    @keyframes stamp-slam {
        0% {
            opacity: 0;
            transform: translate(-0.4rem, -0.8rem) scale(1.22) rotate(-4deg);
        }
        45% {
            opacity: 1;
            transform: translate(0, 0.1rem) scale(0.95) rotate(1deg);
        }
        75% {
            transform: scale(1.03) rotate(-0.5deg);
        }
        100% {
            opacity: 1;
            transform: none;
        }
    }

    @keyframes readout-pop {
        0% {
            transform: scale(0.8);
        }
        50% {
            transform: scale(1.08);
        }
        100% {
            transform: none;
        }
    }

    @media (prefers-reduced-motion: reduce) {
        .hero-stamp,
        .shelf-readout {
            animation: none;
        }
    }

    .shelf-readout {
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
            drop-shadow(2px 2px 0 var(--accent, #ff4f9a))
            drop-shadow(var(--toys-shadow-md, 5px 5px 0 #050308));
        font-family: Goldman, 'Goldman Fallback', sans-serif;
        animation: readout-pop 240ms steps(2, jump-end) backwards;
    }

    .shelf-readout-fill {
        position: relative;
        display: inline-flex;
        align-items: baseline;
        gap: 0.28rem;
        padding: 0.42rem 0.62rem;
        color: var(--ink);
        background: color-mix(in srgb, var(--page-field-deep), #050308 18%);
        clip-path: polygon(
            0 0,
            calc(100% - max(var(--toys-cut, 14px) - var(--toys-bw-lg, 4px), 0px)) 0,
            100% max(var(--toys-cut, 14px) - var(--toys-bw-lg, 4px), 0px),
            100% 100%,
            0 100%
        );
    }

    /* Shade wedge: flat darker triangle, bottom-right, halftone-dotted. */
    .shelf-readout-fill::after {
        content: "";
        position: absolute;
        right: 0;
        bottom: 0;
        width: 2.6rem;
        height: 1.5rem;
        background-color: color-mix(in srgb, var(--page-field-deep), #050308 calc(18% + var(--toys-shade-mix, 22%)));
        background-image: var(--toys-halftone);
        background-size: var(--toys-halftone-size, 8px) var(--toys-halftone-size, 8px);
        clip-path: polygon(100% 0, 100% 100%, 0 100%);
        pointer-events: none;
    }

    .shelf-readout-fill > span {
        position: relative;
        z-index: 1;
    }

    .shelf-readout-fill span:first-child {
        font-size: clamp(1.15rem, 3vw, 1.65rem);
        line-height: 1;
    }

    .shelf-readout-fill span:nth-child(2) {
        font-size: 0.78rem;
    }

    @media (max-width: 720px) {
        .toys-hero {
            align-items: center;
            gap: 0.65rem;
            padding: 0.65rem 0 0.5rem;
        }

        .hero-stamp {
            filter:
                drop-shadow(2px 2px 0 var(--accent, #ff4f9a))
                drop-shadow(4px 4px 0 #050308);
        }

        .hero-stamp-fill {
            font-size: clamp(1.9rem, 10vw, 2.55rem);
            white-space: nowrap;
        }

        .shelf-readout {
            filter: drop-shadow(3px 3px 0 #050308);
        }

        .shelf-readout-fill {
            padding: 0.38rem 0.55rem;
        }

        .shelf-readout-fill span:first-child {
            font-size: 1.05rem;
        }

        .shelf-readout-fill span:nth-child(2) {
            font-size: 0.875rem;
        }
    }

    @media (min-width: 48rem) and (max-width: 99.999rem) {
        .hero-stamp-fill {
            font-size: clamp(2.5rem, 5.5vw, 3.75rem);
        }
    }
</style>
