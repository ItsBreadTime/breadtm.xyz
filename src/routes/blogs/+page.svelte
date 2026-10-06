<script lang="ts">
	import { onMount } from 'svelte';
	import { replaceState } from '$app/navigation';
	import type { PageData, Snapshot } from './$types';
	import type { Post, ArchivePage } from '$lib/publishing/types';
	import { archiveHref, dateLabel, isWideCover, monthKey, SITE_URL, topicColor } from '$lib/publishing/model';
	import Icon from '$lib/publishing/Icon.svelte';
	import PostTags from '$lib/publishing/PostTags.svelte';
	import { ARTICLE_COVER_SIZES, ENTRY_COVER_SIZES, FEATURE_COVER_SIZES } from '$lib/publishing/imageSizes';

	let { data }: { data: PageData } = $props();

	// svelte-ignore state_referenced_locally
	let searchValue = $state(data.query);
	let announcement = $state('');
	let sentinel = $state<HTMLDivElement>();
	let controller: AbortController | undefined;
	let searchTimer: ReturnType<typeof setTimeout> | undefined;
	let searching = $state(false);
	// svelte-ignore state_referenced_locally
	let entries = $state<Post[]>(data.posts);
	// svelte-ignore state_referenced_locally
	let next = $state<string | null>(data.next);
	let loading = $state(false);
	let failure = $state('');
	let failedSearch: string | undefined;
	let live = $state<{ query: string; total: number } | undefined>();
	const liveQuery = $derived(live ? live.query : data.query);
	const liveTotal = $derived(live ? live.total : data.total);
	const currentHref = $derived(archiveHref(liveQuery, data.kind, data.topic));
	const filtered = $derived(Boolean(liveQuery || data.topic || data.kind !== 'all'));
	// An archive with no posts at all gets no search, filters or second RSS button: just the empty note.
	const archiveEmpty = $derived(!filtered && data.total === 0 && entries.length === 0);

	$effect(() => {
		controller?.abort();
		if (searchTimer) clearTimeout(searchTimer);
		searchValue = data.query;
		announcement = '';
		failure = ''; failedSearch = undefined;
		searching = false;
		live = undefined;
		entries = data.posts; next = data.next;
	});

	type SnapshotState = { entries: Post[]; next: string | null; revision: string; key: string };
	export const snapshot: Snapshot<SnapshotState> = {
		capture: () => ({ entries: $state.snapshot(entries), next, revision: data.revision, key: currentHref }),
		restore: value => {
			if (value.key !== currentHref) return;
			if (value.revision === data.revision) { entries = value.entries; next = value.next; }
		}
	};

	async function loadMore() {
		if (!next || loading) return;
		controller?.abort();
		const request = new AbortController(); controller = request;
		loading = true; failure = ''; failedSearch = undefined;
		try {
			const url = archiveHref(liveQuery, data.kind, data.topic, next).replace('/blogs?', '/blogs/archive.json?');
			const response = await fetch(url, { signal: request.signal });
			if (!response.ok) throw new Error(response.status === 409 ? 'The journal has changed. Refresh to see the latest entries.' : 'More entries could not be loaded.');
			const batch: ArchivePage = await response.json();
			if (batch.revision !== data.revision) throw new Error('The journal has changed. Refresh to see the latest entries.');
			const existing = new Set(entries.map(p => p.slug));
			const extra = batch.posts.filter(p => !existing.has(p.slug));
			entries = [...entries, ...extra]; next = batch.next;
			announcement = `${extra.length} more entries loaded.`;
		} catch (error) { if (!request.signal.aborted) failure = error instanceof Error ? error.message : 'More entries could not be loaded.'; }
		finally { if (controller === request) loading = false; }
	}
	async function runSearch(query: string) {
		if (searchTimer) clearTimeout(searchTimer);
		controller?.abort();
		const request = new AbortController(); controller = request;
		const params = new URLSearchParams();
		if (query) params.set('q', query);
		if (data.kind !== 'all') params.set('type', data.kind);
		if (data.topic) params.set('topic', data.topic);
		replaceState(`/blogs${params.size ? `?${params}` : ''}`, {});
		loading = true; searching = true; failure = ''; failedSearch = undefined;
		try {
			const response = await fetch(`/blogs/archive.json?${params}`, { signal: request.signal });
			if (!response.ok) throw new Error('Search is unavailable right now.');
			const batch: ArchivePage = await response.json();
			if (request.signal.aborted) return;
			entries = batch.posts; next = batch.next;
			live = { query, total: batch.total };
			announcement = `${batch.total} ${batch.total === 1 ? 'entry' : 'entries'} found.`;
		} catch (error) { if (!request.signal.aborted) { failedSearch = query; failure = error instanceof Error ? error.message : 'Search is unavailable right now.'; } }
		finally { if (controller === request) { loading = false; searching = false; } }
	}

	function handleSearchInput(event: Event) {
		const value = (event.currentTarget as HTMLInputElement).value;
		if (searchTimer) clearTimeout(searchTimer);
		searchTimer = setTimeout(() => void runSearch(value.trim()), 160);
	}

	// The newest entry leads the unfiltered archive as the front-page feature; everything else is filed below it.
	const feature = $derived(filtered ? undefined : entries[0]);
	const rows = $derived(feature ? entries.slice(1) : entries);
	const entryHref = (post: Post) => `/blogs/${post.slug}?from=${encodeURIComponent(currentHref + '#entry-' + post.slug)}`;
	// Hovering an entry warms its article cover at the size the article renders it (see prefetchLinkImage).
	const coverPrefetch = (post: Post) => post.cover ? { 'data-prefetch-image': post.cover.src, 'data-prefetch-srcset': post.cover.srcset, 'data-prefetch-sizes': ARTICLE_COVER_SIZES } : {};

	let bottomArmed = true;
	onMount(() => {
		const observer = new IntersectionObserver(records => {
			for (const record of records) {
				if (record.isIntersecting && bottomArmed) { bottomArmed = false; void loadMore(); }
				if (!record.isIntersecting) bottomArmed = true;
			}
		}, { rootMargin: '500px' });
		if (sentinel) observer.observe(sentinel);
		return () => { observer.disconnect(); controller?.abort(); if (searchTimer) clearTimeout(searchTimer); };
	});
</script>
<svelte:head>
	<title>Blogs · BreadTM</title>
	<meta name="description" content="Essays, experiments, and other interests from BreadTM."/>
	<link rel="canonical" href={`${SITE_URL}/blogs`}/>
</svelte:head>

{#snippet details(post: Post)}
	<p class="entry-meta">
		<span>Published <time datetime={post.published}>{dateLabel(post.published)}</time></span>
		{#if post.updated}<span>Edited <time datetime={post.updated}>{dateLabel(post.updated)}</time></span>{/if}
		{#if post.minutes}<span>{post.minutes} min read</span>{/if}
	</p>
	{#if post.spoilers.length}<p class="entry-spoilers"><Icon name="warning" size={16}/><span>Spoilers: {post.spoilers.map(s => s.work).join(', ')}</span></p>{/if}
{/snippet}

<main id="main-content" class="journal-stage">
	<div class="masthead-block">
		<div class="journal-shell masthead-row">
			<h1>Blogs</h1>
			{#if !archiveEmpty}
				<a href="/blogs/rss.xml" class="rss-link" data-sveltekit-reload aria-label="Subscribe to the BreadTM blog RSS feed"><Icon name="rss" size={19}/> RSS</a>
			{/if}
		</div>
	</div>

	<div class="journal-shell journal-layout" class:archive-empty={archiveEmpty}>
		{#if !archiveEmpty}
		<aside class="journal-index" aria-label="Browse posts">
			<form class="journal-search" method="GET" action="/blogs" role="search" onsubmit={event => { event.preventDefault(); void runSearch(searchValue.trim()); }}>
				<input type="hidden" name="type" value={data.kind}/>
				<input type="hidden" name="topic" value={data.topic}/>
				<label class="sr-only" for="blog-search">Search my posts</label>
				<Icon name="search" size={20}/>
				<input id="blog-search" name="q" type="search" placeholder="Search my posts…" bind:value={searchValue} oninput={handleSearchInput}/>
				<button type="submit" aria-label="Search my posts"><Icon name="arrow-right" size={20}/></button>
			</form>
			<nav class="index-section" aria-labelledby="format-label">
				<h2 class="section-label" id="format-label">Format</h2>
				<ul class="format-list">{#each [['all', 'All'], ['normal', 'Articles'], ['interactive', 'Interactive']] as [value, label]}<li><a href={archiveHref(liveQuery, value, data.topic)} aria-current={data.kind === value ? 'page' : undefined}>{label}</a></li>{/each}</ul>
			</nav>
			{#if data.topics.length}
				<nav class="index-section" aria-labelledby="tags-label">
					<h2 class="section-label" id="tags-label">Tags</h2>
					<ul class="tag-list">
						{#each data.topics as { name, count }}
							<li><a style:--tag={topicColor(name)} href={archiveHref(liveQuery, data.kind, data.topic === name ? '' : name)} aria-current={data.topic === name ? 'true' : undefined}><span>{name}</span><span class="tag-count">{count}</span></a></li>
						{/each}
					</ul>
					{#if data.topic}<a class="tag-clear" href={archiveHref(liveQuery, data.kind, '')}>Clear tag</a>{/if}
				</nav>
			{/if}
		</aside>
		{/if}

		<div class="journal-main">
			{#if data.notice}<p class="archive-notice">{data.notice}</p>{/if}
			{#if searching}<p class="search-status" role="status">Searching…</p>{/if}
			{#if filtered}
				<div class="search-summary"><p>{liveTotal} {liveTotal === 1 ? 'entry' : 'entries'}{liveQuery ? ` matching “${liveQuery}”` : ''}{data.topic ? ` tagged ${data.topic}` : ''}{data.kind !== 'all' ? ` · ${data.kind === 'normal' ? 'Articles' : 'Interactive'}` : ''}</p><a href="/blogs" data-sveltekit-reload>Clear filters</a></div>
			{/if}

			{#if feature}
				<article class="feature" class:has-cover={feature.cover} class:wide-cover={isWideCover(feature.cover)} id={`entry-${feature.slug}`} aria-busy={searching} style:--feature={feature.accent ?? topicColor(feature.topics[0])}>
					{#if feature.cover}<a class="feature-cover" href={entryHref(feature)} {...coverPrefetch(feature)} tabindex="-1" aria-hidden="true"><img src={feature.cover.src} srcset={feature.cover.srcset} style:background-image={feature.cover.placeholder} style:background-size="cover" style:background-position="center" sizes={FEATURE_COVER_SIZES} decoding="async" alt="" loading="eager" width={feature.cover.width} height={feature.cover.height}/></a>{/if}
					<div class="feature-copy">
						<p class="section-label">Latest</p>
						<PostTags post={feature} class="entry-tags"/>
						<h2><a href={entryHref(feature)} {...coverPrefetch(feature)}>{feature.title}</a></h2>
						{#if feature.description}<p class="feature-summary">{feature.description}</p>{/if}
						{@render details(feature)}
					</div>
				</article>
			{/if}

			{#if rows.length}
				<div class="journal" aria-label="Blog entries" aria-busy={searching}>
					{#each rows as post, index (post.slug)}
						{#if index === 0 || monthKey(post.effectiveDate) !== monthKey(rows[index - 1].effectiveDate)}<h2 class="month-heading">{dateLabel(post.effectiveDate, { day: undefined, month: 'long' })}</h2>{/if}
						<article class="entry" id={`entry-${post.slug}`}>
							<div class="date-rail" aria-hidden="true"><strong>{dateLabel(post.effectiveDate, { day: '2-digit', month: undefined, year: undefined })}</strong><span>{dateLabel(post.effectiveDate, { day: undefined, month: 'short', year: undefined })}</span></div>
							<div class="entry-copy">
								<PostTags {post} class="entry-tags"/>
								<h3><a href={entryHref(post)} {...coverPrefetch(post)}>{post.title}</a></h3>
								{#if post.description}<p class="entry-summary">{post.description}</p>{/if}
								{@render details(post)}
							</div>
							{#if post.cover}<a class="entry-cover" href={entryHref(post)} {...coverPrefetch(post)} tabindex="-1" aria-hidden="true"><img src={post.cover.src} srcset={post.cover.srcset} style:background-image={post.cover.placeholder} style:background-size="cover" style:background-position="center" sizes={ENTRY_COVER_SIZES} decoding="async" alt="" loading="lazy" width={post.cover.width} height={post.cover.height}/></a>{/if}
						</article>
					{/each}
				</div>
			{:else if !feature}
				<section class="journal-empty"><h2>{filtered ? 'Nothing turned up.' : "There's nothing out there..."}</h2><p>{filtered ? 'Try another search, or come back to the whole journal.' : 'Perhaps next month?'}</p>{#if filtered}<a class="blog-button" href="/blogs" data-sveltekit-reload>Show all posts</a>{:else}<a class="blog-button" href="/blogs/rss.xml" data-sveltekit-reload><Icon name="rss" size={20}/> Follow via RSS</a>{/if}</section>
			{/if}

			<div class="archive-end" bind:this={sentinel}>
				{#if loading}<p role="status">Loading entries…</p>{:else if failure}<p role="alert">{failure}</p>{#if failure.includes('changed')}<a class="blog-button" href={currentHref} data-sveltekit-reload>Refresh journal</a>{:else}<button class="blog-button" onclick={() => failedSearch !== undefined ? runSearch(failedSearch) : loadMore()}>Try again</button>{/if}
				{:else if next}<a class="blog-button" href={archiveHref(liveQuery, data.kind, data.topic, next)} onclick={event => { event.preventDefault(); void loadMore(); }}>More entries <Icon name="chevron" size={18}/></a>
				{:else if entries.length}<p>You’ve reached the beginning.</p>{/if}
			</div>
			<p class="sr-only" aria-live="polite">{announcement}</p>
		</div>
	</div>
</main>

<style>
	.journal-stage { min-height: calc(100dvh - 72px); padding-bottom: 40px; background: #287cff url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='32' height='32'%3E%3Cpath d='M32 0H0V32' fill='none' stroke='%231756c0' stroke-opacity='.4'/%3E%3C/svg%3E"); color: #08080c; }
	.journal-shell { width: min(1340px, calc(100% - 48px)); margin: 0 auto; }
	.masthead-block { background: #287cff; }
	.masthead-row { display: flex; align-items: center; gap: 20px; min-height: 56px; }
	.masthead-row h1 { font-size: 48px; line-height: 1; font-weight: 900; letter-spacing: -0.04em; color: #fff; margin: 0; }
	.rss-link {
		display: flex; align-items: center; justify-content: center; gap: 8px; margin-left: auto;
		min-height: 44px; min-width: 88px; padding: 8px 16px; border: 3px solid var(--site-outline);
		background: #e6e3ef; color: #000; font-size: 15px; font-weight: 800; text-decoration: none;
		box-shadow: var(--site-shadow-sm);
	}
	/* Quiet by default (the sidebar's paper colour) so it doesn't compete with the
	   featured post; the pink only arrives on hover. */
	.rss-link:hover { background: #f3a5e8; }
	/* Hit areas reach past each moving control by as far as it lifts or presses, so the target
	   never slides out from under the pointer between mousedown and mouseup. */
	.rss-link, .format-list a, .tag-list a, .archive-end :global(.blog-button) { position: relative; }
	.rss-link::before, .archive-end :global(.blog-button)::before { content: ''; position: absolute; inset: -7px -3px -3px -7px; }
	.format-list a::before, .tag-list a::before { content: ''; position: absolute; inset: -6px -4px -4px -6px; }
	.rss-link:active { transform: translate(4px, 4px); box-shadow: 0 0 0 #000; }

	/* The posts, with a browsing column beside them that keeps tags in view instead of behind a filter drawer. */
	.journal-layout { display: grid; grid-template-columns: minmax(0, 1fr) 280px; gap: 20px; align-items: start; margin-top: 12px; }
	.journal-layout.archive-empty { grid-template-columns: minmax(0, 1fr); }
	.journal-main { grid-column: 1; grid-row: 1; min-width: 0; }
	.journal-index { grid-column: 2; grid-row: 1; position: sticky; top: calc(var(--nav-h, 72px) + 12px); display: grid; gap: 18px; padding: 14px 16px 16px; background: #e6e3ef; border: 3px solid var(--site-outline); box-shadow: var(--site-shadow-md); }
	.section-label { margin: 0 0 10px; font-size: 12px; font-weight: 750; line-height: 1.4; letter-spacing: 0.12em; text-transform: uppercase; color: #645a74; }
	.journal-search { display: flex; align-items: center; gap: 10px; border: 3px solid var(--site-outline); background: #f2eff8; padding: 0 0 0 12px; min-height: 44px; }
	.journal-search input { width: 100%; min-width: 0; border: 0; background: transparent; padding: 8px 0; color: #171122; font-size: 16px; }
	.journal-search input::placeholder { color: #645a74; }
	.journal-search button { display: grid; place-items: center; align-self: stretch; min-width: 44px; background: #f2eff8; color: #171122; border-left: 1px solid #171122; }
	.journal-search button:hover { background: #d9d2e8; }
	.journal-search:focus-within { border-color: #6638c8; }
	.journal-search input:focus-visible, .journal-search button:focus-visible { outline: none; }
	.index-section ul { list-style: none; margin: 0; padding: 0; }
	.format-list { display: grid; grid-template-columns: repeat(3, auto); gap: 6px; }
	.tag-list { display: flex; flex-wrap: wrap; gap: 8px; }
	.format-list a, .tag-list a { display: flex; align-items: center; justify-content: center; gap: 8px; min-height: 44px; padding: 6px 12px; border: 3px solid var(--site-outline); background: var(--tag, #f2eff8); color: #08080c; text-decoration: none; font-size: 14px; font-weight: 750; box-shadow: var(--site-shadow-sm); }
	.format-list a { padding: 6px 8px; }
	.format-list a:hover { background: #ded3f5; }
	.tag-list a:hover { filter: brightness(1.06); }
	/* A selected filter stays pressed into the page. */
	.format-list a[aria-current], .tag-list a[aria-current] { transform: translate(3px, 3px); box-shadow: 0 0 0 #000; }
	.format-list a[aria-current] { background: #6337d8; color: #fff; }
	.tag-list a[aria-current] { background: #08080c; color: var(--tag, #fff); }
	.tag-count { font-size: 12px; font-weight: 800; font-variant-numeric: tabular-nums; color: #2b2533; }
	.tag-list a[aria-current] .tag-count { color: #fff; }
	.tag-clear { display: inline-flex; align-items: center; min-height: 44px; margin-top: 4px; color: #171122; font-size: 14px; font-weight: 700; text-decoration: underline; }

	.archive-notice, .search-summary { margin: 0 0 12px; background: #e6e3ef; border: 2px solid var(--site-outline); padding: 8px 12px; font-size: 14px; }
	.search-summary { display: flex; flex-wrap: wrap; justify-content: space-between; gap: 4px 15px; }
	.search-summary p { margin: 0; }
	.search-summary a { text-decoration: underline; }
	.search-status { display: inline-block; margin: 0 0 12px; padding: 6px 12px; background: #e6e3ef; border: 2px solid var(--site-outline); font-size: 14px; font-weight: 650; }

	/* Shared entry parts. */
	.journal-stage :global(.entry-tags) { margin-bottom: 8px; }
	.entry-meta { display: flex; flex-wrap: wrap; gap: 2px 14px; margin: 10px 0 0; color: #645a74; font-size: 13px; line-height: 1.5; }
	.entry-spoilers { display: flex; align-items: stretch; width: fit-content; margin: 8px 0 0; border: 2px solid var(--site-outline); background: #f2eff8; color: #171122; font-size: 13px; font-weight: 700; line-height: 1.4; }
	.entry-spoilers :global(svg) { box-sizing: content-box; height: auto; align-self: stretch; padding: 3px 6px; background: #fcd34d; border-right: 2px solid var(--site-outline); }
	.entry-spoilers span { padding: 3px 8px; }
	h2 a, h3 a { text-decoration: none; }
	h2 a:hover, h3 a:hover { text-decoration: underline; text-decoration-thickness: 2px; }
	.feature h2 a::after, .entry h3 a::after { content: ''; position: absolute; inset: -9px -7px -7px -9px; z-index: 1; }
	.feature h2 a:focus-visible, .entry h3 a:focus-visible { outline: none; }
	.feature h2 a:focus-visible::after, .entry h3 a:focus-visible::after { outline: 3px solid #6337d8; outline-offset: -6px; }
	/* The feature sits on an accent fill, where a dimmed visited title loses contrast: it stays black. */
	.entry h3 a:visited { color: #4e435e; }

	/* The newest post leads the unfiltered archive. */
	.feature { position: relative; display: grid; margin-bottom: 24px; background: var(--feature, #e6e3ef); border: 3px solid var(--site-outline); box-shadow: var(--site-shadow-lg); }
	.feature.has-cover { grid-template-columns: minmax(0, 1.55fr) minmax(0, 1fr); }
	/* Panoramic covers read better across the full card than squeezed beside the text. */
	.feature.wide-cover { grid-template-columns: minmax(0, 1fr); }
	.feature.wide-cover .feature-cover { border-right: 0; border-bottom: 3px solid var(--site-outline); }
	.feature.wide-cover .feature-cover img { width: 100%; max-height: none; }
	.feature .section-label, .feature .entry-meta { color: #2b2533; }
	.feature-cover { display: grid; place-items: center; background: #08080c; border-right: 3px solid var(--site-outline); }
	.feature-cover img { display: block; max-width: 100%; max-height: 560px; width: auto; height: auto; }
	.feature-copy { display: flex; flex-direction: column; justify-content: flex-end; padding: 20px 24px 24px; }
	.feature h2 { margin: 0; font-size: clamp(32px, 3.4vw, 48px); font-weight: 900; line-height: 1.05; letter-spacing: -0.035em; color: #08080c; overflow-wrap: break-word; }
	.feature-summary { margin: 12px 0 0; font-size: 18px; line-height: 1.5; color: #1d1826; max-width: 50ch; }

	/* Each post is its own card, so every entry can be picked up and pressed. */
	.journal { display: grid; gap: 16px; }
	.journal[aria-busy='true'], .feature[aria-busy='true'] { opacity: 0.75; }
	.month-heading { width: fit-content; margin: 0 0 -4px; padding: 6px 16px; background: #6940e4; color: #fff; font-size: 17px; line-height: 1.25; font-weight: 850; border: 3px solid var(--site-outline); box-shadow: var(--site-shadow-sm); }
	.month-heading:not(:first-child) { margin-top: 14px; }
	.entry { position: relative; display: grid; grid-template-columns: 56px minmax(0, 1fr); }
	.entry:has(.entry-cover) { grid-template-columns: 56px minmax(0, 1fr) auto; }
	.date-rail { display: flex; flex-direction: column; align-items: center; gap: 1px; padding: 14px 4px 8px; background: #6337d8; color: #fff; border-right: 2px solid var(--site-outline); line-height: 1; }
	.date-rail strong { font-size: 24px; line-height: 1.05; font-weight: 850; font-variant-numeric: tabular-nums; }
	.date-rail span { font-size: 12px; font-weight: 650; text-transform: uppercase; }
	.entry { background: #e6e3ef; border: 3px solid var(--site-outline); box-shadow: var(--site-shadow-md); }
	.entry-copy { min-width: 0; padding: 14px 18px 16px; }
	.entry h3 { margin: 0; font-size: 23px; font-weight: 850; line-height: 1.2; letter-spacing: -0.02em; color: #08080c; overflow-wrap: break-word; }
	.entry-summary { margin: 6px 0 0; font-size: 16px; line-height: 1.45; color: #4e435e; max-width: 65ch; display: -webkit-box; -webkit-line-clamp: 2; line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
	.entry-cover { display: grid; place-items: center; align-self: center; padding: 14px 14px 14px 0; }
	.entry-cover img { display: block; max-width: 300px; max-height: 210px; width: auto; height: auto; border: 3px solid var(--site-outline); }

	.archive-end { padding: 16px 0 0; text-align: center; }
	.archive-end p { display: inline-block; margin: 0 0 10px; padding: 6px 12px; background: #e6e3ef; border: 2px solid var(--site-outline); font-size: 14px; font-weight: 650; }
	.archive-end :global(.blog-button) { background: #ffe14d; color: #08080c; box-shadow: var(--site-shadow-sm); border: 3px solid var(--site-outline); min-height: 44px; font-weight: 800; }
	.archive-end :global(.blog-button:active) { transform: translate(4px, 4px); box-shadow: 0 0 0 #000; }
	.journal-empty { max-width: 720px; padding: 36px 24px; background: #e6e3ef; border: 3px solid var(--site-outline); box-shadow: var(--site-shadow-md); }
	.journal-empty h2 { font-size: clamp(24px, 3vw, 34px); font-weight: 850; letter-spacing: -0.02em; line-height: 1.2; margin: 0 0 12px; }
	.journal-empty p { margin: 0 0 18px; font-size: 16px; line-height: 1.6; max-width: 55ch; }
	.journal-empty .blog-button { background: #f2eff8; color: #08080c; border: 3px solid var(--site-outline); }

	/* Cards lift toward the pointer and press flat when clicked. */
	@media (hover: hover) {
		.feature:hover { transform: translate(-3px, -3px); box-shadow: 11px 11px 0 var(--site-outline); }
		.entry:hover { transform: translate(-3px, -3px); box-shadow: 9px 9px 0 var(--site-outline); }
		.format-list a:not([aria-current]):hover, .tag-list a:not([aria-current]):hover { transform: translate(-1px, -1px); box-shadow: var(--site-shadow-sm); }
	}
	.feature:active, .entry:active { transform: translate(5px, 5px); box-shadow: 1px 1px 0 var(--site-outline); }
	@media (prefers-reduced-motion: no-preference) {
		.feature, .entry, .format-list a, .tag-list a, .rss-link, .archive-end :global(.blog-button) { transition: transform 110ms ease-out, box-shadow 110ms ease-out, background-color 110ms; }
	}
	@media (prefers-reduced-motion: reduce) {
		.feature:hover, .entry:hover, .feature:active, .entry:active { transform: none; }
	}

	@media (min-width: 761px) { .journal-stage { padding-top: 16px; } }
	@media (min-width: 1400px) { .journal-shell { width: 1340px; } }
	@media (max-width: 1100px) {
		.feature.has-cover { grid-template-columns: minmax(0, 1fr); }
		.feature-cover { border-right: 0; border-bottom: 3px solid var(--site-outline); }
	}
	@media (max-width: 999px) and (min-width: 761px) { .masthead-row h1 { font-size: 40px; } }
	@media (max-width: 900px) {
		.journal-layout { grid-template-columns: minmax(0, 1fr); }
		.journal-main, .journal-index { grid-column: 1; grid-row: auto; }
		.journal-index { position: static; gap: 12px; box-shadow: var(--site-shadow-md); }
	}
	@media (max-width: 760px) {
		.journal-stage { padding-top: 10px; }
		.journal-shell { width: calc(100% - 24px); }
		.masthead-row { flex-wrap: wrap; gap: 8px; min-height: 0; padding-bottom: 8px; }
		.masthead-row h1 { font-size: 36px; }
		.rss-link { min-width: 0; min-height: 44px; font-size: 14px; padding: 8px 12px; box-shadow: var(--site-shadow-sm); }
		.journal-layout { margin-top: 8px; gap: 12px; }
		/* On phones the latest post comes first; browsing follows it, ahead of the older entries. */
		.journal-main { display: contents; }
		.journal-main > * { order: 3; }
		.journal-main > .archive-notice, .journal-main > .search-status, .journal-main > .search-summary { order: 0; margin-bottom: 0; }
		.journal-main > .feature { order: 1; margin-bottom: 0; }
		.journal-index { order: 2; padding: 12px; }
		.feature-copy { padding: 14px 14px 16px; }
		.feature h2 { font-size: clamp(28px, 8vw, 36px); }
		.feature-summary { font-size: 16px; }
		.entry, .entry:has(.entry-cover) { grid-template-columns: 44px minmax(0, 1fr); }
		.date-rail { grid-row: 1 / span 2; padding-top: 12px; }
		.date-rail strong { font-size: 20px; }
		.date-rail span { font-size: 11px; }
		.entry-copy { padding: 12px 12px 14px; }
		.entry h3 { font-size: 20px; line-height: 1.25; }
		.entry-cover { grid-column: 2; justify-content: start; padding: 0 12px 14px; }
		.entry-cover img { max-width: 100%; max-height: 260px; }
		.feature, .entry { box-shadow: var(--site-shadow-md); }
		.journal-empty { padding: 24px 16px; }
	}
</style>
