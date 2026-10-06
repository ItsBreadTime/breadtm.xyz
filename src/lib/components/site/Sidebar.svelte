<script lang="ts">
	import type { Snippet } from 'svelte';

	let {
		label,
		head,
		children,
		class: className = ''
	}: {
		label: string;
		/** Pinned at the top of the panel: switches and controls that should never scroll away. */
		head?: Snippet;
		/** The list. It scrolls inside the panel once the panel reaches the viewport's height. */
		children: Snippet;
		class?: string;
	} = $props();
</script>

<!--
	A sticky side panel that travels with the page. The section draws it through custom
	properties on any ancestor:
	  --sidebar-top     sticky offset (default: below the site nav)
	  --sidebar-bg, --sidebar-border, --sidebar-shadow, --sidebar-scrollbar
	A child that manages its own scrolling (a long, paged list) can take `flex: 1; min-height: 0`
	inside the body instead of letting the body scroll.
-->
<aside class="sidebar {className}" aria-label={label}>
	{#if head}<div class="sidebar-head">{@render head()}</div>{/if}
	<div class="sidebar-body" data-sidebar-scroll>{@render children()}</div>
</aside>

<style>
	.sidebar {
		--_top: var(--sidebar-top, calc(var(--nav-h, 72px) + 16px));
		position: sticky; top: var(--_top);
		display: flex; flex-direction: column; min-width: 0;
		max-height: calc(100dvh - var(--_top) - 16px);
		border: var(--sidebar-border, var(--site-bw-md, 3px) solid var(--site-outline, #050308));
		background: var(--sidebar-bg, #fff);
		box-shadow: var(--sidebar-shadow, var(--site-shadow-md));
	}
	.sidebar-head { flex: none; }
	.sidebar-body {
		flex: 1 1 auto; min-height: 0; display: flex; flex-direction: column;
		overflow: auto; overscroll-behavior: contain;
		scrollbar-width: thin; scrollbar-color: var(--sidebar-scrollbar, currentColor) transparent;
	}
	/* A short window cannot hold a pinned panel and still leave room to read beside it. */
	@media (max-height: 600px), (max-width: 760px) {
		.sidebar { position: static; max-height: none; }
		.sidebar-body { overflow: visible; }
	}
</style>
