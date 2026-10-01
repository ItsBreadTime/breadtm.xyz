<script lang="ts">
	import type { PageData } from './$types';
	import { RSS_URL } from '$lib/publishing/breadmoji/constants';
	import { SITE_URL } from '$lib/publishing/model';
	import Viewer from '$lib/publishing/breadmoji/Viewer.svelte';

	let { data }: { data: PageData } = $props();
	const description = 'Fiction and satire from Breadmoji writes, the community-edited Breadmoji feed.';
	// A post that belongs to a series is canonical at its issue address.
	const canonical = $derived(data.post.anthology
		? `${SITE_URL}/breadmoji-writes/${data.post.anthology.designator}/${data.post.anthology.issue}`
		: `${SITE_URL}/breadmoji-writes/${data.post.id}`);
</script>

<svelte:head>
	<title>{data.post.title} · Breadmoji writes · BreadTM</title>
	<meta name="description" content={description}/>
	<meta property="og:title" content={data.post.title}/>
	<meta property="og:description" content={description}/>
	<meta property="og:type" content="article"/>
	<link rel="canonical" href={canonical}/>
	<link rel="alternate" type="application/rss+xml" title="Breadmoji writes" href={RSS_URL}/>
</svelte:head>

<Viewer {data}/>
