<script lang="ts">
	import { page } from '$app/state';
	import CopyButton from './CopyButton.svelte';
	let { id, number, title, appendix, level }: { id: string; number: string | null; title: string; appendix: boolean; level: 2 | 3 } = $props();
	const label = $derived(number ? (appendix && level === 2 ? `Appendix ${number}` : number) : null);
	const link = () => { const url = new URL(page.url); url.hash = id; return url.href; };
</script>
<svelte:element this={`h${level}`} {id} class="gov-heading">
	{#if label}<span class="gov-number">{label}</span>{/if}
	<span class="gov-title">{title}</span>
	<a class="gov-anchor" href={`#${id}`} aria-label={`Link to ${label ? `${label} ` : ''}${title}`}>#</a>
	<CopyButton text={link} label={`Copy link to ${label ? `${label} ` : ''}${title}`}/>
</svelte:element>
