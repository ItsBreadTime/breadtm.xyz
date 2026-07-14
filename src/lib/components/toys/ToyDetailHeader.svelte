<script lang="ts">
    let { name, faction }: { name?: string; faction?: string } = $props();
</script>

<header class="toy-detail-title">
    <a href="/toys" class="title-back-link" aria-label="Back to toy gallery">
        <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M19 12H5m6-6-6 6 6 6" />
        </svg>
    </a>
    <div class="title-plate">
        <h1>{name || 'Unnamed Toy'}</h1>
        {#if faction}<span>{faction}</span>{/if}
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

    .title-plate {
        display: grid;
        grid-template-columns: minmax(0, 1fr) auto;
        align-items: stretch;
        flex: 1 1 0;
        overflow: hidden;
        max-width: min(100%, 48rem);
        min-width: 0;
        border: 2px solid #050308;
        border-radius: 0.45rem;
        box-shadow: 0 5px 0 color-mix(in srgb, var(--detail-accent), #050308 28%);
    }

    h1 {
        overflow: hidden;
        min-width: 0;
        padding: 0.55rem 0.8rem;
        color: #050308;
        background: color-mix(in srgb, var(--detail-accent), white 50%);
        font-family: Goldman, sans-serif;
        font-size: clamp(1.15rem, 3vw, 2rem);
        font-weight: 800;
        line-height: 1;
        text-align: center;
        text-overflow: ellipsis;
        white-space: nowrap;
    }

    .title-plate span {
        display: grid;
        place-items: center;
        padding: 0.45rem 0.7rem;
        color: var(--detail-accent);
        background: #050308;
        border-left: 2px solid #050308;
        font-family: Goldman, sans-serif;
        font-size: clamp(0.72rem, 1.6vw, 0.9rem);
        font-weight: 800;
        line-height: 1;
        white-space: nowrap;
    }

    .title-back-link {
        display: inline-grid;
        place-items: center;
        flex: 0 0 auto;
        width: 2.75rem;
        height: 2.75rem;
        color: #050308;
        background: var(--detail-accent);
        border: 2px solid #050308;
        border-radius: 999px;
        box-shadow: 0 4px 0 rgba(0, 0, 0, 0.34);
        transition:
            transform 180ms cubic-bezier(0.22, 1, 0.36, 1),
            box-shadow 180ms ease;
    }

    .title-back-link svg {
        width: 1.35rem;
        height: 1.35rem;
        fill: none;
        stroke: currentColor;
        stroke-width: 3;
        stroke-linecap: round;
        stroke-linejoin: round;
        transform: translateX(-1px);
    }

    .title-back-link:hover {
        transform: translateY(-2px);
        box-shadow: 0 6px 0 rgba(0, 0, 0, 0.34);
    }

    @media (max-width: 640px) {
        .toy-detail-title {
            justify-content: flex-start;
            gap: 0.5rem;
        }

        h1 {
            font-size: 1.05rem;
            text-align: left;
        }
    }

    @media (max-width: 340px) {
        .toy-detail-title {
            gap: 0.42rem;
        }

        .title-plate span {
            padding-inline: 0.45rem;
            font-size: 0.68rem;
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
