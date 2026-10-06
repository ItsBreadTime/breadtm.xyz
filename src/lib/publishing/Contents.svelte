<script lang="ts">
	import { onMount } from 'svelte';
	import type { Heading } from './types';
	import Icon from './Icon.svelte';
	let { headings }: { headings: Heading[] } = $props();
	let active = $state('');
	let panel = $state<HTMLElement>();
	// As the page scrolls, the current entry stays visible inside whichever box scrolls the list
	// (a shared Sidebar, or this rail on its own). The page itself never moves.
	$effect(() => {
		const link = active && panel?.querySelector<HTMLElement>(`a[href="#${CSS.escape(active)}"]`);
		const box = panel?.closest<HTMLElement>('[data-sidebar-scroll]') ?? panel;
		if (!link || !box || box.scrollHeight <= box.clientHeight) return;
		const margin = 48;
		const top = link.getBoundingClientRect().top - box.getBoundingClientRect().top;
		if (top < margin) box.scrollBy({ top: top - margin });
		else if (top + link.offsetHeight > box.clientHeight - margin) box.scrollBy({ top: top + link.offsetHeight - box.clientHeight + margin });
	});
	onMount(() => {
		active = headings[0]?.id ?? '';
		const observer = new IntersectionObserver(entries => {
			for (const entry of entries) if (entry.isIntersecting) active = entry.target.id;
		}, { rootMargin: '-80px 0px -65% 0px' });
		for (const heading of headings) { const element = document.getElementById(heading.id); if (element) observer.observe(element); }
		return () => observer.disconnect();
	});
</script>
{#snippet links()}
	<ol>{#each headings as heading}<li class:subheading={heading.depth > 2}><a href={'#' + heading.id} aria-current={active === heading.id ? 'location' : undefined}>{heading.text}</a></li>{/each}</ol>
{/snippet}
{#if headings.length}
	<nav class="article-contents" aria-label="On this page" bind:this={panel}><p>On this page</p>{@render links()}</nav>
	<details class="mobile-contents"><summary>On this page <Icon name="chevron" size={18}/></summary><nav aria-label="Article sections">{@render links()}</nav></details>
{/if}
