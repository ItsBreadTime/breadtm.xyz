<script lang="ts">
    import { getFactionTheme } from '$lib/toys/factions';

    let { faction = '' }: { faction?: string } = $props();
    const theme = $derived(getFactionTheme(faction));
</script>

<span
    class="faction-badge font-accent"
    data-faction={faction}
    style:--badge-bg={theme.accent}
    style:--badge-ink={theme.accentInk}
>
    {faction}
</span>

<style>
    .faction-badge {
        position: relative;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        box-sizing: border-box;
        flex: 0 1 auto;
        height: var(--badge-height, 2rem);
        max-width: 100%;
        padding: 0.1rem var(--badge-padding-inline, 0.55rem) 0;
        overflow: hidden;
        color: var(--badge-ink);
        background: var(--badge-bg);
        border: 2px solid #050308;
        border-radius: 0;
        box-shadow: var(--badge-shadow, 3px 3px 0 #050308);
        font-size: var(--badge-font-size, 0.875rem);
        font-weight: 700;
        line-height: 1;
        text-overflow: ellipsis;
        white-space: nowrap;
    }

    /* Specular strip along the badge's top edge. */
    .faction-badge::before {
        content: "";
        position: absolute;
        inset: 0 0 auto;
        height: var(--toys-spec-h, 3px);
        background: var(--toys-spec, color-mix(in srgb, #ffffff 35%, transparent));
        pointer-events: none;
    }

    /* Shade line along the badge's bottom edge: darkened badge accent. */
    .faction-badge::after {
        content: "";
        position: absolute;
        inset: auto 0 0;
        height: var(--toys-rim-h, 2px);
        background: color-mix(in srgb, var(--badge-bg), var(--toys-ink, #050308) 30%);
        pointer-events: none;
    }
</style>
