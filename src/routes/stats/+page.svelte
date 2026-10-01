<script lang="ts">
	import type { PageData } from './$types';
	import { monthName, type BarDatum } from '$lib/stats/newsspeak';
	import BarChart from '$lib/components/stats/BarChart.svelte';
	import FilterChips from '$lib/components/stats/FilterChips.svelte';
	import SummaryStrip from '$lib/components/stats/SummaryStrip.svelte';
	import NowConsuming from '$lib/components/stats/NowConsuming.svelte';
	import GenreBars from '$lib/components/stats/GenreBars.svelte';
	import OnRepeat from '$lib/components/stats/OnRepeat.svelte';
	import DiaryFeed from '$lib/components/stats/DiaryFeed.svelte';
	import ArticleLightbox from '$lib/publishing/ArticleLightbox.svelte';

	let { data }: { data: PageData } = $props();

	const monthData: BarDatum[] = $derived(
		data.months.map((month, index, all) => ({
			key: month.key,
			label: monthName(month.key),
			count: month.count,
			axis: index === 0 || month.key.slice(0, 4) !== all[index - 1].key.slice(0, 4) ? month.key.slice(0, 4) : undefined
		}))
	);
	const ratingData: BarDatum[] = $derived(
		data.ratings.map((bucket) => ({ key: bucket.label, label: `${bucket.label}★`, count: bucket.count, axis: bucket.label }))
	);

	// Poster art links straight to the image (the no-JS path); with JS a click
	// opens the lightbox instead, stepping through the art in the same section.
	let lightbox = $state<{ images: { src: string; alt: string }[]; index: number; title: string } | null>(null);

	function openPoster(event: MouseEvent) {
		if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
		const link = event.target instanceof Element ? event.target.closest<HTMLAnchorElement>('a[data-poster][href]') : null;
		if (!link) return;
		const group = link.closest<HTMLElement>('[data-poster-group]');
		const links = [...(group ?? document).querySelectorAll<HTMLAnchorElement>('a[data-poster][href]')];
		event.preventDefault();
		lightbox = {
			images: links.map((candidate) => ({ src: candidate.href, alt: candidate.dataset.poster ?? '' })),
			index: Math.max(0, links.indexOf(link)),
			title: group?.dataset.posterGroup ?? link.dataset.poster ?? ''
		};
	}
</script>

<svelte:document onclick={openPoster} />

<svelte:head>
	<title>Stats · BreadTM</title>
	<meta name="description" content="Bread's media consumption ledger — movies, shows, and books logged via NewsSpeak." />
	<link rel="canonical" href="https://breadtm.xyz/stats" />
	<!-- Poster art is hotlinked; the lightbox and download link must not leak a referrer either. -->
	<meta name="referrer" content="no-referrer" />
</svelte:head>

<main id="main-content" class="stats-stage">
	<div class="stats-shell">
		<header class="masthead">
			<h1 class="stamp"><span>Stats</span></h1>
			<FilterChips kind={data.kind} preset={data.preset} />
		</header>

		{#if data.summary && data.creds}
			<div class="board">
				<section class="panel area-summary" aria-labelledby="stats-summary">
					<h2 class="sr-only" id="stats-summary">Summary</h2>
					<div class="panel-body">
						<SummaryStrip summary={data.summary} creds={data.creds} mix={data.mix} />
					</div>
				</section>

				<section class="panel area-now" aria-labelledby="stats-now" data-poster-group="Now consuming">
					<header class="panel-head"><h2 id="stats-now">Now consuming</h2></header>
					<div class="panel-body">
						<NowConsuming items={data.current} />
					</div>
				</section>

				<section class="panel area-months" aria-labelledby="stats-months">
					<header class="panel-head"><h2 id="stats-months">Entries per month</h2></header>
					<div class="panel-body">
						{#if monthData.length}
							<BarChart data={monthData} ariaLabel="Entries per month" height={150} />
						{:else}
							<p class="section-empty">No entries in this slice.</p>
						{/if}
					</div>
				</section>

				<section class="panel area-ratings" aria-labelledby="stats-ratings">
					<header class="panel-head"><h2 id="stats-ratings">Ratings <small>out of 5</small></h2></header>
					<div class="panel-body">
						{#if ratingData.some((bucket) => bucket.count)}
							<BarChart
								data={ratingData}
								ariaLabel="Ratings histogram"
								unit="logs"
								unitSingular="log"
								height={150}
							/>
						{:else}
							<p class="section-empty">No ratings in this slice.</p>
						{/if}
					</div>
				</section>

				<section class="panel area-genres" aria-labelledby="stats-genres">
					<header class="panel-head"><h2 id="stats-genres">Top genres</h2></header>
					<div class="panel-body">
						<GenreBars genres={data.genres} />
					</div>
				</section>

				<section class="panel area-repeat" aria-labelledby="stats-repeat">
					<header class="panel-head"><h2 id="stats-repeat">On repeat</h2></header>
					<div class="panel-body">
						<OnRepeat items={data.mostConsumed} />
					</div>
				</section>
			</div>

			<section class="diary-section" aria-labelledby="stats-diary" data-poster-group="Diary">
				<h2 class="stamp stamp-small" id="stats-diary"><span>Diary</span></h2>
				<DiaryFeed initialEntries={data.diary} initialNext={data.next} kind={data.kind} preset={data.preset} />
			</section>
		{:else}
			<div class="panel error-panel" role="alert">
				<header class="panel-head"><h2>The ledger is unreachable</h2></header>
				<div class="panel-body">
					<p>{data.error}</p>
					<a class="stats-button" href="/stats" data-sveltekit-reload>Retry</a>
				</div>
			</div>
		{/if}
	</div>
</main>

{#if lightbox}
	<ArticleLightbox images={lightbox.images} index={lightbox.index} title={lightbox.title} onclose={() => (lightbox = null)} />
{/if}

<style>
	/* The blue grid is the site's home field (Home, Blogs); Stats is its loudest
	   page: every module is a separate ink-framed sticker with a hard offset,
	   titled on a black strip. The chrome stays in the page accent so the
	   movie / show / book colours are the only loud ones. */
	.stats-stage {
		--ink: var(--site-outline);
		--paper: #f2eff8;
		--shadow: var(--site-shadow-lg);
		--shadow-sm: var(--site-shadow-sm);
		min-height: calc(100dvh - 72px);
		padding: 20px 0 64px;
		background: #287cff
			url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='56' height='56'%3E%3Cpath d='M56 0H0V56' fill='none' stroke='%231a55cf' stroke-width='1.6' stroke-opacity='.55'/%3E%3C/svg%3E");
		color: var(--ink);
		/* Hidden chart tips still take up layout space and can poke past the
		   viewport edge; mobile browsers pan to them despite body's clip. */
		overflow-x: clip;
	}
	.stats-shell {
		width: min(1340px, calc(100% - 48px));
		margin: 0 auto;
	}

	/* ---------------------------------------------------------- masthead */
	.masthead {
		display: grid;
		grid-template-columns: minmax(0, 1fr);
		grid-template-areas: 'stamp' 'filters';
		align-items: end;
		gap: 14px 22px;
		margin-bottom: 30px;
	}
	.masthead > :global(.filter-rail) {
		grid-area: filters;
	}
	.stamp {
		grid-area: stamp;
		justify-self: start;
		margin: 0;
		border: 4px solid var(--ink);
		background: #2ecc8f;
		box-shadow: var(--shadow);
		transform: rotate(-2deg);
		transform-origin: 20% 80%;
	}
	.stamp span {
		display: block;
		padding: 0.08em 0.28em 0.12em;
		font-family: Goldman, 'Goldman Fallback', sans-serif;
		font-size: clamp(3rem, 7vw, 5.5rem);
		font-weight: 700;
		line-height: 0.95;
		letter-spacing: 0;
		text-transform: uppercase;
		color: var(--ink);
		/* Cel shade on the letters: the accent's own dark step. */
		text-shadow: 0.05em 0.05em 0 #1f7a53;
	}
	@media (prefers-reduced-motion: no-preference) {
		.masthead .stamp {
			animation: stamp-slam 420ms steps(3, jump-end) backwards;
		}
		@keyframes stamp-slam {
			0% {
				opacity: 0;
				transform: translate(-6px, -14px) scale(1.2) rotate(-7deg);
			}
			50% {
				opacity: 1;
				transform: scale(0.96) rotate(-1deg);
			}
			100% {
				transform: rotate(-2deg);
			}
		}
	}

	/* ------------------------------------------------------------- board */
	.board {
		display: grid;
		grid-template-columns: repeat(3, minmax(0, 1fr));
		grid-template-areas:
			'summary summary now'
			'months months ratings'
			'genres genres repeat';
		gap: 28px 26px;
		align-items: start;
	}
	.area-summary {
		grid-area: summary;
	}
	.area-now {
		grid-area: now;
		align-self: stretch;
	}
	.area-months {
		grid-area: months;
		align-self: stretch;
	}
	.area-ratings {
		grid-area: ratings;
		align-self: stretch;
	}
	.area-genres {
		grid-area: genres;
		align-self: stretch;
	}
	.area-repeat {
		grid-area: repeat;
		align-self: stretch;
	}

	.panel {
		min-width: 0;
		border: 3px solid var(--ink);
		background: var(--paper);
		box-shadow: var(--shadow);
	}
	.panel-head {
		display: flex;
		align-items: center;
		gap: 12px;
		min-height: 44px;
		padding: 8px 16px 7px;
		background: var(--ink);
		border-bottom: 5px solid #2ecc8f;
	}
	.panel-head h2 {
		margin: 0;
		font-family: Goldman, 'Goldman Fallback', sans-serif;
		font-size: 22px;
		font-weight: 700;
		line-height: 1.1;
		letter-spacing: 0.03em;
		text-transform: uppercase;
		color: #f2eff8;
	}
	.panel-head h2 small {
		margin-left: 6px;
		font-family: Inter, 'Inter Fallback', sans-serif;
		font-size: 13px;
		font-weight: 700;
		letter-spacing: 0;
		text-transform: none;
		color: #c9c3d6;
	}
	.panel-body {
		padding: 18px 20px 20px;
	}
	.section-empty {
		margin: 0;
		font-size: 15px;
		font-weight: 600;
		color: var(--muted, #645a74);
	}

	/* ------------------------------------------------------------- diary */
	.diary-section {
		margin-top: 52px;
	}
	.stamp-small {
		margin-bottom: 26px;
		box-shadow: var(--site-shadow-md);
	}
	.stamp-small span {
		font-size: clamp(1.9rem, 3.4vw, 2.6rem);
			}

	/* ------------------------------------------------------------- error */
	.error-panel {
		max-width: 640px;
	}
	.error-panel p {
		margin: 0 0 18px;
		font-size: 16px;
		font-weight: 600;
		color: var(--ink);
	}
	.stats-button {
		display: inline-flex;
		align-items: center;
		min-height: 46px;
		padding: 10px 22px;
		border: 3px solid var(--ink);
		background: #2ecc8f;
		color: var(--ink);
		font-size: 16px;
		font-weight: 800;
		text-decoration: none;
		box-shadow: var(--shadow-sm);
	}
	.stats-button:active {
		transform: translate(4px, 4px);
		box-shadow: none;
	}

	@media (min-width: 1400px) {
		.stats-shell {
			width: 1340px;
		}
	}
	@media (max-width: 1099px) {
		.board {
			grid-template-columns: repeat(2, minmax(0, 1fr));
			grid-template-areas:
				'summary summary'
				'now repeat'
				'months months'
				'ratings genres';
		}
	}
	@media (max-width: 899px) {
		.board {
			grid-template-areas:
				'summary summary'
				'now repeat'
				'months months'
				'ratings ratings'
				'genres genres';
		}
	}
	@media (max-width: 760px) {
		.stats-stage {
			padding-top: 14px;
			--shadow: var(--site-shadow-md);
		}
		.stats-shell {
			width: calc(100% - 32px);
		}
		.masthead {
			gap: 12px;
			margin-bottom: 24px;
		}
		.board {
			grid-template-columns: minmax(0, 1fr);
			grid-template-areas: 'summary' 'now' 'months' 'ratings' 'genres' 'repeat';
			gap: 22px;
		}
		.panel-body {
			padding: 14px 14px 16px;
		}
		.panel-head h2 {
			font-size: 19px;
		}
		.diary-section {
			margin-top: 40px;
		}
	}
</style>
