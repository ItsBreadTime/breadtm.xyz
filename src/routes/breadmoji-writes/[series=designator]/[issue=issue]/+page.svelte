<script lang="ts">
	import type { PageData } from './$types';
	import { SITE_URL } from '$lib/publishing/model';
	import Viewer from '$lib/publishing/breadmoji/Viewer.svelte';

	let { data }: { data: PageData } = $props();
	const description = $derived(data.series.description ?? `${data.series.name}, a series from Breadmoji writes.`);
</script>

<svelte:head>
	<title>{data.post.title} · {data.series.name} · BreadTM</title>
	<meta name="description" content={description}/>
	<meta property="og:title" content={data.post.title}/>
	<meta property="og:description" content={description}/>
	<meta property="og:type" content="article"/>
	<link rel="canonical" href={`${SITE_URL}/breadmoji-writes/${data.series.designator}/${data.post.id}`}/>
</svelte:head>

<Viewer {data}/>
