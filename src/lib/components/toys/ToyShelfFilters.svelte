<script lang="ts">
    import type { FactionTheme } from '$lib/toys/factions';
    import type { FactionOption } from '$lib/toys/types';

    let {
        search = $bindable(),
        selectedSeries = $bindable(),
        selectedFaction = $bindable(),
        series,
        factions,
        total,
        mixedTheme
    }: {
        search: string;
        selectedSeries: string;
        selectedFaction: string;
        series: string[];
        factions: FactionOption[];
        total: number;
        mixedTheme: FactionTheme;
    } = $props();

    let seriesMenu: HTMLDetailsElement;

    function selectSeries(value: string) {
        selectedSeries = value;
        if (seriesMenu) seriesMenu.open = false;
    }

    function selectFaction(value: string) {
        selectedFaction = selectedFaction === value ? '' : value;
    }
</script>

<form
    class="filter-deck"
    aria-label="Toy shelf controls"
    action="/toys"
    method="GET"
    onsubmit={(event) => event.preventDefault()}
>
    <input type="hidden" name="series" value={selectedSeries} />
    <input type="hidden" name="faction" value={selectedFaction} />
    <button type="submit" hidden aria-hidden="true" tabindex="-1"></button>

    <div class="search-row">
        <div class="control-cell">
            <label for="search" class="sr-only">Search toys</label>
            <div class="search-field">
                <svg xmlns="http://www.w3.org/2000/svg" class="search-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <input type="text" id="search" name="q" bind:value={search} placeholder="Search toys" />
                <div class="no-js-search-actions no-js-only" aria-label="No-JavaScript filter actions">
                    <button type="submit">Apply</button>
                    <a href="/toys">Reset</a>
                </div>
            </div>
        </div>

        <div class="control-cell series-control">
            <details class="series-menu" bind:this={seriesMenu}>
                <summary class="series-summary" aria-label="Filter by series">
                    <span>{selectedSeries || 'All series'}</span>
                    <svg aria-hidden="true" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.4" d="M19 9l-7 7-7-7" />
                    </svg>
                </summary>
                <div class="series-options" aria-label="Series options">
                    <button
                        type="submit"
                        name="series"
                        value=""
                        class:active={!selectedSeries}
                        onclick={(event) => {
                            event.preventDefault();
                            selectSeries('');
                        }}
                    >All series</button>
                    {#each series as value}
                        <button
                            type="submit"
                            name="series"
                            value={value}
                            class:active={selectedSeries === value}
                            onclick={(event) => {
                                event.preventDefault();
                                selectSeries(value);
                            }}
                        >{value}</button>
                    {/each}
                </div>
            </details>
        </div>
    </div>

    <div class="faction-rail-wrap">
        <div class="faction-rail" aria-label="Filter by faction">
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
        </div>
    </div>
</form>

<style>
    .filter-deck {
        position: relative;
        z-index: 5;
        display: grid;
        gap: 0.7rem;
        overflow: visible;
        margin-bottom: clamp(0.8rem, 2vw, 1.3rem);
        padding:
            clamp(0.8rem, 1.7vw, 1rem)
            clamp(0.55rem, 1.4vw, 0.75rem)
            clamp(0.55rem, 1.4vw, 0.75rem);
        background: color-mix(in srgb, var(--page-field-deep), #050308 34%);
        border: var(--site-outline-width, 4px) solid var(--site-outline, #050308);
        border-radius: var(--site-radius, 0.65rem);
        box-shadow: 0 0.45rem 0 var(--site-outline, #050308);
    }

    .filter-deck::before {
        content: "";
        position: absolute;
        inset: 0 0 auto;
        height: 0.36rem;
        background: var(--accent);
        box-shadow: 0 3px 0 #050308;
        pointer-events: none;
    }

    .search-row {
        display: grid;
        grid-template-columns: minmax(0, 1fr);
        gap: 0.75rem;
    }

    .control-cell {
        display: grid;
        min-width: 0;
    }

    .series-control,
    .series-menu {
        position: relative;
    }

    .series-summary {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 0.5rem;
        width: 100%;
        min-height: 2.75rem;
        padding: 0.62rem 0.75rem 0.62rem 0.85rem;
        color: var(--ink);
        background: var(--field);
        border: 2px solid #050308;
        border-radius: 0.45rem;
        box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.16), 0 3px 0 #050308;
        cursor: pointer;
        font-size: 1rem;
        list-style: none;
    }

    .series-summary::-webkit-details-marker {
        display: none;
    }

    .series-summary svg {
        flex: 0 0 auto;
        width: 1rem;
        height: 1rem;
        transition: transform 180ms ease;
    }

    .series-menu[open] .series-summary svg {
        transform: rotate(180deg);
    }

    .series-options {
        position: absolute;
        top: calc(100% + 0.45rem);
        right: 0;
        z-index: 30;
        display: grid;
        gap: 0.2rem;
        width: max(100%, 10rem);
        max-height: 15rem;
        overflow-y: auto;
        padding: 0.4rem;
        background: #07050d;
        border: 3px solid #050308;
        border-radius: 0.5rem;
        box-shadow: 0 5px 0 #050308;
    }

    .series-options button {
        min-height: 2.5rem;
        padding: 0.5rem 0.65rem;
        color: var(--ink);
        border-radius: 0.35rem;
        font-weight: 700;
        text-align: left;
    }

    .series-options button:hover {
        color: var(--ink);
        background: color-mix(in srgb, var(--accent), #07050d 68%);
    }

    .series-options button.active {
        color: var(--accent-ink);
        background: var(--accent);
        box-shadow: inset 0 0 0 2px #050308;
    }

    .search-field {
        position: relative;
        display: flex;
        min-width: 0;
        overflow: hidden;
        background-color: var(--field);
        border: 2px solid #050308;
        border-radius: 0.45rem;
        box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.16), 0 3px 0 #050308;
        transition:
            border-color 180ms ease,
            box-shadow 180ms ease,
            background-color 180ms ease;
    }

    .search-icon {
        position: absolute;
        top: 50%;
        left: 0.9rem;
        width: 1.1rem;
        height: 1.1rem;
        color: color-mix(in srgb, var(--accent), white 42%);
        transform: translateY(-50%);
        pointer-events: none;
    }

    input {
        flex: 1 1 0;
        width: 0;
        min-width: 0;
        min-height: 2.75rem;
        padding: 0.62rem 0.85rem 0.62rem 2.55rem;
        color: var(--ink);
        background: transparent;
        border: 0;
        border-radius: 0;
        box-shadow: none;
        font-size: 1rem;
    }

    input::placeholder {
        color: #eee2f0;
        opacity: 1;
    }

    .search-field:hover,
    .series-summary:hover,
    .search-field:focus-within {
        background-color: rgba(5, 3, 8, 0.94);
        border-color: color-mix(in srgb, var(--accent), white 14%);
        box-shadow:
            inset 0 0 0 1px color-mix(in srgb, var(--accent), white 18%),
            0 3px 0 #050308;
    }

    .search-field:focus-within,
    .series-summary:focus-visible {
        border-color: var(--accent);
        outline: none;
        box-shadow: 0 3px 0 #050308;
    }

    button:focus-visible {
        outline: 3px solid color-mix(in srgb, var(--accent), white 15%);
        outline-offset: 3px;
    }

    .faction-rail-wrap {
        min-width: 0;
    }

    .faction-rail {
        display: flex;
        flex-wrap: nowrap;
        gap: 0.55rem;
        overflow-x: auto;
        overflow-y: hidden;
        margin: -0.2rem -0.12rem -0.25rem;
        padding: 0.2rem 0.12rem 0.32rem;
        scroll-padding-inline: 0.12rem;
        scroll-snap-type: x proximity;
        scrollbar-width: none;
    }

    .faction-rail::-webkit-scrollbar {
        display: none;
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
        border-left: 2px solid #050308;
        border-radius: 0;
        box-shadow: none;
        font-size: 0.9rem;
        font-weight: 800;
        line-height: 1;
        white-space: nowrap;
    }

    .no-js-search-actions a {
        color: var(--ink);
        background: var(--field);
    }

    .faction-rail button {
        --chip-accent: var(--accent);
        --chip-active-bg: var(--chip-accent);
        --chip-active-ink: var(--accent-ink);
        --chip-panel: #25101d;

        display: inline-flex;
        align-items: center;
        gap: 0.55rem;
        flex: 0 0 auto;
        min-height: 2.75rem;
        padding: 0.42rem 0.62rem;
        color: var(--ink);
        background: color-mix(in srgb, var(--chip-panel), #07050d 42%);
        border: 2px solid #050308;
        border-radius: 0.55rem;
        font-family: Goldman, sans-serif;
        font-size: 0.875rem;
        font-weight: 800;
        scroll-snap-align: start;
        transition:
            transform 180ms cubic-bezier(0.22, 1, 0.36, 1),
            color 180ms ease,
            background-color 180ms ease,
            border-color 180ms ease;
    }

    .faction-rail button span:last-child {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        min-width: 1.45rem;
        height: 1.5rem;
        padding: 0.08rem 0.38rem 0;
        color: var(--chip-active-ink);
        background: var(--chip-accent);
        border-radius: 0.38rem;
    }

    .faction-rail button.active {
        color: var(--chip-active-ink);
        background: var(--chip-active-bg);
        transform: translateY(-1px);
    }

    .faction-rail button.active span:last-child {
        color: var(--chip-active-ink);
        background: #fff7f8;
    }

    @media (hover: hover) {
        .faction-rail button:hover {
            color: #fff7f8;
            background: color-mix(in srgb, var(--chip-accent), #050308 68%);
            border-color: color-mix(in srgb, var(--chip-accent), white 12%);
            transform: translateY(-1px);
        }

        .faction-rail button.active:hover {
            color: var(--chip-active-ink);
            background: color-mix(in srgb, var(--chip-active-bg), white 8%);
            border-color: #050308;
            transform: translateY(-2px);
        }
    }

    @media (max-width: 720px) {
        .filter-deck {
            gap: 0.5rem;
            margin-bottom: 0.75rem;
            box-shadow: 0 4px 0 #050308;
        }

        input,
        .series-summary {
            min-height: 2.75rem;
            border-width: 2px;
            border-radius: 0.45rem;
            font-size: 1rem;
        }

        input {
            padding: 0.48rem 0.65rem 0.48rem 2.05rem;
        }

        .search-icon {
            left: 0.7rem;
            width: 0.95rem;
            height: 0.95rem;
        }

        .series-summary {
            padding: 0.48rem 0.58rem 0.48rem 0.62rem;
        }

        .faction-rail {
            gap: 0.42rem;
            margin: -0.1rem -0.1rem -0.3rem;
            padding: 0.2rem 0.1rem 0.42rem;
        }

        .faction-rail button {
            gap: 0.42rem;
            padding: 0.34rem 0.58rem;
            border-width: 1.5px;
        }
    }

    @media (min-width: 22rem) {
        .search-row {
            grid-template-columns: minmax(0, 1fr) minmax(7.5rem, 8.5rem);
            gap: 0.45rem;
        }
    }

    @media (min-width: 34rem) {
        .search-row {
            grid-template-columns: minmax(0, 1fr) minmax(11rem, 16rem);
        }
    }

    @media (min-width: 48rem) {
        .faction-rail {
            flex-wrap: wrap;
            overflow: visible;
        }
    }

    @media (min-width: 48rem) and (max-width: 99.999rem) {
        .filter-deck {
            gap: 0.5rem;
            margin-bottom: 0.8rem;
            padding: 0.7rem 0.55rem 0.55rem;
        }
    }

    @media (max-width: 47.999rem) {
        .faction-rail-wrap {
            -webkit-mask-image: linear-gradient(
                90deg,
                #000 0,
                #000 calc(100% - 1.5rem),
                transparent 100%
            );
            mask-image: linear-gradient(
                90deg,
                #000 0,
                #000 calc(100% - 1.5rem),
                transparent 100%
            );
        }
    }

    @media (prefers-reduced-motion: reduce) {
        input,
        button {
            transition: none;
            animation: none;
        }
    }
</style>
