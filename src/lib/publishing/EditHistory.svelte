<script lang="ts">
	import { dateLabel } from './model';
	import Icon from './Icon.svelte';
	let { edits }: { edits: string[] } = $props();
	let disclosure = $state<HTMLDetailsElement>(null!);
	let pinned = false;
	function close() { if (disclosure) disclosure.open = false; pinned = false; }
	function focusOut(event: FocusEvent) { if (!disclosure?.contains(event.relatedTarget as Node)) close(); }
</script>
<svelte:window onkeydown={(event) => { if (event.key === 'Escape') close(); }} onclick={(event) => { if (disclosure && !disclosure.contains(event.target as Node)) close(); }} />
{#if edits.length}
	<details class="edit-history" bind:this={disclosure} onmouseenter={() => { if (matchMedia('(hover: hover)').matches) disclosure.open = true; }} onmouseleave={() => { if (!pinned && !disclosure.contains(document.activeElement)) close(); }} onfocusin={() => disclosure.open = true} onfocusout={focusOut}>
		<summary onclick={(event) => { event.preventDefault(); pinned = !pinned; disclosure.open = pinned; }}>{edits.length} {edits.length === 1 ? 'edit' : 'edits'} <Icon name="chevron" size={15}/></summary>
		<div class="edit-dates"><strong>Edit history</strong><ol>{#each edits as date}<li><time datetime={date}>{dateLabel(date, { hour: '2-digit', minute: '2-digit' })} UTC</time></li>{/each}</ol></div>
	</details>
{/if}
