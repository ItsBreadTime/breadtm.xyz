<script lang="ts">
    import { getFactionTheme } from '$lib/toys/factions';

    let { faction = '' }: { faction?: string } = $props();
    let theme = $derived(getFactionTheme(faction));
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
        border-radius: 0.35rem;
        box-shadow: var(--badge-shadow, 0 4px 0 #050308);
        font-size: var(--badge-font-size, 0.875rem);
        font-weight: 700;
        line-height: 1;
        text-overflow: ellipsis;
        white-space: nowrap;
    }
</style>
