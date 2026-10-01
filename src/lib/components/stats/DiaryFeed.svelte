<script lang="ts">
	import { onMount, tick } from 'svelte';
	import Icon from '$lib/publishing/Icon.svelte';
	import { dateLabel, monthKey } from '$lib/publishing/model';
	import {
		credsLabel,
		ratingStars,
		statsHref,
		type KindFilter,
		type MediaLog,
		type TimePreset
	} from '$lib/stats/newsspeak';

	let {
		initialEntries,
		initialNext,
		kind,
		preset
	}: {
		initialEntries: MediaLog[];
		initialNext: string | null;
		kind: KindFilter;
		preset: TimePreset;
	} = $props();

	// svelte-ignore state_referenced_locally
	let entries = $state<MediaLog[]>(initialEntries);
	// svelte-ignore state_referenced_locally
	let next = $state<string | null>(initialNext);
	let loading = $state(false);
	let failure = $state('');
	let announcement = $state('');
	let sentinel = $state<HTMLDivElement>();
	let controller: AbortController | undefined;

	// Filter/nav changes reset the feed to the fresh SSR page.
	$effect(() => {
		controller?.abort();
		entries = initialEntries;
		next = initialNext;
		failure = '';
		announcement = '';
	});

	function kindLabel(entry: MediaLog): string {
		if (entry.kind === 'movie') return 'Movie';
		if (entry.kind === 'book') return 'Book';
		return entry.season_number !== null ? `Show · S${entry.season_number}` : 'Show';
	}

	// Only the user's own context tags show (theater, imax, …), raw and
	// unmixed and unnormalized: genre chips arrive mixed into the tags array and would just
	// duplicate the ledger's genre data.
	function userTags(entry: MediaLog): string[] {
		const genres = new Set((entry.genres ?? []).map((genre) => genre.toLocaleLowerCase()));
		return entry.tags.filter((tag) => !genres.has(tag.toLocaleLowerCase()));
	}

	function monogram(title: string): string {
		return (title.trim()[0] ?? '?').toUpperCase();
	}

	async function loadMore() {
		if (!next || loading) return;
		controller?.abort();
		const request = new AbortController();
		controller = request;
		loading = true;
		failure = '';
		try {
			const params = new URLSearchParams();
			if (kind !== 'all') params.set('kind', kind);
			if (preset !== 'all') params.set('t', preset);
			params.set('cursor', next);
			const response = await fetch(`/stats/diary?${params}`, { signal: request.signal });
			if (!response.ok) throw new Error('More entries could not be loaded.');
			const batch: { entries: MediaLog[]; next: string | null } = await response.json();
			const existing = new Set(entries.map((entry) => entry.id));
			const extra = batch.entries.filter((entry) => !existing.has(entry.id));
			entries = [...entries, ...extra];
			next = batch.next;
			announcement = `${extra.length} more entries loaded.`;
			// The observer only reports crossings: on a tall screen the sentinel can
			// still be in range after a batch, so keep going until it is pushed away.
			await tick();
			if (controller === request && sentinel && sentinel.getBoundingClientRect().top < window.innerHeight + 500) {
				loading = false;
				void loadMore();
			}
		} catch (error) {
			if (!request.signal.aborted) failure = error instanceof Error ? error.message : 'More entries could not be loaded.';
		} finally {
			if (controller === request) loading = false;
		}
	}

	let bottomArmed = true;
	onMount(() => {
		const observer = new IntersectionObserver(
			(records) => {
				for (const record of records) {
					if (record.isIntersecting && bottomArmed) {
						bottomArmed = false;
						void loadMore();
					}
					if (!record.isIntersecting) bottomArmed = true;
				}
			},
			{ rootMargin: '500px' }
		);
		if (sentinel) observer.observe(sentinel);
		return () => {
			observer.disconnect();
			controller?.abort();
		};
	});
</script>

<div class="diary" aria-busy={loading}>
	{#each entries as entry, index (entry.id)}
		{@const art = entry.poster_url ?? entry.cover_url}
		{#if index === 0 || monthKey(entry.consumed_at) !== monthKey(entries[index - 1].consumed_at)}
			<h3 class="month-heading">{dateLabel(entry.consumed_at, { day: undefined, month: 'long' })}</h3>
		{/if}
		<article class="diary-card">
			<div class="diary-poster">
				{#if art}
					<!-- Links to the full art; the stats page upgrades it to the lightbox. -->
					<a class="diary-poster-link" href={art} target="_blank" rel="noreferrer" data-poster={entry.title} aria-label="View {entry.title} art">
						<span class="diary-monogram" aria-hidden="true">{monogram(entry.title)}</span>
						<img
							src={art}
							alt=""
							loading={index < 4 ? 'eager' : 'lazy'}
							decoding="async"
							referrerpolicy="no-referrer"
							onerror={(event) => {
								event.currentTarget.parentElement?.removeAttribute('href');
								event.currentTarget.remove();
							}}
						/>
					</a>
				{:else}
					<span class="diary-monogram" aria-hidden="true">{monogram(entry.title)}</span>
				{/if}
			</div>
			<div class="diary-info">
				<h4>
					{entry.title}{#if entry.year}&nbsp;<span class="entry-year">{entry.year}</span>{/if}
				</h4>
				{#if entry.author}
					<p class="diary-creator">{entry.kind === 'movie' ? 'dir.' : 'by'} {entry.author}</p>
				{/if}
				<p class="diary-sub">
					{kindLabel(entry)} · {dateLabel(entry.consumed_at)}
				</p>
				{#if entry.rating !== null || entry.rewatch}
					<p class="diary-rating">
						{#if entry.rating !== null}<span class="diary-stars" aria-label="Rated {entry.rating} out of 5">{ratingStars(entry.rating)}</span>{/if}
						{#if entry.rewatch}<span class="entry-rewatch"><Icon name="repeat" size={12} />{entry.kind === 'book' ? 'Reread' : 'Rewatch'}</span>{/if}
					</p>
				{/if}
				<!-- Tags and creds share a footer pinned to the card bottom, so they
					 line up across a row whatever the title length. -->
				<div class="diary-foot">
					{#if userTags(entry).length}
						<ul class="diary-tags" aria-label="Tags">
							{#each userTags(entry) as tag (tag)}
								<li class="entry-tag">{tag}</li>
							{/each}
						</ul>
					{/if}
					<p class="diary-creds" class:negative={entry.creds_delta < 0} aria-label="{entry.creds_delta} creds">{credsLabel(entry.creds_delta)}</p>
				</div>
			</div>
		</article>
	{:else}
		<section class="diary-empty">
			<h4>No entries in this slice.</h4>
			<p>The filters are narrowing the ledger to zero.</p>
			<a class="diary-button" href="/stats" data-sveltekit-reload>Show everything</a>
		</section>
	{/each}
</div>
<div class="diary-end" bind:this={sentinel}>
	{#if loading}
		<p role="status">Loading entries…</p>
	{:else if failure}
		<p role="alert">{failure}</p>
		<button class="diary-button" onclick={() => loadMore()}>Try again</button>
	{:else if next}
		<a
			class="diary-button"
			href={statsHref(kind, preset, next)}
			onclick={(event) => {
				event.preventDefault();
				void loadMore();
			}}>More entries</a
		>
	{:else if entries.length}
		<p>The end is just the beginning.</p>
	{/if}
</div>
<p class="sr-only" aria-live="polite">{announcement}</p>

<style>
	/* Poster stickers straight on the blue grid; columns step up so a poster
	   stays a thumbnail-sized card rather than a hero image. */
	.diary {
		display: grid;
		grid-template-columns: repeat(2, minmax(0, 1fr));
		gap: 22px 18px;
	}
	@media (min-width: 600px) {
		.diary {
			grid-template-columns: repeat(3, minmax(0, 1fr));
		}
	}
	@media (min-width: 900px) {
		.diary {
			grid-template-columns: repeat(4, minmax(0, 1fr));
		}
	}
	@media (min-width: 1100px) {
		.diary {
			grid-template-columns: repeat(5, minmax(0, 1fr));
		}
	}
	@media (min-width: 1300px) {
		.diary {
			grid-template-columns: repeat(6, minmax(0, 1fr));
		}
	}
	.diary[aria-busy='true'] {
		opacity: 0.75;
	}
	/* Month dividers are ink tabs with a hue stripe, read off the grid. */
	.month-heading {
		grid-column: 1 / -1;
		justify-self: start;
		margin: 0;
		padding: 6px 16px 5px;
		border: 3px solid var(--site-outline);
		border-bottom-width: 6px;
		border-bottom-color: #2ecc8f;
		background: var(--site-outline);
		color: #fff;
		box-shadow: var(--site-shadow-sm);
		font-family: Goldman, 'Goldman Fallback', sans-serif;
		font-size: 17px;
		font-weight: 700;
		line-height: 1.2;
		letter-spacing: 0.03em;
		text-transform: uppercase;
	}
	.month-heading:not(:first-child) {
		margin-top: 18px;
	}
	.diary-card {
		min-width: 0;
		background: #f2eff8;
		border: 3px solid var(--site-outline);
		box-shadow: var(--site-shadow-md);
		display: flex;
		flex-direction: column;
	}
	@media (prefers-reduced-motion: no-preference) {
		.diary-card {
			transition:
				transform 160ms cubic-bezier(0.16, 1, 0.3, 1),
				box-shadow 160ms cubic-bezier(0.16, 1, 0.3, 1);
		}
		.diary-card:hover {
			transform: translate(-3px, -3px);
			box-shadow: 8px 8px 0 var(--site-outline);
		}
	}
	.diary-card:hover {
		background: #fff;
	}
	.diary-poster {
		position: relative;
		aspect-ratio: 2 / 3;
		border-bottom: 3px solid var(--site-outline);
		background: #171122;
		overflow: hidden;
	}
	.diary-poster-link {
		position: absolute;
		inset: 0;
		display: block;
	}
	.diary-poster-link[href] {
		cursor: zoom-in;
	}
	.diary-poster-link:focus-visible {
		outline: 3px solid var(--accent, #1f7a53);
		outline-offset: -6px;
	}
	.diary-monogram {
		position: absolute;
		inset: 0;
		display: grid;
		place-items: center;
		background: #d9d2e8;
		font-family: Goldman, 'Goldman Fallback', sans-serif;
		font-size: 60px;
		font-weight: 700;
		color: #171122;
	}
	/* Covers are never cropped: art that is not 2:3 letterboxes on ink. */
	.diary-poster img {
		position: absolute;
		inset: 0;
		width: 100%;
		height: 100%;
		object-fit: contain;
		background: #171122;
	}
	.diary-info {
		display: flex;
		flex-direction: column;
		flex: 1;
		padding: 11px 12px 11px;
	}
	.diary-info h4 {
		margin: 0;
		font-size: 15px;
		font-weight: 850;
		line-height: 1.25;
		letter-spacing: -0.015em;
		color: var(--heading, #171122);
		overflow-wrap: break-word;
		display: -webkit-box;
		-webkit-line-clamp: 2;
		line-clamp: 2;
		-webkit-box-orient: vertical;
		overflow: hidden;
	}
	.entry-year {
		font-size: 13px;
		font-weight: 650;
		color: var(--muted, #645a74);
		font-variant-numeric: tabular-nums;
	}
	.diary-creator {
		margin: 3px 0 0;
		font-size: 13px;
		font-weight: 650;
		color: var(--ink, #332b43);
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}
	.diary-sub {
		margin: 4px 0 0;
		font-size: 12px;
		font-weight: 650;
		color: var(--muted, #645a74);
		font-variant-numeric: tabular-nums;
	}
	.diary-rating {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 4px 8px;
		margin: 6px 0 0;
	}
	.entry-rewatch {
		display: inline-flex;
		align-items: center;
		gap: 4px;
		padding: 1px 6px;
		border: 2px solid var(--site-outline);
		background: #fff;
		color: var(--site-outline);
		font-size: 11px;
		font-weight: 850;
		letter-spacing: 0.04em;
		text-transform: uppercase;
		white-space: nowrap;
	}
	.diary-stars {
		font-size: 16px;
		letter-spacing: 0.06em;
		color: var(--heading, #171122);
		text-shadow: 1px 1px 0 #ffd84a;
	}
	/* Wraps so creds drop under the tags whenever the tags need the row. */
	.diary-foot {
		display: flex;
		flex-wrap: wrap;
		align-items: flex-end;
		gap: 8px;
		margin-top: auto;
		padding-top: 10px;
	}
	/* Tags are shown raw from NewsSpeak; the uppercase label treatment gives
	   mixed-case input (led, IMAX, Atmos) one consistent look. */
	.diary-tags {
		display: flex;
		flex-wrap: wrap;
		gap: 4px;
		flex: 1 1 auto;
		min-width: 0;
		max-width: 100%;
		margin: 0;
		padding: 0;
		list-style: none;
	}
	.entry-tag {
		border: 2px solid var(--site-outline);
		background: #c9f5e0;
		color: var(--site-outline);
		padding: 2px 6px;
		font-size: 10px;
		font-weight: 800;
		line-height: 1.2;
		letter-spacing: 0.08em;
		text-transform: uppercase;
		/* A tag longer than the card breaks onto a second line inside its
		   sticker rather than spilling past the card edge. */
		max-width: 100%;
		overflow-wrap: anywhere;
	}
	.diary-creds {
		flex: none;
		margin: 0 0 0 auto;
		font-family: CommitMono, monospace;
		font-size: 14px;
		font-weight: 700;
		color: #1f7a53;
		font-variant-numeric: tabular-nums;
	}
	.diary-creds.negative {
		color: #a3245f;
	}
	.diary-end {
		text-align: center;
		padding: 30px 0 4px;
		font-size: 16px;
		font-weight: 750;
		color: #fff;
		text-shadow: 2px 2px 0 var(--site-outline);
	}
	.diary-end p {
		margin: 0 0 12px;
	}
	.diary-button {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		min-height: 48px;
		padding: 10px 24px;
		border: 3px solid var(--site-outline);
		background: #f2eff8;
		color: var(--site-outline);
		font: inherit;
		font-size: 16px;
		font-weight: 800;
		text-decoration: none;
		text-shadow: none;
		box-shadow: var(--site-shadow-md);
	}
	.diary-button:hover {
		background: #c9f5e0;
	}
	.diary-button:active {
		transform: translate(5px, 5px);
		box-shadow: none;
	}
	.diary-empty {
		grid-column: 1 / -1;
		padding: 30px 24px;
		background: #f2eff8;
		border: 3px solid var(--site-outline);
		box-shadow: var(--site-shadow-lg);
	}
	.diary-empty h4 {
		font-size: clamp(22px, 3vw, 30px);
		font-weight: 850;
		letter-spacing: -0.02em;
		margin: 0 0 10px;
		color: var(--heading, #171122);
	}
	.diary-empty p {
		margin: 0 0 18px;
		font-size: 15px;
		line-height: 1.6;
		color: var(--muted, #645a74);
	}
	@media (max-width: 760px) {
		.diary {
			gap: 16px 12px;
		}
		.diary-card {
			box-shadow: var(--site-shadow-sm);
		}
		.diary-info {
			padding: 9px 10px 10px;
		}
		.diary-info h4 {
			font-size: 14px;
		}
		.diary-monogram {
			font-size: 38px;
		}
		.diary-stars {
			font-size: 14px;
		}
		/* Narrow cards give tags the full row; creds drop beneath them. */
		.diary-tags {
			flex-basis: 100%;
		}
	}
</style>
