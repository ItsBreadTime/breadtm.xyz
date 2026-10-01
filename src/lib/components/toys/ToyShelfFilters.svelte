<script lang="ts">
    import type { FactionTheme } from '$lib/toys/factions';
    import type { FactionOption } from '$lib/toys/types';

    let {
        search = $bindable(),
        selectedFaction = $bindable(),
        factions,
        total,
        mixedTheme
    }: {
        search: string;
        selectedFaction: string;
        factions: FactionOption[];
        total: number;
        mixedTheme: FactionTheme;
    } = $props();

    const hasActiveFilters = $derived(!!(selectedFaction || search));

    function selectFaction(value: string) {
        selectedFaction = selectedFaction === value ? '' : value;
    }

    function resetFilters(event: MouseEvent) {
        event.preventDefault();
        selectedFaction = '';
        search = '';
    }
</script>

<form
    class="filter-deck"
    aria-label="Toy shelf controls"
    action="/toys"
    method="GET"
    onsubmit={(event) => event.preventDefault()}
>
    <div class="deck-fill">
        <input type="hidden" name="faction" value={selectedFaction} />
        <button type="submit" hidden aria-hidden="true" tabindex="-1"></button>

        <div class="control-bar">
            <div class="control-cell">
                <label for="search" class="sr-only">Search toys</label>
                <div class="search-field">
                    <svg xmlns="http://www.w3.org/2000/svg" class="search-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="square" stroke-linejoin="miter" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                    <input type="text" id="search" name="q" bind:value={search} placeholder="Search toys" />
                    <div class="no-js-search-actions no-js-only" aria-label="No-JavaScript filter actions">
                        <button type="submit">Apply</button>
                        <a href="/toys">Reset</a>
                    </div>
                </div>
            </div>

            <div class="chip-row" role="group" aria-labelledby="faction-group-label">
                <span class="group-label sr-only" id="faction-group-label">Faction</span>
                <button
                    type="submit"
                    name="faction"
                    value=""
                    class:active={!selectedFaction}
                    aria-pressed={!selectedFaction}
                    aria-label={`Show all toys, ${total} items`}
                    onclick={(event) => {
                        event.preventDefault();
                        selectedFaction = '';
                    }}
                    style:--chip-accent={mixedTheme.accent}
                    style:--chip-active-ink={mixedTheme.accentInk}
                    style:--chip-panel={mixedTheme.panel}
                >
                    <span>All</span>
                    <span class="tabular-nums">{total}</span>
                </button>
                {#each factions as option (option.name)}
                    <button
                        type="submit"
                        name="faction"
                        value={option.name}
                        class:active={selectedFaction === option.name}
                        data-faction-chip={option.name}
                        aria-pressed={selectedFaction === option.name}
                        aria-label={`Show ${option.name} toys, ${option.count} items`}
                        onclick={(event) => {
                            event.preventDefault();
                            selectFaction(option.name);
                        }}
                        style:--chip-accent={option.theme.accent}
                        style:--chip-active-ink={option.theme.accentInk}
                        style:--chip-panel={option.theme.panel}
                    >
                        <span>{option.name}</span>
                        <span class="tabular-nums">{option.count}</span>
                    </button>
                {/each}
                {#if hasActiveFilters}
                    <a class="reset-chip" href="/toys" onclick={resetFilters}>Reset filters</a>
                {/if}
            </div>
        </div>
    </div>
</form>

<style>
    .filter-deck {
        position: relative;
        z-index: 5;
        margin-bottom: clamp(0.9rem, 2vw, 1.35rem);
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

    .deck-fill {
        position: relative;
        display: grid;
        /* minmax(0, …) so the chip row can never widen the track (and the
           page) past the deck. */
        grid-template-columns: minmax(0, 1fr);
        gap: 0.7rem;
        padding:
            clamp(0.8rem, 1.7vw, 1rem)
            clamp(0.55rem, 1.4vw, 0.75rem)
            calc(clamp(0.55rem, 1.4vw, 0.75rem) + 0.75rem);
        background: color-mix(in srgb, var(--page-field-deep), #050308 34%);
        clip-path: polygon(
            0 0,
            calc(100% - max(var(--toys-cut, 14px) - var(--toys-bw-xl, 5px), 0px)) 0,
            100% max(var(--toys-cut, 14px) - var(--toys-bw-xl, 5px), 0px),
            100% 100%,
            0 100%
        );
    }

    /* Stepped shade band: halftone strip along the deck's bottom inner edge,
       with a solid deep step at the very bottom. */
    .deck-fill::after {
        content: "";
        position: absolute;
        inset: auto 0 0;
        height: 0.75rem;
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

    /* Corner shade wedge rising off the band, bottom-right. */
    .deck-fill::before {
        content: "";
        position: absolute;
        right: 0;
        bottom: 0.75rem;
        width: min(32%, 6rem);
        height: 2.6rem;
        background-color: color-mix(in srgb, var(--page-field-deep), #050308 calc(34% + var(--toys-shade-mix, 30%)));
        background-image: var(--toys-halftone);
        background-size: var(--toys-halftone-size, 8px) var(--toys-halftone-size, 8px);
        clip-path: polygon(100% 0, 100% 100%, 0 100%);
        pointer-events: none;
    }

    /* One compact bar: search cell + faction chips (+ inline reset). */
    .control-bar {
        position: relative;
        z-index: 1;
        min-width: 0;
        display: flex;
        flex-wrap: wrap;
        align-items: center;
        gap: 0.55rem;
    }

    .control-cell {
        display: grid;
        min-width: 0;
        flex: 1 1 100%;
    }

    /* Console slot: a distinctly darker inset than the deck around it. The
       bottom inner edge carries the recess's deep step. */
    .search-field {
        position: relative;
        display: flex;
        min-width: 0;
        overflow: hidden;
        background-color: color-mix(in srgb, var(--page-field-deep, #24214c), #050308 62%);
        border: var(--toys-bw-md, 3px) solid var(--toys-ink, #050308);
        border-radius: 0;
        box-shadow:
            var(--toys-shadow-sm, 3px 3px 0 #050308),
            inset 0 -3px 0 color-mix(in srgb, var(--page-field-deep, #24214c), #050308 80%);
        transition:
            border-color 140ms ease,
            box-shadow 140ms ease;
    }

    /* Specular strip along the field's top edge. */
    .search-field::before {
        content: "";
        position: absolute;
        inset: 0 0 auto;
        z-index: 1;
        height: var(--toys-spec-h, 3px);
        background: var(--toys-spec, color-mix(in srgb, #ffffff 35%, transparent));
        pointer-events: none;
    }

    .search-icon {
        position: absolute;
        top: 50%;
        left: 0.9rem;
        width: 1.1rem;
        height: 1.1rem;
        color: color-mix(in srgb, var(--muted, #eaf5ff), transparent 35%);
        transform: translateY(-50%);
        pointer-events: none;
    }

    input {
        flex: 1 1 0;
        width: 0;
        min-width: 0;
        min-height: 2.75rem;
        padding: 0.62rem 0.85rem 0.62rem 2.55rem;
        color: var(--ink, #fff7f8);
        caret-color: var(--accent);
        background: transparent;
        border: 0;
        border-radius: 0;
        box-shadow: none;
        font-size: 1rem;
    }

    input::placeholder {
        color: color-mix(in srgb, var(--muted, #eaf5ff), transparent 45%);
        opacity: 1;
    }

    .search-field:focus-within {
        border-color: var(--accent);
    }

    /* Chips wrap at every width: a handful of factions never needs a hidden
       scroller, and every option stays visible on a phone. */
    .chip-row {
        display: flex;
        flex-wrap: wrap;
        align-items: center;
        gap: 0.55rem;
        flex: 1 1 100%;
        min-width: 0;
    }

    .no-js-only {
        display: none;
    }

    .no-js-search-actions {
        flex: 0 0 auto;
        align-items: stretch;
        min-width: 0;
    }

    .no-js-search-actions button,
    .no-js-search-actions a {
        display: flex;
        align-items: center;
        justify-content: center;
        min-height: 2.75rem;
        padding: 0.45rem 0.75rem;
        color: var(--accent-ink);
        background: var(--accent);
        border: 0;
        border-left: 3px solid var(--toys-ink, #050308);
        border-radius: 0;
        box-shadow: none;
        font-size: 0.9rem;
        font-weight: 800;
        line-height: 1;
        white-space: nowrap;
    }

    .no-js-search-actions a {
        color: #f2eff8;
        background: var(--toys-ink, #050308);
    }

    .chip-row button {
        --chip-accent: var(--accent);
        --chip-active-ink: var(--accent-ink);
        --chip-panel: #25101d;

        position: relative;
        display: inline-flex;
        align-items: center;
        gap: 0.55rem;
        flex: 0 0 auto;
        min-height: 2.75rem;
        padding: 0.42rem 0.62rem;
        color: var(--ink);
        background: color-mix(in srgb, var(--chip-panel), #07050d 42%);
        border: var(--toys-bw-sm, 2px) solid var(--toys-ink, #050308);
        border-radius: 0;
        box-shadow: var(--toys-shadow-sm, 3px 3px 0 #050308);
        font-family: Goldman, 'Goldman Fallback', sans-serif;
        font-size: 0.875rem;
        font-weight: 800;
        /* Held-frame snaps: two steps, no easing, like limited animation. */
        transition:
            transform 120ms steps(2, jump-end),
            color 120ms steps(1, jump-end),
            background-color 120ms steps(1, jump-end),
            border-color 120ms steps(1, jump-end),
            box-shadow 120ms steps(2, jump-end);
    }

    .chip-row button:active {
        transform: translate(1px, 1px);
        box-shadow: 1px 1px 0 var(--toys-ink, #050308);
    }

    /* Specular strip along the chip's top edge. */
    .chip-row button::before {
        content: "";
        position: absolute;
        inset: 0 0 auto;
        height: var(--toys-spec-h, 3px);
        background: var(--toys-spec, color-mix(in srgb, #ffffff 35%, transparent));
        pointer-events: none;
    }

    /* Shade line along the chip's bottom edge; swaps to darkened accent when
       the chip fills with accent. */
    .chip-row button::after {
        content: "";
        position: absolute;
        inset: auto 0 0;
        height: var(--toys-rim-h, 2px);
        background: color-mix(in srgb, var(--chip-panel), #07050d 72%);
        pointer-events: none;
    }

    .chip-row button span:last-child:not(:only-child) {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        min-width: 1.45rem;
        height: 1.5rem;
        padding: 0.08rem 0.38rem 0;
        color: var(--chip-active-ink);
        background: var(--chip-accent);
        border-radius: 0;
    }

    .chip-row button.active {
        color: var(--chip-active-ink);
        background: var(--chip-accent);
        transform: translate(-1px, -1px);
        box-shadow: 4px 4px 0 var(--toys-ink, #050308);
    }

    .chip-row button.active::after {
        background: color-mix(in srgb, var(--chip-accent), var(--toys-ink, #050308) 30%);
    }

    .chip-row button.active span:last-child:not(:only-child) {
        color: var(--chip-active-ink);
        background: #fff7f8;
    }

    /* Hover/focus keep the light ink on the dark panel — the accent only
       edges the border. Active chips keep their dark ink on the accent fill. */
    .chip-row button:focus-visible {
        outline: 3px solid #ffffff;
        outline-offset: 3px;
        color: var(--ink);
        background: color-mix(in srgb, var(--chip-panel), #07050d 20%);
        border-color: var(--chip-accent);
    }

    .chip-row button.active:focus-visible {
        color: var(--chip-active-ink);
        background: color-mix(in srgb, var(--chip-accent), white 8%);
        border-color: var(--toys-ink, #050308);
    }

    .reset-chip {
        display: inline-flex;
        align-items: center;
        flex: 0 0 auto;
        min-height: 2.75rem;
        padding: 0.42rem 0.75rem;
        color: var(--ink);
        background: transparent;
        border: var(--toys-bw-sm, 2px) dashed color-mix(in srgb, var(--muted), transparent 30%);
        border-radius: 0;
        font-size: 0.85rem;
        font-weight: 750;
        line-height: 1;
        text-decoration: none;
        white-space: nowrap;
        transition:
            border-color 140ms ease,
            color 140ms ease,
            background-color 140ms ease;
    }

    .reset-chip:focus-visible {
        outline: 3px solid #ffffff;
        outline-offset: 3px;
        border-color: var(--accent);
        color: var(--accent);
        border-style: solid;
    }

    @media (hover: hover) {
        .chip-row button:hover {
            color: var(--ink);
            background: color-mix(in srgb, var(--chip-panel), #07050d 20%);
            border-color: var(--chip-accent);
            transform: translate(-1px, -1px);
            box-shadow: 4px 4px 0 var(--toys-ink, #050308);
        }

        .chip-row button.active:hover {
            color: var(--chip-active-ink);
            background: color-mix(in srgb, var(--chip-accent), white 8%);
            border-color: var(--toys-ink, #050308);
        }

        .reset-chip:hover {
            border-color: var(--accent);
            color: var(--accent);
        }
    }

    @media (max-width: 720px) {
        .filter-deck {
            filter:
                drop-shadow(2px 2px 0 var(--accent, #ff4f9a))
                drop-shadow(4px 4px 0 #050308);
        }

        .deck-fill {
            gap: 0.5rem;
            padding-bottom: calc(0.55rem + 0.75rem);
        }

        input {
            min-height: 2.75rem;
            padding: 0.48rem 0.65rem 0.48rem 2.05rem;
            font-size: 1rem;
        }

        .search-icon {
            left: 0.7rem;
            width: 0.95rem;
            height: 0.95rem;
        }

        .chip-row {
            gap: 0.42rem;
        }

        .chip-row button {
            gap: 0.42rem;
            padding: 0.34rem 0.58rem;
            box-shadow: 2px 2px 0 var(--toys-ink, #050308);
        }
    }

    @media (min-width: 48rem) {
        /* Single bar: capped search on the left, chips wrap in the rest. */
        .control-cell {
            flex: 0 1 18rem;
            min-width: 12rem;
        }

        .chip-row {
            flex: 1 1 auto;
        }
    }

    @media (min-width: 48rem) and (max-width: 99.999rem) {
        .deck-fill {
            gap: 0.5rem;
            padding: 0.7rem 0.55rem calc(0.55rem + 0.75rem);
        }
    }

    @media (prefers-reduced-motion: reduce) {
        input,
        button,
        .reset-chip,
        .search-field {
            transition: none;
            animation: none;
        }
    }
</style>
