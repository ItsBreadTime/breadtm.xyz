<script lang="ts">
	import { onMount, type Snippet } from 'svelte';
	import type { ViewerStream } from './stream.svelte';
	import Icon from '../Icon.svelte';

	let {
		stream,
		drawerOpen = $bindable(),
		element = $bindable(),
		onselect,
		onstep,
		onclose,
		drawer
	}: {
		stream: ViewerStream;
		drawerOpen: boolean;
		element?: HTMLElement;
		onselect: (id: string) => void;
		onstep: (direction: 'newer' | 'older') => void;
		onclose: () => void;
		/** The browse lists shown inside the phone drawer. */
		drawer: Snippet;
	} = $props();

	const series = $derived(stream.series);
	// Close and the scrim need JS; without it the summary is the toggle, so Close only appears once it would work.
	let enhanced = $state(false);
	onMount(() => { enhanced = true; });
</script>

{#snippet nameplate()}
	{#if series}<span class="nameplate-code">{series.designator}</span>{/if}<span class="nameplate" class:series>{series?.name ?? 'Breadmoji writes'}</span>
{/snippet}

<!-- An adjacent post is a real href so stepping works without JS; cursor-paging
     needs the reader, so it stays a button. -->
{#snippet stepControl(direction: 'newer' | 'older')}
	{@const adjacent = direction === 'newer' ? stream.adjacentNewer : stream.adjacentOlder}
	{@const steppable = direction === 'newer' ? stream.canStepNewer : stream.canStepOlder}
	{#snippet label()}
		<!-- One span so the label is a single flex item: bare spaces between flex items
		     don't render, and inline flow inside the span keeps them. -->
		<span class="step-word">
			{#if direction === 'newer'}↑{' '}{/if}<span class="step-full">{stream.stepWords[direction]} {stream.noun.one}</span><span class="step-short">{series && direction === 'newer' ? 'Prev' : stream.stepWords[direction]}</span>{#if direction === 'older'}{' '}↓{/if}
		</span>
	{/snippet}
	{#if adjacent}
		<a class="toolbar-step" href={stream.postHref(adjacent.id)} onclick={(event) => { event.preventDefault(); onselect(adjacent.id); }}>{@render label()}</a>
	{:else if steppable}
		<button class="toolbar-step" onclick={() => onstep(direction)}>{@render label()}</button>
	{:else}
		<button class="toolbar-step" disabled>{@render label()}</button>
	{/if}
{/snippet}

<header class="viewer-toolbar" bind:this={element}>
	<div class="toolbar-row">
		{#if series}
			<div class="toolbar-name">
				<a class="toolbar-crumb" href="/breadmoji-writes">Breadmoji writes</a>
				<h1 class="toolbar-title">{@render nameplate()}</h1>
			</div>
		{:else}
			<h1 class="toolbar-title">{@render nameplate()}</h1>
		{/if}
		<div class="toolbar-arrows">
			{@render stepControl('newer')}
			{@render stepControl('older')}
		</div>
		<details class="posts-drawer" bind:open={drawerOpen}>
			<summary id="posts-toggle" class="posts-toggle"><Icon name="list" size={17}/> {series ? 'Issues' : 'Posts'}</summary>
			<!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_static_element_interactions -->
			<div class="drawer-scrim" aria-hidden="true" onclick={onclose}></div>
			<div class="drawer-panel" aria-label="Browse">
				<div class="drawer-head">
					<h2>Browse</h2>
					{#if enhanced}<button class="drawer-close" onclick={onclose}>Close</button>{/if}
				</div>
				{@render drawer()}
			</div>
		</details>
	</div>
</header>

<!-- The docked phone toolbar hides its h1, so phones get the nameplate back
     in flow here; the h1 stays the accessible heading. -->
<div class="mobile-masthead" aria-hidden="true">
	{#if series}<a class="toolbar-crumb" href="/breadmoji-writes" tabindex="-1">Breadmoji writes</a>{/if}
	<div class="toolbar-title">{@render nameplate()}</div>
</div>

<style>
	/* ── Toolbar: the masthead strip ─────────────────────────────── */
	.viewer-toolbar {
		position: sticky; top: var(--nav-h, 68px); z-index: 50;
		background: var(--canvas); border-bottom: 3px solid var(--rule);
		margin: -16px -8px 16px; padding: 0 8px;
	}
	.toolbar-row { display: flex; align-items: center; gap: 16px; min-height: 66px; flex-wrap: wrap; padding: 6px 0; }
	.toolbar-name { display: flex; flex-direction: column; align-items: flex-start; gap: 4px; min-width: 0; }
	.toolbar-crumb {
		font-size: 12px; font-weight: 750; letter-spacing: 0.08em; text-transform: uppercase;
		color: var(--muted); text-decoration: underline; text-underline-offset: 3px;
	}
	.toolbar-crumb:hover { color: var(--heading); }
	.toolbar-title { display: flex; align-items: center; gap: 10px; margin: 0; min-width: 0; font-size: inherit; }
	.nameplate {
		display: inline-block; padding: 4px 12px 3px; border: 3px solid var(--rule); background: var(--zine-yellow);
		color: var(--heading); font-family: Goldman, 'Goldman Fallback', sans-serif; font-size: 21px; font-weight: 700;
		line-height: 1.15; letter-spacing: 0.02em; text-transform: uppercase; box-shadow: var(--zine-shadow-md);
		transform: rotate(-1.5deg); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 100%;
	}
	.nameplate.series { font-size: 18px; transform: rotate(-1deg); }
	.nameplate-code {
		flex: none; padding: 3px 7px; border: 3px solid var(--rule); background: var(--zine-pink);
		font-family: Goldman, 'Goldman Fallback', sans-serif; font-size: 16px; font-weight: 700; color: var(--heading);
		box-shadow: var(--zine-shadow-sm); transform: rotate(2deg);
	}
	.toolbar-arrows { display: flex; gap: 10px; margin-left: auto; }
	.mobile-masthead { display: none; }
	/* Chunky ink buttons: they lift on hover and press flat when used. */
	.toolbar-step, .posts-toggle, .drawer-close {
		display: inline-flex; align-items: center; gap: 8px; min-height: 44px; padding: 8px 14px;
		border: 3px solid var(--rule); background: var(--paper); color: var(--heading); box-shadow: var(--zine-shadow-md);
		font-size: 14px; font-weight: 750; font-family: inherit; text-decoration: none; cursor: pointer;
	}
	.toolbar-step:hover:not(:disabled), .posts-toggle:hover, .drawer-close:hover { background: var(--zine-yellow); }
	.toolbar-step:active:not(:disabled), .drawer-close:active { transform: translate(4px, 4px); box-shadow: none; }
	/* Disabled reads as "nothing that way", not as broken: dashed, flat, still legible. */
	.toolbar-step:disabled { border-style: dashed; background: transparent; box-shadow: none; color: var(--muted); opacity: 1; cursor: default; }
	.step-short { display: none; }
	/* The Posts drawer is a <details> so the list opens without JS; the summary is the button. */
	.posts-drawer { display: none; }
	.posts-toggle { list-style: none; }
	.posts-toggle::-webkit-details-marker { display: none; }
	.drawer-scrim { position: fixed; inset: 0; z-index: 1; background: rgb(22 17 13 / 0.5); }
	.drawer-panel {
		position: fixed; inset: 0; z-index: 2; margin: auto;
		display: flex; flex-direction: column;
		width: min(340px, 88vw); height: min(88dvh, 100%);
		border: 3px solid var(--rule); background: var(--paper); color: var(--ink); box-shadow: var(--zine-shadow-lg);
	}
	.drawer-head { display: flex; align-items: center; gap: 12px; padding: 10px 12px; border-bottom: 3px solid var(--rule); background: var(--zine-yellow); }
	.drawer-head h2 { margin: 0; font-family: Goldman, 'Goldman Fallback', sans-serif; font-size: 16px; font-weight: 700; text-transform: uppercase; color: var(--heading); }
	.drawer-close { margin-left: auto; padding: 6px 14px; box-shadow: var(--zine-shadow-sm); }

	@media (max-width: 999px) {
		.posts-drawer { display: block; }
		/* The panel sits between the site navbar and the bottom edge instead of centring over
		   the navbar, and the page behind holds still: a scrolling page under the scrim makes
		   mobile browsers resize the viewport mid-gesture. */
		.drawer-panel { inset: calc(var(--nav-h, 68px) + 12px) 0 12px; height: auto; max-height: 720px; }
		:global(html:has(.posts-drawer[open])) { overflow: hidden; }
	}
	@media (max-width: 760px) {
		/* The control row docks to the viewport bottom: the reading column gets the
		   full height back, and stepping never demands a scroll back to the top. */
		.viewer-toolbar {
			position: fixed; top: auto; bottom: 0; left: 0; right: 0;
			margin: 0; padding: 0 12px env(safe-area-inset-bottom, 0px);
			border-bottom: 0; border-top: 3px solid var(--rule);
		}
		.toolbar-row { gap: 8px; min-height: 0; padding: 8px 0 10px; flex-wrap: nowrap; }
		/* The document title carries the section name on mobile; the docked row is
		   controls only, so the three buttons share one line at every phone width. */
		.viewer-toolbar .toolbar-title, .viewer-toolbar .toolbar-name {
			position: absolute; width: 1px; height: 1px; margin: -1px; padding: 0;
			overflow: hidden; clip: rect(0 0 0 0); clip-path: inset(50%); white-space: nowrap;
		}
		.mobile-masthead { display: flex; flex-direction: column; align-items: flex-start; gap: 6px; margin: 4px 0 16px; }
		.mobile-masthead .toolbar-title { max-width: 100%; }
		.step-full { display: none; }
		.step-short { display: inline; }
		/* Grow 2:1 against the Posts toggle so the three buttons render equal-width
		   (the arrows hold two buttons plus their internal gap). */
		.toolbar-arrows { flex: 2; margin-left: 0; min-width: 0; gap: 8px; }
		.toolbar-step { flex: 1 1 0; justify-content: center; padding: 8px 6px; white-space: nowrap; box-shadow: var(--zine-shadow-sm); }
		.posts-drawer { flex: 1 1 0; min-width: 0; }
		.posts-toggle { width: 100%; justify-content: center; padding: 8px 6px; box-shadow: var(--zine-shadow-sm); }
		/* Clear the docked control row too, so Posts stays visible as the close toggle. */
		.drawer-panel { bottom: calc(80px + env(safe-area-inset-bottom, 0px)); }
	}
	@media (max-height: 600px) {
		/* Static again means top-of-page in flow: restore the top-bar chrome the
		   bottom-docked phone layout replaced. */
		.viewer-toolbar { position: static; border-bottom: 3px solid var(--rule); border-top: 0; }
	}
</style>
