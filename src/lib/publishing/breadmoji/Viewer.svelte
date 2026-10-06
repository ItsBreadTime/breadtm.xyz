<script lang="ts">
	import { onMount, tick } from 'svelte';
	import { pushState, replaceState } from '$app/navigation';
	import type { ViewerData } from './types';
	import { RSS_URL } from './constants';
	import { dateLabel } from '../model';
	import { ViewerStream, isReady, READ_AHEAD } from './stream.svelte';
	import ContentDisclaimer from '../ContentDisclaimer.svelte';
	import Icon from '../Icon.svelte';
	import ViewerPost from './ViewerPost.svelte';
	import ViewerNav from './ViewerNav.svelte';
	import ViewerToolbar from './ViewerToolbar.svelte';
	import Sidebar from '$lib/components/site/Sidebar.svelte';

	let { data }: { data: ViewerData } = $props();

	// Seeded from the server payload so SSR renders the requested post; the effect below reseeds on real navigations.
	// svelte-ignore state_referenced_locally
	const stream = new ViewerStream(data);
	const series = $derived(stream.series);
	const pageTitle = (title: string) => `${title} · ${series?.name ?? 'Breadmoji writes'} · BreadTM`;

	// Which list the sidebar shows: the reading list (posts, or a series' issues) or every series.
	let sideTab = $state<'posts' | 'series'>('posts');
	let drawerOpen = $state(false);
	let toolbarEl = $state<HTMLElement>();
	let navScroller = $state<HTMLElement>();
	let drawerScroller = $state<HTMLElement>();
	let mainEl = $state<HTMLElement>();
	let streamEl = $state<HTMLElement>();
	let topSentinel = $state<HTMLDivElement>();
	let bottomSentinel = $state<HTMLDivElement>();

	let selectionGen = 0;
	let jumping = false;
	let settleTimer: ReturnType<typeof setTimeout> | undefined;
	let pendingCandidate = '';
	let lastNavInteraction = 0;
	const markNavInteraction = () => { lastNavInteraction = Date.now(); };
	/** How far past the viewport an edge starts loading: about two screens of runway. */
	const LOOKAHEAD = 1600;
	let topNear = false;
	let bottomNear = false;
	// The first upward scroll opts in to growing the stream above; a deep link never grows above its landing unasked.
	let wantsNewer = false;
	let lastScrollY = 0;

	let mounted = false;
	// Issue numbers repeat across series, so the reseed key carries the series too.
	const seedKey = (value: ViewerData) => `${value.series?.designator ?? ''}/${value.post.id}`;
	// svelte-ignore state_referenced_locally
	let lastSeedKey = seedKey(data);
	$effect(() => {
		if (seedKey(data) === lastSeedKey) return;
		lastSeedKey = seedKey(data);
		stream.reseed(data);
		wantsNewer = false;
		// The component is reused across client-side navigations; onMount does not re-run.
		if (mounted) void appendNeighbours(stream.olderNeighbours(stream.currentId));
	});

	/** Fill in the older neighbours of a fresh window, then let the pump keep going if the edge is still in range. */
	async function appendNeighbours(ids: string[]) {
		await stream.appendNeighbours(ids);
		await tick();
		bottomNear = edgeInRange(bottomSentinel, 'bottom');
		void pumpOlder();
	}

	function edgeInRange(sentinel: HTMLElement | undefined, edge: 'top' | 'bottom') {
		if (!sentinel) return false;
		const rect = sentinel.getBoundingClientRect();
		return edge === 'bottom' ? rect.top < window.innerHeight + LOOKAHEAD : rect.bottom > -LOOKAHEAD;
	}

	/**
	 * Keep loading while an edge stays in range. The observer only reports crossings, so a
	 * short batch (images not yet sized) that leaves the sentinel in range would otherwise
	 * stall there until the reader scrolled away and back. A batch that adds nothing stops the pump.
	 */
	async function pumpOlder() {
		if (!bottomNear || stream.status.olderBodies !== 'idle' || !stream.hasOlderBelowWindow) return;
		const before = stream.windowIds.length;
		await stream.extendOlderBodies(READ_AHEAD);
		await tick();
		bottomNear = edgeInRange(bottomSentinel, 'bottom');
		if (stream.windowIds.length > before) void pumpOlder();
	}

	/** An edge link: a real page of posts without JS, an in-place load with it. */
	function loadEdge(event: MouseEvent, direction: 'older' | 'newer') {
		if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
		event.preventDefault();
		void (direction === 'older' ? stream.extendOlderBodies(READ_AHEAD) : stream.extendNewerBodies(READ_AHEAD));
	}

	async function pumpNewer() {
		if (!topNear || !wantsNewer || jumping || stream.status.newerBodies !== 'idle') return;
		if (!stream.hasNewerAboveWindow && !stream.moreNewer) return;
		const before = stream.windowIds.length;
		await stream.extendNewerBodies(READ_AHEAD);
		await tick();
		topNear = edgeInRange(topSentinel, 'top');
		if (stream.windowIds.length > before) void pumpNewer();
	}

	// Read-ahead: whenever the window moves, fetch the next batch past each live edge into the
	// cache, so the pumps append from memory instead of waiting on the network at the edge.
	$effect(() => {
		void stream.windowIds;
		const timer = setTimeout(() => {
			void stream.prefetch('older');
			if (wantsNewer) void stream.prefetch('newer');
		}, 300);
		return () => clearTimeout(timer);
	});

	// Infinite sidebar: an edge sentinel entering its scroller's vicinity pages titles in that direction.
	$effect(() => {
		const observers = [navScroller, drawerScroller].filter((scroller): scroller is HTMLElement => !!scroller).map((scroller) => {
			const observer = new IntersectionObserver(records => {
				for (const record of records) {
					if (!record.isIntersecting) continue;
					if ((record.target as HTMLElement).dataset.navEdge === 'newer') {
						if (stream.moreNewer && stream.status.newerTitles === 'idle') void stream.checkNewerTitles();
					} else if (stream.moreOlder && stream.status.olderTitles === 'idle') void stream.pageOlderTitles();
				}
			}, { root: scroller, rootMargin: '240px 0px' });
			for (const edge of scroller.querySelectorAll('[data-nav-edge]')) observer.observe(edge);
			return observer;
		});
		return () => { for (const observer of observers) observer.disconnect(); };
	});

	const headingFor = (id: string) => document.getElementById(`post-${id}-title`);
	const historyState = (id: string) => ({ viewer: { id, window: $state.snapshot(stream.windowIds) as string[], y: window.scrollY } });
	function showTitle(id: string) {
		const title = stream.titleOf(id);
		if (title) document.title = pageTitle(title);
		return title;
	}

	async function jumpTo(id: string, focus: boolean, push = true) {
		jumping = true;
		await tick();
		const heading = headingFor(id);
		if (heading) {
			heading.scrollIntoView({ block: 'start' });
			if (focus) heading.focus({ preventScroll: true });
		}
		stream.currentId = id;
		if (push) pushState(stream.postHref(id), historyState(id));
		stream.announcement = `Moved to ${showTitle(id) ?? stream.noun.one}.`;
		await tick();
		followNav();
		setTimeout(() => {
			jumping = false;
			// The landing is stable now; resume the newer-body load the jump may have deferred.
			void pumpNewer();
		}, 500);
	}

	/** A deliberate selection: inside the window jump, at an edge extend, otherwise open a fresh contiguous window. */
	async function selectPost(id: string, { focus = true, push = true } = {}) {
		if (id === stream.currentId && stream.windowIds.includes(id)) { if (drawerOpen) closeDrawer(); return; }
		const gen = ++selectionGen;
		stream.pendingId = id;
		try {
			if (stream.windowIds.includes(id)) { await jumpTo(id, focus, push); }
			else {
				const targetIndex = stream.indexOf(id);
				const headIndex = stream.indexOf(stream.windowIds[0]);
				const tailIndex = stream.indexOf(stream.windowIds[stream.windowIds.length - 1]);
				if (targetIndex >= 0 && (targetIndex === headIndex - 1 || targetIndex === tailIndex + 1)) {
					await stream.loadBodies([id], targetIndex < headIndex ? 'prepend' : 'append');
					if (gen !== selectionGen) return;
					await jumpTo(id, focus, push);
				} else {
					// Distant selection: a fresh window, never implying adjacency across a gap.
					if (!isReady(stream.bodies.get(id))) {
						try { await stream.loadBodies([id], 'replace'); } catch { /* marked below */ }
						if (gen !== selectionGen) return;
						if (!isReady(stream.bodies.get(id))) { stream.announcement = `That ${stream.noun.one} could not be loaded.`; return; }
					} else stream.windowIds = [id];
					await jumpTo(id, focus, push);
					void appendNeighbours(stream.olderNeighbours(id));
				}
			}
			if (drawerOpen) closeDrawer(false);
		} finally { if (gen === selectionGen) stream.pendingId = null; }
	}

	async function stepPost(direction: 'newer' | 'older') {
		if (direction === 'newer' && stream.currentIndex <= 0 && stream.moreNewer) await stream.checkNewerTitles();
		if (direction === 'older' && stream.currentIndex >= stream.summaries.length - 1 && stream.moreOlder) await stream.pageOlderTitles();
		const target = direction === 'newer' ? stream.summaries[stream.currentIndex - 1] : stream.summaries[stream.currentIndex + 1];
		if (target) await selectPost(target.id);
		else stream.announcement = series
			? (direction === 'newer' ? 'This is the first issue.' : 'This is the latest issue.')
			: (direction === 'newer' ? 'You’re at the newest loaded post.' : 'You’ve reached the oldest post.');
	}

	/** The viewport band left for reading once the sticky chrome is subtracted. */
	function readingArea() {
		const viewportBottom = window.innerHeight;
		const toolbarRect = toolbarEl?.getBoundingClientRect();
		// Docked to the viewport bottom on phones, the toolbar bounds the reading
		// area from below and only the sticky site nav covers the top.
		const dockedBottom = !!toolbarRect && toolbarRect.top > viewportBottom / 2;
		const navBottom = document.querySelector('.site-navigation')?.getBoundingClientRect().bottom ?? 0;
		return {
			top: dockedBottom ? navBottom : (toolbarRect?.bottom ?? 130),
			bottom: dockedBottom ? (toolbarRect?.top ?? viewportBottom) : viewportBottom
		};
	}

	/**
	 * Scroll-follow: the current post is the one under the reading line, a third of the way
	 * down the reading area, where the eye actually is. Screen share misreads a long post
	 * still filling the view after the next title has taken over the reader's attention.
	 */
	function syncCurrent() {
		if (jumping || !stream.windowIds.length) return;
		const { top: areaTop, bottom: areaBottom } = readingArea();
		const readingLine = areaTop + (areaBottom - areaTop) / 3;
		// A short final post can never reach the line; at the page end, the last visible title wins.
		const atEnd = window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 2;
		const threshold = atEnd ? areaBottom : readingLine;
		let candidate = '';
		for (const id of stream.windowIds) {
			const section = document.querySelector(`.stream-post[data-post="${id}"]`);
			if (!section) continue;
			// Sections render in window order: the last one whose top has crossed the line holds it.
			if (section.getBoundingClientRect().top <= threshold || !candidate) candidate = id;
			else break;
		}
		if (!candidate || candidate === stream.currentId || candidate === pendingCandidate) return;
		pendingCandidate = candidate;
		if (settleTimer) clearTimeout(settleTimer);
		settleTimer = setTimeout(() => {
			if (jumping || pendingCandidate === stream.currentId) return;
			stream.currentId = pendingCandidate;
			replaceState(stream.postHref(stream.currentId), historyState(stream.currentId));
			showTitle(stream.currentId);
			// The .current class lands with Svelte's next batch; measuring earlier
			// reads the previous item and the list lags one post behind forever.
			void tick().then(followNav);
		}, 150);
	}

	/**
	 * Keep the current entry in the upper part of the list so the posts that come next stay
	 * in view: once it drifts out of the 15–50% band it is realigned to a third of the way down,
	 * rather than riding the bottom edge until it falls off.
	 */
	function followNav() {
		if (Date.now() - lastNavInteraction < 2000) return;
		for (const scroller of [navScroller, drawerScroller]) {
			if (!scroller) continue;
			const active = scroller.querySelector<HTMLElement>('.nav-item.current');
			if (!active) continue;
			const box = scroller.getBoundingClientRect();
			const rect = active.getBoundingClientRect();
			const top = rect.top - box.top + scroller.scrollTop;
			const bottom = top + rect.height;
			const view = scroller.clientHeight;
			const inBand = top >= scroller.scrollTop + view * 0.15 && bottom <= scroller.scrollTop + view * 0.5;
			// Manual scrollTop keeps this a nav-only scroll; scrollIntoView could move the page too.
			if (!inBand) scroller.scrollTo({ top: Math.max(0, top - view / 3), behavior: 'smooth' });
		}
	}

	// The Posts drawer is a native <details>, so the list opens without JS; bind:open
	// keeps drawerOpen in step with the summary toggle. Center the current entry on open.
	$effect(() => {
		if (!drawerOpen) return;
		void tick().then(() => {
			const scroller = drawerScroller;
			const active = scroller?.querySelector<HTMLElement>('.nav-item.current');
			if (!scroller || !active) return;
			const box = scroller.getBoundingClientRect();
			const rect = active.getBoundingClientRect();
			const top = rect.top - box.top + scroller.scrollTop - scroller.clientHeight / 2 + rect.height / 2;
			scroller.scrollTo({ top: Math.max(0, top) });
		});
	});
	function closeDrawer(refocus = true) {
		drawerOpen = false;
		// A dismissal returns focus to Posts; a completed selection has already focused the target heading.
		if (refocus) document.getElementById('posts-toggle')?.focus();
	}

	onMount(() => {
		mounted = true;
		// The initial enhanced window: the selected post plus its next two older neighbours.
		void appendNeighbours(stream.olderNeighbours(stream.currentId));

		// Anchor geometry: jumps land the title just below the toolbar with the previous post's
		// separator hidden beneath it, so the measured toolbar height feeds the scroll margins.
		const setToolbarH = () => mainEl?.style.setProperty('--toolbar-h', `${toolbarEl?.offsetHeight ?? 58}px`);
		setToolbarH();
		const toolbarObserver = new ResizeObserver(setToolbarH);
		if (toolbarEl) toolbarObserver.observe(toolbarEl);
		// A deep link into the archive lands with the current entry below the fold of the nav list.
		followNav();

		lastScrollY = window.scrollY;
		// Pinned at the top of the page, an upward gesture scrolls nothing and fires no scroll event,
		// so the gesture itself has to count as asking for newer posts.
		const wantNewer = () => { if (!wantsNewer) { wantsNewer = true; void stream.prefetch('newer'); void pumpNewer(); } };
		const onScroll = () => {
			// Prepend corrections scroll down, so only a reader's own upward scroll reads as intent.
			if (window.scrollY < lastScrollY - 4) wantNewer();
			lastScrollY = window.scrollY;
			// Observers can lag or skip a crossing (throttled tabs, momentum scrolls); a cheap
			// measurement on scroll keeps the pumps from ever depending on them alone.
			if (stream.status.olderBodies !== 'loading' && !bottomNear && edgeInRange(bottomSentinel, 'bottom')) { bottomNear = true; void pumpOlder(); }
			if (wantsNewer && stream.status.newerBodies !== 'loading' && !topNear && edgeInRange(topSentinel, 'top')) { topNear = true; void pumpNewer(); }
			syncCurrent();
		};
		let touchY = 0;
		const onWheel = (event: WheelEvent) => { if (event.deltaY < 0) wantNewer(); };
		const onTouchStart = (event: TouchEvent) => { touchY = event.touches[0]?.clientY ?? 0; };
		const onTouchMove = (event: TouchEvent) => { if ((event.touches[0]?.clientY ?? 0) > touchY + 8) wantNewer(); };
		const onKey = (event: KeyboardEvent) => {
			if (['ArrowUp', 'PageUp', 'Home'].includes(event.key)) wantNewer();
			if (event.key === 'Escape' && drawerOpen) closeDrawer();
		};
		window.addEventListener('scroll', onScroll, { passive: true });
		window.addEventListener('wheel', onWheel, { passive: true });
		window.addEventListener('touchstart', onTouchStart, { passive: true });
		window.addEventListener('touchmove', onTouchMove, { passive: true });
		window.addEventListener('keydown', onKey);

		// A prepend displaces the page, so pumpNewer never races a jump's own scrolling;
		// the jump-settle hook in jumpTo picks the load back up once the landing is stable.
		// Records are delivered late: one queued before a batch landed can report a crossing the
		// pump has already re-measured past, so an observer only prompts a fresh measurement.
		const topObserver = new IntersectionObserver(() => {
			topNear = edgeInRange(topSentinel, 'top');
			void pumpNewer();
		}, { rootMargin: `${LOOKAHEAD}px 0px 0px 0px` });
		if (topSentinel) topObserver.observe(topSentinel);

		const bottomObserver = new IntersectionObserver(() => {
			bottomNear = edgeInRange(bottomSentinel, 'bottom');
			void pumpOlder();
		}, { rootMargin: `0px 0px ${LOOKAHEAD}px 0px` });
		if (bottomSentinel) bottomObserver.observe(bottomSentinel);

		// Back/Forward: SvelteKit's afterNavigate must be registered during component
		// initialization, so the popstate history entry is read directly here instead.
		const onPopState = () => {
			const state = ((history.state as { 'sveltekit:states'?: { viewer?: { id: string; window: string[]; y: number } } })?.['sveltekit:states'] ?? {}).viewer;
			// Entries pushed by deliberate selections carry their window; the initial
			// load's entry carries none, so fall back to the post the URL names.
			const targetId = state?.id ?? location.pathname.split('/').filter(Boolean).pop();
			if (!targetId || targetId === stream.currentId) return;
			showTitle(targetId);
			if (!state) { void selectPost(targetId, { focus: false, push: false }); return; }
			const cached = [...new Set(state.window)].filter(id => stream.bodies.has(id));
			jumping = true;
			stream.windowIds = cached.includes(state.id) ? cached : [state.id];
			stream.currentId = state.id;
			void tick().then(() => {
				const heading = headingFor(state.id);
				if (heading) heading.scrollIntoView({ block: 'start' });
				else window.scrollTo(0, state.y ?? 0);
				followNav();
				setTimeout(() => { jumping = false; }, 400);
			});
		};
		window.addEventListener('popstate', onPopState);

		return () => {
			window.removeEventListener('scroll', onScroll);
			window.removeEventListener('wheel', onWheel);
			window.removeEventListener('touchstart', onTouchStart);
			window.removeEventListener('touchmove', onTouchMove);
			window.removeEventListener('keydown', onKey);
			window.removeEventListener('popstate', onPopState);
			topObserver.disconnect();
			bottomObserver.disconnect();
			toolbarObserver.disconnect();
			stream.abort();
			if (settleTimer) clearTimeout(settleTimer);
		};
	});
</script>

{#snippet browse(variant: 'panel' | 'drawer')}
	{#if variant === 'panel'}
		<ViewerNav {stream} anthologies={data.anthologies} variant="panel" bind:sideTab bind:scroller={navScroller} onselect={(id) => void selectPost(id)} oninteract={markNavInteraction}/>
	{:else}
		<ViewerNav {stream} anthologies={data.anthologies} variant="drawer" bind:sideTab bind:scroller={drawerScroller} onselect={(id) => void selectPost(id)} oninteract={markNavInteraction}/>
	{/if}
{/snippet}

<main id="main-content" class="viewer-main" bind:this={mainEl}>
	<div class="viewer-shell">
		<ViewerToolbar {stream} bind:drawerOpen bind:element={toolbarEl} onselect={(id) => void selectPost(id)} onstep={(direction) => void stepPost(direction)} onclose={() => closeDrawer()}>
			{#snippet drawer()}{@render browse('drawer')}{/snippet}
		</ViewerToolbar>

		<div class="notice-row">
			<ContentDisclaimer/>
			<a class="rss-button" href={RSS_URL} target="_blank" rel="noreferrer" aria-label="Subscribe to the Breadmoji writes RSS feed"><Icon name="rss" size={17}/><span class="rss-label">RSS</span></a>
		</div>
		{#if series?.description}<p class="series-blurb">{series.description}</p>{/if}
		{#if data.stale}
			<p class="stale-note">Showing a snapshot from <time datetime={data.fetchedAt}>{dateLabel(data.fetchedAt, { hour: '2-digit', minute: '2-digit' })} UTC</time>. <a href={stream.postHref(data.post.id)} data-sveltekit-reload>Refresh</a></p>
		{/if}

		<div class="viewer-grid">
			<Sidebar label="Browse" class="posts-panel">{@render browse('panel')}</Sidebar>

			<div class="stream" bind:this={streamEl}>
				<div bind:this={topSentinel} class="stream-sentinel" aria-hidden="true"></div>
				{#if stream.hasNewerAboveWindow || stream.moreNewer}
					<div class="stream-boundary">
						{#if stream.status.newerBodies === 'loading'}<p role="status">Loading {series ? 'earlier issues' : 'newer posts'}…</p>
						{:else if stream.status.newerBodies === 'failed'}<p role="alert">{series ? 'Earlier issues' : 'Newer posts'} could not be loaded.</p><button class="blog-button" onclick={() => void stream.extendNewerBodies(READ_AHEAD)}>Try again</button>
						{:else if stream.pageAboveWindow}<a class="blog-button" href={stream.postHref(stream.pageAboveWindow.id)} rel="prev" onclick={(event) => loadEdge(event, 'newer')}>↑ Load {series ? 'earlier issues' : 'newer posts'}</a>
						{:else}<button class="blog-button" onclick={() => void stream.extendNewerBodies(READ_AHEAD)}>↑ Load {series ? 'earlier issues' : 'newer posts'}</button>{/if}
					</div>
				{/if}

				{#each stream.streamItems as item (item.id)}
					{#if isReady(item.body)}
						<ViewerPost post={item.body} permalink={stream.permalinkFor(item.body)} inSeries={!!series}/>
					{:else if item.body}
						<section class="stream-post post-unavailable" aria-label="Unavailable post">
							<p role="alert">{item.body.error}</p>
							<button class="blog-button" onclick={() => void stream.retry(item.id)}>Retry this post</button>
						</section>
					{/if}
				{/each}

				<div class="stream-boundary">
					{#if stream.status.olderBodies === 'loading'}<p role="status">Loading {series ? 'later issues' : 'older posts'}…</p>
					{:else if stream.status.olderBodies === 'failed'}<p role="alert">{series ? 'Later issues' : 'Older posts'} could not be loaded.</p><button class="blog-button" onclick={() => void stream.extendOlderBodies(READ_AHEAD)}>Try again</button>
					{:else if stream.nextBelowWindow}<a class="blog-button" href={stream.postHref(stream.nextBelowWindow.id)} rel="next" onclick={(event) => loadEdge(event, 'older')}>Load {series ? 'later issues' : 'older posts'} ↓</a>
					{:else if stream.hasOlderBelowWindow}<button class="blog-button" onclick={() => void stream.extendOlderBodies(READ_AHEAD)}>Load {series ? 'later issues' : 'older posts'} ↓</button>
					{:else}<p class="stream-end">{series ? `That’s the latest issue of ${series.name}.` : 'You’ve reached the oldest post.'}</p>{/if}
				</div>
				<div bind:this={bottomSentinel} class="stream-sentinel" aria-hidden="true"></div>
			</div>
		</div>
	</div>

	<p class="sr-only" aria-live="polite">{stream.announcement}</p>
</main>

<style>
	.viewer-main { min-height: calc(100dvh - 72px); }
	.viewer-shell { width: min(1280px, calc(100% - 64px)); margin: 0 auto; padding: 16px 0 56px; }

	/* ── Notices ─────────────────────────────────────────────────── */
	.notice-row { display: flex; align-items: stretch; gap: 12px; margin: 0 0 14px; }
	.notice-row :global(.content-disclaimer) { flex: 1; min-width: 0; }
	.rss-button {
		display: inline-flex; align-items: center; justify-content: center; gap: 8px; flex: none;
		min-height: 44px; padding: 8px 14px; border: 3px solid var(--rule); box-shadow: var(--zine-shadow-md);
		background: var(--zine-pink); color: var(--heading);
		font-family: Goldman, 'Goldman Fallback', sans-serif; font-size: 14px; font-weight: 700; text-transform: uppercase; text-decoration: none;
	}
	.rss-button:hover { background: #ffa6d4; }
	.rss-button:active { transform: translate(4px, 4px); box-shadow: none; }
	.series-blurb {
		margin: 0 0 14px; padding: 10px 14px; max-width: 80ch; border: 3px solid var(--rule); background: var(--paper);
		font-size: 15px; line-height: 1.5; color: var(--ink); box-shadow: var(--zine-shadow-sm);
	}
	.series-blurb::before {
		content: 'About'; margin-right: 10px; padding: 1px 6px; border: 2px solid var(--rule); background: var(--zine-cyan);
		font-family: Goldman, 'Goldman Fallback', sans-serif; font-size: 12px; font-weight: 700; text-transform: uppercase; color: var(--heading);
	}
	.stale-note { margin: 0 0 12px; font-size: 14px; color: var(--muted); }
	.stale-note a { color: var(--accent); text-decoration: underline; }

	/* ── Sidebar: a paper panel; ViewerNav styles the lists inside ── */
	.viewer-grid { display: grid; grid-template-columns: 280px minmax(0, 1fr); gap: 32px; align-items: start; margin-top: 16px; }
	.viewer-grid {
		--sidebar-top: calc(var(--nav-h, 68px) + var(--toolbar-h, 66px) + 16px);
		--sidebar-border: 3px solid var(--rule); --sidebar-bg: var(--paper); --sidebar-shadow: var(--zine-shadow-lg); --sidebar-scrollbar: var(--muted);
	}

	/* ── Stream: each post is its own paper panel ───────────────── */
	.stream { min-width: 0; overflow-anchor: none; }
	.stream > :global(.stream-post + .stream-post), .stream > :global(.stream-post + .post-unavailable) { margin-top: 28px; }
	.stream-boundary { display: flex; flex-wrap: wrap; align-items: center; gap: 10px; padding: 14px 0; font-size: 14px; color: var(--muted); }
	.stream-boundary p { margin: 0; }
	.stream-boundary .blog-button { min-height: 44px; }
	.stream-end {
		padding: 4px 10px; border: 2px dashed var(--rule); background: var(--paper);
		font-family: Goldman, 'Goldman Fallback', sans-serif; font-size: 13px; font-weight: 700; text-transform: uppercase; color: var(--heading);
	}
	.stream-sentinel { height: 1px; }
	.post-unavailable { border: 3px dashed var(--rule); background: var(--paper); padding: 18px; }
	.post-unavailable p { margin: 0 0 10px; font-size: 15px; color: var(--heading); }

	@media (min-width: 1000px) and (max-width: 1199px) {
		.viewer-grid { grid-template-columns: 250px minmax(0, 1fr); gap: 24px; }
	}
	@media (max-width: 999px) {
		.viewer-grid > :global(.posts-panel) { display: none; }
		.viewer-grid { display: block; }
	}
	@media (max-width: 760px) {
		.viewer-shell {
			width: calc(100% - 24px); padding-top: 10px;
			/* Keep the stream's tail clear of the docked control bar. */
			padding-bottom: calc(84px + env(safe-area-inset-bottom, 0px));
		}
		/* With the bar at the bottom, jump targets only need to clear the navbar. */
		.viewer-main { --toolbar-h: 0px !important; }
		/* The RSS stamp docks beside the disclaimer instead of a full-width slab. */
		.rss-button { width: 44px; padding: 8px 0; align-self: flex-start; box-shadow: var(--zine-shadow-sm); }
		.rss-label { display: none; }
		.stream > :global(.stream-post + .stream-post) { margin-top: 20px; }
	}
	@media (max-height: 600px) {
		.viewer-shell { padding-bottom: 48px; }
	}
</style>
