<script lang="ts">
    const { shown, total }: { shown: number; total: number } = $props();
</script>

<section class="toys-hero">
    <div class="hero-panel">
        <div class="hero-title-row">
            <h1 class="font-accent">Toy Shelf</h1>
            <div class="shelf-readout" aria-live="polite" aria-atomic="true">
                <span aria-hidden="true" class="tabular-nums">{shown}</span>
                <span aria-hidden="true">/ {total}</span>
                <span class="sr-only">{shown} of {total} toys shown</span>
            </div>
        </div>
    </div>
</section>

<style>
    .toys-hero {
        padding: clamp(1.1rem, 3.2vw, 2.3rem) 0 clamp(0.65rem, 2vw, 1rem);
    }

    .hero-panel {
        position: relative;
        isolation: isolate;
        overflow: visible;
        padding: clamp(0.7rem, 1.7vw, 1.1rem);
        background: color-mix(in srgb, var(--page-field-deep), #050308 18%);
        border: var(--site-outline-width, 4px) solid var(--site-outline, #050308);
        border-radius: var(--site-radius, 0.65rem);
        box-shadow: 0 var(--site-shadow-offset, 0.5rem) 0 var(--site-outline, #050308);
    }

    .hero-title-row {
        display: flex;
        align-items: end;
        justify-content: space-between;
        gap: 1rem;
    }

    h1 {
        display: inline-block;
        padding: 0.14em 0.24em 0.12em;
        color: var(--accent-ink);
        background: var(--accent);
        border: 4px solid var(--site-outline, #050308);
        border-radius: 0.45rem;
        box-shadow: 0.12em 0.12em 0 var(--site-outline, #050308);
        font-size: clamp(2.35rem, 7vw, 5.2rem);
        line-height: 0.92;
        letter-spacing: 0;
        text-wrap: balance;
    }

    .shelf-readout {
        display: inline-flex;
        align-items: baseline;
        gap: 0.28rem;
        flex: 0 0 auto;
        padding: 0.42rem 0.62rem;
        color: var(--accent-ink);
        background: var(--accent);
        border: 3px solid var(--site-outline, #050308);
        border-radius: 0.55rem;
        box-shadow: 0 4px 0 #050308;
        font-family: Goldman, sans-serif;
    }

    .shelf-readout span:first-child {
        font-size: clamp(1.15rem, 3vw, 1.65rem);
        line-height: 1;
    }

    .shelf-readout span:last-child {
        font-size: 0.78rem;
    }

    @media (max-width: 720px) {
        .toys-hero {
            padding: 0.75rem 0 0.45rem;
        }

        .hero-title-row {
            align-items: center;
            gap: 0.65rem;
        }

        h1 {
            font-size: clamp(1.9rem, 10vw, 2.55rem);
            white-space: nowrap;
        }

        .shelf-readout {
            padding: 0.38rem 0.55rem;
            box-shadow: 0 4px 0 rgba(0, 0, 0, 0.32);
        }

        .shelf-readout span:first-child {
            font-size: 1.05rem;
        }

        .shelf-readout span:last-child {
            font-size: 0.875rem;
        }
    }

    @media (min-width: 48rem) and (max-width: 99.999rem) {
        .toys-hero {
            padding: 0.9rem 0 0.55rem;
        }

        .hero-panel {
            padding: 0.7rem;
        }

        h1 {
            font-size: clamp(2.5rem, 5.5vw, 3.75rem);
        }
    }
</style>
