<script lang="ts">
	import Nav from '$lib/components/site/Nav.svelte';
	import '$lib/publishing/blog.css';
	let { children } = $props();
</script>

<div class="blog-scene stats-scene" data-theme="light" data-sveltekit-preload-data="off" data-sveltekit-preload-code="off">
	<div class="site-navigation"><Nav accent="#2ecc8f" /></div>
	{@render children()}
</div>

<style>
	/* Journal ledger tokens via blog.css; stats swaps the violet link/focus
	   accent for a print-safe ledger green. */
	.stats-scene {
		--accent: #1f7a53;
	}
</style>
