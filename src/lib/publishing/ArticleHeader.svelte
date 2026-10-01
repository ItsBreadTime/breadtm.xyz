<script lang="ts">
	import type { Post } from './types';
	import { dateLabel, isWideCover } from './model';
	import { ARTICLE_COVER_SIZES } from './imageSizes';
	import EditHistory from './EditHistory.svelte';
	import Icon from './Icon.svelte';
	import PostTags from './PostTags.svelte';
	let { post, back = '/blogs' }: { post: Post; back?: string } = $props();
	const wide = $derived(isWideCover(post.cover));
</script>
<header class="article-header">
	<a class="back-button" href={back}><Icon name="arrow-left" size={19}/> Blogs</a>
	<div class="article-card" class:has-cover={post.cover} class:wide-cover={wide}>
		{#if post.cover}
			<figure class="article-cover">
				<img src={post.cover.src} srcset={post.cover.srcset} style:background-image={post.cover.placeholder} style:background-size="cover" style:background-position="center" sizes={ARTICLE_COVER_SIZES} alt={post.cover.alt} width={post.cover.width} height={post.cover.height} fetchpriority="high"/>
				{#if post.cover.credit}<figcaption>{post.cover.credit}</figcaption>{/if}
			</figure>
		{/if}
		<div class="article-card-body">
			<div class="date-rail" aria-hidden="true"><strong>{dateLabel(post.published, { day: '2-digit', month: undefined, year: undefined })}</strong><span>{dateLabel(post.published, { day: undefined, month: 'short', year: undefined })}</span><span>{dateLabel(post.published, { day: undefined, month: undefined })}</span></div>
			<div class="article-title-group">
				<PostTags {post}/>
				<h1>{post.title}</h1>
				{#if post.description}<p class="article-deck">{post.description}</p>{/if}
				<div class="article-meta">
					<span>Published <time datetime={post.published}>{dateLabel(post.published)}</time></span>
					{#if post.updated}<span>Edited <time datetime={post.updated}>{dateLabel(post.updated)}</time></span><EditHistory edits={post.edits}/>{/if}
					{#if post.minutes}<span>{post.minutes} min read</span>{/if}
				</div>
			</div>
		</div>
	</div>
</header>
