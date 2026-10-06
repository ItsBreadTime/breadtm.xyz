<script lang="ts">
	import { onMount } from 'svelte';
	import Nav from '$lib/components/site/Nav.svelte';
	import { smoothHashLinks } from '$lib/publishing/smoothScroll';
	import '$lib/publishing/blog.css';
	import '$lib/publishing/breadmoji/writes.css';
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
<div class="blog-scene writes-scene" {@attach smoothHashLinks} data-theme="light" data-sveltekit-preload-data="off" data-sveltekit-preload-code="off" bind:this={scene}>
	<div class="site-navigation"><Nav accent="#ffd23f"/></div>
	{@render children()}
</div>
