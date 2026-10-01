<script lang="ts">
	import { onMount } from 'svelte';
	import Nav from '$lib/components/site/Nav.svelte';
	import '$lib/publishing/blog.css';
	let { children } = $props();
	let scene = $state<HTMLElement>();
	// The shared navbar sizes itself by content; sticky page chrome needs its real height.
	onMount(() => {
		const host = scene;
		const nav = host?.querySelector('.site-navigation');
		if (!host || !nav) return;
		const update = () => host.style.setProperty('--nav-h', `${nav.getBoundingClientRect().height}px`);
		const observer = new ResizeObserver(update);
		observer.observe(nav);
		update();
		return () => observer.disconnect();
	});
</script>
<svelte:head><link rel="alternate" type="application/rss+xml" title="Bread's blog" href="/blogs/rss.xml"/></svelte:head>
<div class="blog-scene" data-sveltekit-preload-data="off" data-sveltekit-preload-code="off" bind:this={scene}>
	<div class="site-navigation"><Nav accent="#c9b8ff"/></div>
	{@render children()}
</div>
