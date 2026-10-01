<script lang="ts">
	import type { RemoteAnthology } from './types';
	import type { ViewerStream } from './stream.svelte';
	import { dateLabel, monthKey } from '../model';

	let {
		stream,
		anthologies,
		variant,
		sideTab = $bindable(),
		scroller = $bindable(),
		onselect,
		oninteract
	}: {
		stream: ViewerStream;
		anthologies: RemoteAnthology[];
		/** The desktop sidebar panel or the phone drawer; both hold the same two lists. */
		variant: 'panel' | 'drawer';
		sideTab: 'posts' | 'series';
		scroller?: HTMLElement;
		onselect: (id: string) => void;
		/** A pointer, wheel or touch in the list: follow-scrolling holds off for a moment. */
		oninteract: () => void;
	} = $props();

	const series = $derived(stream.series);
</script>

<!-- `display: contents`: the lists sit directly in the panel's flex layout, and the
     radio switch drives which one shows through :has(), so it works before JS. -->
<div class="side">
	<div class="side-switch" role="radiogroup" aria-label="List to show">
		<label><input type="radio" name="side-{variant}" value="posts" checked={sideTab === 'posts'} onchange={() => (sideTab = 'posts')}/>{series ? 'Issues' : 'All posts'}</label>
		<label><input type="radio" name="side-{variant}" value="series" checked={sideTab === 'series'} onchange={() => (sideTab = 'series')}/>Series{#if anthologies.length}<span class="switch-count">{anthologies.length}</span>{/if}</label>
	</div>

	<nav class="{variant}-nav side-posts" aria-label={series ? `Issues of ${series.name}` : 'Posts'} bind:this={scroller} onpointerdown={oninteract} onwheel={oninteract} ontouchstart={oninteract}>
		<div class="nav-edge" data-nav-edge="newer" aria-hidden="true"></div>
		{#if stream.status.newerTitles === 'loading'}<p class="nav-note" role="status">Loading newer titles…</p>
		{:else if stream.status.newerTitles === 'failed'}<button class="nav-boundary" onclick={() => void stream.checkNewerTitles()}>Try loading newer titles again</button>{/if}
		{#each stream.summaries as summary, i (summary.id)}
			{#if !series && (i === 0 || monthKey(summary.publishedAt) !== monthKey(stream.summaries[i - 1].publishedAt))}
				<h3 class="nav-month">{dateLabel(summary.publishedAt, { day: undefined, month: 'long' })}</h3>
			{/if}
			<a
				class="nav-item" class:current={summary.id === stream.currentId} class:pending={summary.id === stream.pendingId} class:has-issue={!!series}
				href={stream.postHref(summary.id)}
				aria-current={summary.id === stream.currentId ? 'location' : undefined}
				onclick={(event) => { event.preventDefault(); onselect(summary.id); }}
			>
				{#if series}<span class="nav-issue" aria-label="Issue {summary.id}">#{summary.id}</span>{/if}
				<span class="nav-title">{summary.title}</span>
				<span class="nav-meta">
					{dateLabel(summary.publishedAt, series ? {} : { year: undefined })} · {summary.author.displayName}
					{#if !series && summary.anthology}<span class="nav-series">{summary.anthology.designator} #{summary.anthology.issue}</span>{/if}
				</span>
			</a>
		{/each}
		{#if stream.status.olderTitles === 'loading'}<p class="nav-note" role="status">Loading older titles…</p>
		{:else if stream.status.olderTitles === 'failed'}<button class="nav-boundary" onclick={() => void stream.pageOlderTitles()}>Try loading older titles again</button>
		{:else if !stream.moreOlder && stream.located}<p class="nav-end">{series ? 'That’s the latest issue.' : 'You’ve reached the oldest post.'}</p>{/if}
		<div class="nav-edge" data-nav-edge="older" aria-hidden="true"></div>
	</nav>

	<!-- Every series, plus the whole feed. Plain links: opening a series is a real navigation. -->
	<nav class="{variant}-nav side-series" aria-label="Series">
		<ul class="series-list">
			<li>
				<a class="series-item" class:current={!series} href="/breadmoji-writes" aria-current={!series ? 'page' : undefined}>
					<span class="series-code">All</span>
					<span class="series-name">All posts</span>
					<span class="series-meta">The whole feed, newest first</span>
				</a>
			</li>
			{#each anthologies as anthology (anthology.id)}
				<li>
					<a class="series-item" class:current={series?.designator === anthology.designator} href="/breadmoji-writes/{anthology.designator}" aria-current={series?.designator === anthology.designator ? 'page' : undefined}>
						<span class="series-code">{anthology.designator}</span>
						<span class="series-name">{anthology.name}</span>
						<span class="series-meta">{anthology.postCount} {anthology.postCount === 1 ? 'issue' : 'issues'}{#if anthology.latestPostAt} · latest {dateLabel(anthology.latestPostAt)}{/if}</span>
						{#if anthology.description}<span class="series-desc">{anthology.description}</span>{/if}
					</a>
				</li>
			{/each}
		</ul>
		{#if !anthologies.length}<p class="nav-note">No series to show right now.</p>{/if}
	</nav>

	{#if variant === 'panel' && !stream.located}<p class="nav-note side-posts">The archive list could not be located around this post.</p>{/if}
</div>

<style>
	.side { display: contents; }
	.side:has(input[value="series"]:checked) .side-posts { display: none; }
	.side:not(:has(input[value="series"]:checked)) .side-series { display: none; }

	.panel-nav {
		max-height: calc(100dvh - var(--nav-h, 68px) - var(--toolbar-h, 66px) - 104px); overflow: auto;
		padding: 4px 0 8px; scrollbar-color: var(--muted) var(--paper);
	}
	.drawer-nav { flex: 1; min-height: 0; overflow: auto; scrollbar-color: var(--muted) var(--paper); }

	.side-switch { display: flex; border-bottom: 3px solid var(--rule); background: var(--canvas); }
	.side-switch label {
		position: relative; flex: 1 1 0; display: flex; align-items: center; justify-content: center; gap: 6px;
		min-height: 44px; padding: 8px 10px; cursor: pointer; color: var(--heading);
		font-family: Goldman, 'Goldman Fallback', sans-serif; font-size: 13px; font-weight: 700; letter-spacing: 0.04em; text-transform: uppercase;
	}
	.side-switch label + label { border-left: 3px solid var(--rule); }
	.side-switch label:hover { background: var(--notice); }
	.side-switch label:has(input:checked) { background: var(--rule); color: var(--zine-yellow); }
	.side-switch label:has(input:focus-visible) { outline: 3px solid var(--accent); outline-offset: -6px; }
	.side-switch input { position: absolute; opacity: 0; width: 1px; height: 1px; margin: 0; }
	.switch-count {
		min-width: 20px; padding: 0 4px; border: 2px solid currentColor; font-size: 11px; line-height: 16px; text-align: center;
	}

	.nav-edge { height: 1px; }
	.nav-month {
		margin: 10px 12px 4px; padding: 0 0 3px; border-bottom: 2px dotted var(--rule);
		font-family: Goldman, 'Goldman Fallback', sans-serif; font-size: 12px; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase; color: var(--heading);
	}
	.nav-item {
		display: block; min-height: 44px; margin: 2px 8px; padding: 7px 10px 7px 10px;
		border: 2px solid transparent; text-decoration: none; color: var(--ink);
	}
	.nav-item.has-issue { display: grid; grid-template-columns: auto minmax(0, 1fr); column-gap: 10px; }
	.nav-item.has-issue .nav-meta { grid-column: 2; }
	.nav-item:hover { background: var(--notice); }
	.nav-item.current { background: var(--zine-yellow); border-color: var(--rule); box-shadow: var(--zine-shadow-sm); }
	/* Without JS nothing scrolls the list, so a page landing deep in the archive (the no-JS
	   "older posts" link) would open on the top of the list; it opens on the current entry
	   instead. followNav takes over with JS. */
	.panel-nav .nav-item.current { scroll-initial-target: nearest; }
	.nav-item.current .nav-title { font-weight: 800; color: var(--heading); }
	.nav-item.pending .nav-title { opacity: 0.55; font-style: italic; }
	.nav-title {
		display: -webkit-box; -webkit-line-clamp: 2; line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;
		font-size: 15px; line-height: 1.3; font-weight: 650; color: var(--heading);
	}
	.nav-issue {
		align-self: start; padding: 1px 5px; border: 2px solid var(--rule); background: var(--zine-pink);
		font-family: Goldman, 'Goldman Fallback', sans-serif; font-size: 12px; font-weight: 700; color: var(--heading); font-variant-numeric: tabular-nums;
	}
	.nav-meta { display: block; margin-top: 3px; font-size: 12px; line-height: 1.4; color: var(--muted); font-variant-numeric: tabular-nums; }
	.nav-series {
		display: inline-block; margin-left: 4px; padding: 0 4px; border: 1.5px solid var(--rule); background: var(--zine-cyan);
		font-family: Goldman, 'Goldman Fallback', sans-serif; font-size: 12px; font-weight: 700; line-height: 16px; color: var(--heading);
	}
	.nav-boundary {
		display: flex; align-items: center; width: 100%; min-height: 44px; padding: 8px 12px;
		border: 0; border-top: 2px solid var(--rule); background: transparent; color: var(--accent);
		font-size: 13px; font-weight: 700; font-family: inherit; text-align: left;
	}
	.nav-boundary:hover:not(:disabled) { background: var(--notice); }
	.nav-note { margin: 6px 0 0; padding: 0 12px 8px; font-size: 12px; color: var(--muted); }
	.nav-end { margin: 8px 0 0; padding: 0 12px 8px; font-size: 12px; font-style: italic; color: var(--muted); }

	.series-list { list-style: none; margin: 0; padding: 4px 0; }
	.series-item {
		display: grid; grid-template-columns: auto minmax(0, 1fr); column-gap: 10px; row-gap: 2px; align-items: center;
		margin: 6px 8px; padding: 10px; border: 2px solid transparent; text-decoration: none; color: var(--ink);
	}
	.series-item:hover { background: var(--notice); }
	.series-item.current { background: var(--zine-yellow); border-color: var(--rule); box-shadow: var(--zine-shadow-sm); }
	.series-code {
		grid-row: span 2; align-self: start; min-width: 44px; padding: 4px 6px; border: 2px solid var(--rule); background: var(--zine-pink);
		font-family: Goldman, 'Goldman Fallback', sans-serif; font-size: 13px; font-weight: 700; text-align: center; text-transform: uppercase; color: var(--heading);
		box-shadow: var(--zine-shadow-sm); transform: rotate(-3deg);
	}
	.series-list li:first-child .series-code { background: var(--zine-cyan); }
	.series-name { font-size: 15px; font-weight: 800; line-height: 1.25; color: var(--heading); }
	.series-meta { font-size: 12px; color: var(--muted); }
	.series-desc { grid-column: 2; margin-top: 2px; font-size: 13px; line-height: 1.4; color: var(--ink); }

	@media (max-height: 600px) {
		.panel-nav { max-height: 50dvh; }
	}
</style>
