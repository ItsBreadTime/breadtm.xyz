<script lang="ts">
	import type { PageData } from './$types';
	import ArticleHeader from '$lib/publishing/ArticleHeader.svelte';
	import SpoilerNotice from '$lib/publishing/SpoilerNotice.svelte';
	import Contents from '$lib/publishing/Contents.svelte';
	import ArticleLightbox from '$lib/publishing/ArticleLightbox.svelte';
	import Icon from '$lib/publishing/Icon.svelte';
	import PostTags from '$lib/publishing/PostTags.svelte';
	import { dateLabel, SITE_URL, topicColor } from '$lib/publishing/model';
	import type { Post } from '$lib/publishing/types';
	let { data }: { data: PageData } = $props();
	const Article = $derived(data.Article);
	const tag = $derived(data.post.accent ?? topicColor(data.post.topics[0]));
	let proseEl = $state<HTMLElement>();
	let lightbox = $state<{ images: { src: string; alt: string }[]; index: number } | null>(null);

	function openImage(image: HTMLImageElement) {
		if (!proseEl) return;
		const images = [...proseEl.querySelectorAll('img')].filter((candidate) => candidate.src);
		const index = images.indexOf(image);
		if (index < 0) return;
		lightbox = {
			images: images.map((candidate) => ({ src: candidate.dataset.originalSrc || candidate.src, alt: candidate.alt ?? '' })),
			index
		};
	}
	function handleProseClick(event: MouseEvent) {
		const target = event.target;
		if (!(target instanceof Element)) return;
		const image = target.closest('img');
		if (image instanceof HTMLImageElement && !image.closest('a')) openImage(image);
	}
	function handleProseKeydown(event: KeyboardEvent) {
		if (event.key !== 'Enter' && event.key !== ' ') return;
		const target = event.target;
		if (target instanceof HTMLImageElement) { event.preventDefault(); openImage(target); }
	}
	$effect(() => {
		const root = proseEl;
		if (!root) return;
		const decorate = () => root.querySelectorAll('img').forEach((image) => {
			if (image.dataset.lightbox) return;
			image.dataset.lightbox = 'true';
			image.tabIndex = 0;
			image.setAttribute('role', 'button');
			image.setAttribute('aria-label', `Open image: ${image.alt || 'enlarge'}`);
		});
		decorate();
		const observer = new MutationObserver(decorate);
		observer.observe(root, { childList: true, subtree: true });
		return () => observer.disconnect();
	});
</script>
<svelte:head>
	<title>{data.post.title} · BreadTM</title>
	<meta name="description" content={data.post.description}/>
	<meta property="og:title" content={data.post.title}/><meta property="og:description" content={data.post.description}/><meta property="og:type" content="article"/>
	<link rel="canonical" href={`${SITE_URL}/blogs/${data.post.slug}`}/>
	{#if data.post.fixture}<meta name="robots" content="noindex, nofollow"/>{/if}
</svelte:head>
{#snippet providerStatus()}
	{#if data.provider}
		<div class="data-message" class:quiet={data.provider.status === 'ready'} role="status">
			{#if data.provider.status === 'error'}<p>{data.provider.message ?? 'Data is unavailable.'}</p><a href={`/blogs/${data.post.slug}`} data-sveltekit-reload>Retry loading data</a>
			{:else if data.provider.status === 'empty'}<p>There is no data to display yet.</p>
			{:else}<p>{data.provider.status === 'stale' ? 'Showing the last available data.' : 'Data snapshot'}{#if data.provider.updatedAt}{' · '}<time datetime={data.provider.updatedAt}>{dateLabel(data.provider.updatedAt, { hour: '2-digit', minute: '2-digit' })} UTC</time>{/if}</p>{/if}
		</div>
	{/if}
{/snippet}
{#snippet neighbour(post: Post, direction: 'older' | 'newer')}
	<a class={`neighbour ${direction}`} href={`/blogs/${post.slug}`}>
		<span class="date-rail" aria-hidden="true"><strong>{dateLabel(post.published, { day: '2-digit', month: undefined, year: undefined })}</strong><span>{dateLabel(post.published, { day: undefined, month: 'short', year: undefined })}</span></span>
		<span class="neighbour-copy">
			<span class="neighbour-label">{#if direction === 'older'}<Icon name="arrow-left" size={16}/> Older{:else}Newer <Icon name="arrow-right" size={16}/>{/if}</span>
			<strong>{post.title}</strong>
			<PostTags {post} inline/>
		</span>
	</a>
{/snippet}
{#snippet articleEnd(extra = '')}
	<footer class={`article-footer ${extra}`}>
		{#if data.older || data.newer}
			<nav class="post-neighbours" aria-label="More posts">
				{#if data.older}{@render neighbour(data.older, 'older')}{/if}
				{#if data.newer}{@render neighbour(data.newer, 'newer')}{/if}
			</nav>
		{/if}
		<a class="back-button" href={data.back}><Icon name="arrow-left" size={18}/> Back to blogs</a>
	</footer>
{/snippet}
<main id="main-content" lang={data.post.lang}>
	{#key data.post.slug}
		{#if data.post.kind === 'normal'}
			<article class="article-wrap" style:--tag={tag}><ArticleHeader post={data.post} back={data.back} compact={data.post.masthead === 'compact'}/>
				<div class="reading-grid"><div class="contents-column"><Contents headings={data.details.headings}/></div>
					<!-- The prose wrapper only delegates activation to the images it decorates as buttons. -->
					<!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
					<div class="prose" role="group" aria-label="Article body" bind:this={proseEl} onclick={handleProseClick} onkeydown={handleProseKeydown}><SpoilerNotice subjects={data.post.spoilers}/>{@render providerStatus()}<Article data={data.provider?.data} provider={data.provider}/></div>
				</div>
				{@render articleEnd()}
			</article>
		{:else}
			<article style:--tag={tag}><div class="article-wrap"><ArticleHeader post={data.post} back={data.back} compact={data.post.masthead === 'compact'}/><SpoilerNotice subjects={data.post.spoilers}/>{@render providerStatus()}</div>
				<div class="interactive-body"><Article data={data.provider?.data} provider={data.provider}/></div>
				{#if data.details.fallback}<noscript><div class="interactive-frame prose">{@html data.details.fallback}</div></noscript>{/if}
				{@render articleEnd('interactive-frame')}
			</article>
		{/if}
	{/key}
	{#if lightbox}
		<ArticleLightbox images={lightbox.images} index={lightbox.index} title={data.post.title} onclose={() => (lightbox = null)} />
	{/if}
</main>
