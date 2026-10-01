<script lang="ts">
	import type { RenderedPost } from './types';
	import { dateLabel } from '../model';
	import ArticleLightbox from '../ArticleLightbox.svelte';
	import Icon from '../Icon.svelte';
	import { formatTimestamp, isTimestampStyle } from './discord';

	let { post, permalink, inSeries = false }: { post: RenderedPost; permalink: string; inSeries?: boolean } = $props();

	const series = $derived(post.anthology);
	const issueHref = (issue: number) => `/breadmoji-writes/${series!.designator}/${issue}`;
	const showToc = $derived(post.headings.length >= 3 && post.wordCount >= 600);

	let proseEl = $state<HTMLElement>();
	let lightbox = $state<{ images: { src: string; alt: string }[]; index: number } | null>(null);

	function openImage(image: HTMLImageElement) {
		if (!proseEl) return;
		const images = [...proseEl.querySelectorAll<HTMLImageElement>('img:not(.dc-emoji)')].filter((candidate) => candidate.src);
		const index = images.indexOf(image);
		if (index < 0) return;
		lightbox = { images: images.map((candidate) => ({ src: candidate.src, alt: candidate.alt ?? '' })), index };
	}
	// A spoiler stays revealed once opened, like Discord's; the first activation never follows a link inside it.
	function revealSpoiler(spoiler: HTMLElement) {
		spoiler.dataset.revealed = 'true';
		spoiler.removeAttribute('role');
		spoiler.removeAttribute('aria-label');
		spoiler.removeAttribute('tabindex');
	}
	const hiddenSpoiler = (target: Element) => target.closest<HTMLElement>('.dc-spoiler:not([data-revealed])');
	function handleProseClick(event: MouseEvent) {
		const target = event.target;
		if (!(target instanceof Element)) return;
		const spoiler = hiddenSpoiler(target);
		if (spoiler) { event.preventDefault(); revealSpoiler(spoiler); return; }
		const image = target.closest('img:not(.dc-emoji)');
		if (image instanceof HTMLImageElement && !image.closest('a')) openImage(image);
	}
	function handleProseKeydown(event: KeyboardEvent) {
		if (event.key !== 'Enter' && event.key !== ' ') return;
		const target = event.target;
		if (!(target instanceof Element)) return;
		const spoiler = hiddenSpoiler(target);
		if (spoiler) { event.preventDefault(); revealSpoiler(spoiler); return; }
		if (target instanceof HTMLImageElement && !target.classList.contains('dc-emoji')) { event.preventDefault(); openImage(target); }
	}
	$effect(() => {
		const root = proseEl;
		if (!root) return;
		const decorate = () => {
			root.querySelectorAll<HTMLImageElement>('img:not(.dc-emoji)').forEach((image) => {
				if (image.dataset.lightbox) return;
				image.dataset.lightbox = 'true';
				image.tabIndex = 0;
				image.setAttribute('role', 'button');
				image.setAttribute('aria-label', `Open image: ${image.alt || 'enlarge'}`);
			});
			root.querySelectorAll<HTMLElement>('.dc-spoiler:not([data-revealed]):not([role])').forEach((spoiler) => {
				spoiler.setAttribute('role', 'button');
				spoiler.setAttribute('aria-label', 'Spoiler, activate to reveal');
			});
			// Discord shows timestamps in the reader's own locale and time zone; the server wrote UTC.
			root.querySelectorAll<HTMLTimeElement>('time.dc-time:not([data-local])').forEach((time) => {
				const date = new Date(time.dateTime);
				const style = time.dataset.format;
				time.dataset.local = 'true';
				if (Number.isNaN(date.getTime()) || !isTimestampStyle(style)) return;
				time.textContent = formatTimestamp(date, style);
				time.title = formatTimestamp(date, 'F');
			});
		};
		decorate();
		const observer = new MutationObserver(decorate);
		observer.observe(root, { childList: true, subtree: true });
		return () => observer.disconnect();
	});
</script>

<section class="stream-post" aria-labelledby="post-{post.id}-title" data-post={post.id}>
	<header class="post-head">
		{#if series}
			<!-- In the feed the sticker opens the series at this issue; inside the series it just labels it. -->
			{#if inSeries}
				<p class="series-sticker"><span class="sticker-code zine-sticker">{series.designator} #{series.issue}</span>{#if series.total}<span class="sticker-name">Issue {series.issue} of {series.total}</span>{/if}</p>
			{:else}
				<a class="series-sticker" href={issueHref(series.issue)}><span class="sticker-code zine-sticker">{series.designator} #{series.issue}</span><span class="sticker-name">{series.name}</span></a>
			{/if}
		{/if}
		<h2 id="post-{post.id}-title" tabindex="-1">{post.title}</h2>
		<p class="post-meta">
			{#if post.author.avatarUrl}<img class="post-avatar" src={post.author.avatarUrl} alt="" width="24" height="24" loading="lazy" decoding="async"/>{/if}
			<span>By <strong>{post.author.displayName}</strong> · <time datetime={post.publishedAt}>{dateLabel(post.publishedAt)}</time>{#if post.updatedAt} · Updated <time datetime={post.updatedAt}>{dateLabel(post.updatedAt)}</time>{/if} · <a class="post-permalink" href={permalink} aria-label="Permalink to this post">Permalink</a></span>
		</p>
		{#if post.reply}
			<blockquote class="reply-context">
				<p>{post.reply.text}</p>
				<footer>— {post.reply.displayName}</footer>
			</blockquote>
		{/if}
		{#if showToc}
			<details class="in-this-post">
				<summary>In this post <Icon name="chevron" size={15}/></summary>
				<nav aria-label="Sections of this post"><ol>{#each post.headings as heading}<li><a href="#{heading.id}">{heading.text}</a></li>{/each}</ol></nav>
			</details>
		{/if}
	</header>
	<!-- The prose wrapper only delegates activation to the images it decorates as buttons. -->
	<!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
	<div class="prose" role="group" aria-label="Post body" bind:this={proseEl} onclick={handleProseClick} onkeydown={handleProseKeydown}>{@html post.html}{#each post.attachments as image, i}<img src={image.url} alt="{post.title}, image {i + 1}" width={image.width} height={image.height} data-sized={image.width && image.height ? '' : undefined} style:--w={image.width} style:--h={image.height} loading="lazy" decoding="async"/>{/each}</div>
	{#if series && !inSeries && (series.previous || series.next || series.total > 1)}
		<!-- In the feed, the series continues somewhere else; inside the series the next issue simply follows. -->
		<nav class="issue-nav" aria-label="More from {series.name}">
			{#if series.previous}<a class="issue-step" href={issueHref(series.previous)} rel="prev">← Issue {series.previous}</a>{/if}
			<a class="issue-all" href="/breadmoji-writes/{series.designator}">Read {series.name} from #1</a>
			{#if series.next}<a class="issue-step" href={issueHref(series.next)} rel="next">Issue {series.next} →</a>{/if}
		</nav>
	{/if}
	{#if lightbox}
		<ArticleLightbox images={lightbox.images} index={lightbox.index} title={post.title} onclose={() => (lightbox = null)} />
	{/if}
</section>

<style>
	/* Jumps land the title 12px below the toolbar, which buries the previous post's
	   15px separator strip (margin + border) beneath the toolbar. blog.css gives every
	   h2-h4 a scene-wide 90px margin, so viewer rules carry .viewer-main to out-rank it. */
	.stream-post {
		scroll-margin-top: calc(var(--nav-h, 68px) + var(--toolbar-h, 58px) - 2px);
		/* A paper panel on the halftone: the body reads on plain paper. */
		padding: 24px 30px 30px; border: 3px solid var(--rule); background: var(--paper, #fff); box-shadow: var(--zine-shadow-lg, 6px 6px 0 #000);
	}
	.series-sticker {
		display: inline-flex; flex-wrap: wrap; align-items: center; gap: 6px 10px; margin: 0 0 14px;
		color: var(--heading); text-decoration: none;
	}
	.sticker-name { font-size: 14px; font-weight: 750; }
	a.series-sticker .sticker-name { text-decoration: underline; text-underline-offset: 4px; }
	a.series-sticker:hover .sticker-code { transform: rotate(0deg) translate(-1px, -1px); box-shadow: var(--zine-shadow-md); }
	a.series-sticker:hover .sticker-name { text-decoration-thickness: 2px; }
	:global(.viewer-main) .post-head h2 { scroll-margin-top: calc(var(--nav-h, 68px) + var(--toolbar-h, 58px) + 12px); }
	.post-head h2 {
		font-size: clamp(28px, 3.2vw, 36px); line-height: 1.15; font-weight: 800; letter-spacing: -0.02em;
		color: var(--heading); margin: 0 0 6px; overflow-wrap: break-word; outline: none;
	}
	.post-meta { display: flex; align-items: center; gap: 8px; margin: 0 0 16px; font-size: 14px; line-height: 1.5; color: var(--muted); font-variant-numeric: tabular-nums; }
	.post-meta strong { color: var(--heading); font-weight: 750; }
	.post-avatar { flex: none; width: 24px; height: 24px; border: 2px solid var(--rule); background: var(--canvas); object-fit: cover; }
	.post-permalink { color: var(--accent); text-decoration: underline; }
	.reply-context {
		margin: 0 0 18px; padding: 12px 16px; border: 2px solid var(--rule); background: var(--notice);
		font-size: 15px; line-height: 1.5; color: var(--ink);
	}
	.reply-context p { margin: 0; }
	.reply-context footer { margin-top: 6px; font-size: 13px; color: var(--muted); }
	.in-this-post { margin: 0 0 16px; border: 2px solid var(--rule); background: var(--canvas); }
	.in-this-post summary {
		display: flex; align-items: center; gap: 8px; min-height: 44px; padding: 0 12px;
		font-size: 14px; font-weight: 700; color: var(--heading); list-style: none;
	}
	.in-this-post[open] summary :global(svg) { transform: rotate(180deg); }
	.in-this-post nav { border-top: 2px solid var(--rule); padding: 8px 12px; background: var(--paper, #fff); }
	.in-this-post ol { margin: 0; padding: 0; list-style: none; }
	.in-this-post a { display: block; padding: 7px 0; color: var(--accent); text-decoration: underline; font-size: 14px; line-height: 1.4; }
	/* A tall comic page at column width runs several screens; cap it near one screen and keep
	   its shape. The lightbox still opens every image at full size. */
	:global(.viewer-main) .stream-post .prose :global(img) { --max-h: min(78dvh, 820px); width: auto; max-width: 100%; max-height: var(--max-h); }
	/* A measured attachment reserves its exact box before it loads, so nothing above the
	   reader grows under them: as wide as the column allows, then capped by the height limit. */
	:global(.viewer-main) .stream-post .prose :global(img[data-sized]) {
		width: min(100%, calc(var(--w) * 1px), calc(var(--max-h) * var(--w) / var(--h)));
		height: auto; max-height: none; aspect-ratio: var(--w) / var(--h);
		/* The reserved box reads as a page still printing, not a blank frame, until the image paints over it. */
		background: var(--canvas) radial-gradient(rgb(22 17 13 / 0.2) 1.1px, transparent 1.5px) 0 0 / 9px 9px;
	}
	/* Custom emoji sit in the line like text, not as framed images. */
	:global(.viewer-main) .stream-post .prose :global(img.dc-emoji) {
		display: inline-block; width: 1.375em; height: 1.375em; max-height: none; margin: 0 .05em; vertical-align: -.3em;
		object-fit: contain; border: 0; box-shadow: none; cursor: default;
	}
	:global(.viewer-main) .stream-post .prose :global(h3), :global(.viewer-main) .stream-post .prose :global(h4),
	:global(.viewer-main) .stream-post .prose :global(h5), :global(.viewer-main) .stream-post .prose :global(h6) { scroll-margin-top: calc(var(--nav-h, 68px) + var(--toolbar-h, 58px) + 12px); }
	.issue-nav {
		display: flex; flex-wrap: wrap; align-items: center; gap: 12px; margin-top: 28px; padding-top: 18px;
		border-top: 3px dotted var(--rule);
	}
	.issue-nav a {
		display: inline-flex; align-items: center; min-height: 44px; padding: 8px 14px;
		border: 3px solid var(--rule); background: var(--paper, #fff); color: var(--heading); box-shadow: var(--zine-shadow-md, 4px 4px 0 #000);
		font-size: 14px; font-weight: 750; text-decoration: none;
	}
	.issue-nav a:hover { background: var(--zine-yellow); }
	.issue-nav a:active { transform: translate(4px, 4px); box-shadow: none; }
	.issue-nav .issue-all { background: var(--zine-cyan); }
	.issue-nav [rel="next"] { margin-left: auto; }
	@media (max-width: 760px) {
		.stream-post { padding: 16px 14px 20px; box-shadow: var(--zine-shadow-md, 4px 4px 0 #000); }
		.post-head h2 { font-size: 28px; line-height: 1.2; }
		/* Leave room for the docked control bar and a line of text around the image. */
		:global(.viewer-main) .stream-post .prose :global(img) { --max-h: 68dvh; }
		/* Pre-JS fallback only: the wrapped toolbar is taller than the measured value once JS runs. */
		:global(.viewer-main) .post-head h2, .stream-post, :global(.viewer-main) .stream-post .prose :global(h3), :global(.viewer-main) .stream-post .prose :global(h4),
		:global(.viewer-main) .stream-post .prose :global(h5), :global(.viewer-main) .stream-post .prose :global(h6) { scroll-margin-top: calc(var(--nav-h, 68px) + var(--toolbar-h, 112px) + 12px); }
	}
</style>
